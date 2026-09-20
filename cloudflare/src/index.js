const ENTITY_CONFIG = {
  subjects: {
    table: 'subjects',
    fields: ['name','code','sort_order','visible']
  },
  resources: {
    table: 'resources',
    fields: ['slug','title','subject_id','resource_type','description','status','visible','pinned','release_version','published_at','sort_order']
  },
  versions: {
    table: 'resource_versions',
    fields: ['resource_id','name','release_version','published_at','format','note','meta_json','current','visible','sort_order']
  },
  links: {
    table: 'resource_links',
    fields: ['version_id','label','kind','url','access_code','note','visible','sort_order']
  },
  errata: {
    table: 'errata',
    fields: ['resource_id','version_id','title','body','status','visible']
  },
  experiences: {
    table: 'experiences',
    fields: ['title','source_url','school','major','year','stage','author','body','status','visible','published_at']
  },
  announcements: {
    table: 'announcements',
    fields: ['title','kind','body','status','visible','pinned','dismissible','audience','publish_at','expires_at','cta_text','cta_url']
  },
  admins: {
    table: 'admin_profiles',
    key: 'email',
    fields: ['display_name','role','status']
  }
};

const BOOL_FIELDS = new Set(['visible','pinned','current','dismissible']);
const INT_FIELDS = new Set(['sort_order']);

export default {
  async fetch(request, env) {
    try {
      return await handleRequest(request, env);
    } catch (error) {
      console.error(error);
      return json({ ok: false, error: 'internal_error' }, 500, request, env);
    }
  }
};

async function handleRequest(request, env) {
  const url = new URL(request.url);
  if (request.method === 'OPTIONS') return corsPreflight(request, env);
  if (request.method === 'GET' && (url.pathname === '/' || url.pathname === '/health')) return json({ ok: true, service: 'zuotiben-api', status: 'ready', d1: Boolean(env.DB), storage: 'external-links', auth: 'd1-session', endpoints: ['/health','/public/bootstrap','/auth/setup/status'] }, 200, request, env, {'Cache-Control':'no-store'});
  if (request.method === 'GET' && url.pathname === '/public/bootstrap') return json(await getPublicBootstrap(env), 200, request, env, publicCacheHeaders(env));
  if (url.pathname.startsWith('/auth/')) return handleAuth(request, env, url);
  if (url.pathname.startsWith('/admin/')) {
    const identity = await requireSession(request, env);
    if (identity instanceof Response) return identity;
    return handleAdmin(request, env, url, identity);
  }
  return json({ ok: false, error: 'not_found' }, 404, request, env);
}

async function getPublicBootstrap(env) {
  const now = new Date().toISOString();
  const [subjectsQ, resourcesQ, versionsQ, linksQ, errataQ, experiencesQ, announcementsQ, settingsQ] = await Promise.all([
    env.DB.prepare("SELECT id,name,code,sort_order FROM subjects WHERE visible=1 ORDER BY sort_order,name").all(),
    env.DB.prepare("SELECT r.id,r.slug,r.title,r.resource_type,r.description,r.release_version,r.published_at,r.updated_at,r.pinned,r.sort_order,s.name AS subject_name,s.code AS subject_code FROM resources r LEFT JOIN subjects s ON s.id=r.subject_id WHERE r.visible=1 AND r.status='published' AND (r.subject_id IS NULL OR s.visible=1) ORDER BY r.pinned DESC,r.sort_order,r.updated_at DESC").all(),
    env.DB.prepare("SELECT id,resource_id,name,release_version,published_at,format,note,meta_json,current,sort_order FROM resource_versions WHERE visible=1 ORDER BY sort_order,name").all(),
    env.DB.prepare("SELECT id,version_id,label,kind,url,access_code,note,sort_order FROM resource_links WHERE visible=1 ORDER BY sort_order,label").all(),
    env.DB.prepare("SELECT id,resource_id,version_id,title,body,status,updated_at FROM errata WHERE visible=1 AND status IN ('fixed','已修正') ORDER BY updated_at DESC").all(),
    env.DB.prepare("SELECT id,title,source_url,school,major,year,stage,author,body,published_at,updated_at FROM experiences WHERE visible=1 AND status='published' ORDER BY published_at DESC,updated_at DESC").all(),
    env.DB.prepare("SELECT id,title,kind,body,pinned,dismissible,publish_at,expires_at,cta_text,cta_url,updated_at FROM announcements WHERE visible=1 AND status IN ('published','scheduled') AND audience='所有访客' AND (publish_at IS NULL OR publish_at='' OR publish_at<=?) AND (expires_at IS NULL OR expires_at='' OR expires_at>?) ORDER BY pinned DESC,publish_at DESC,updated_at DESC").bind(now, now).all(),
    env.DB.prepare("SELECT key,value_json,updated_at FROM site_settings WHERE key LIKE 'public.%' ORDER BY key").all()
  ]);
  const linksByVersion = groupBy(linksQ.results, 'version_id');
  const errataByVersion = groupBy(errataQ.results.filter(x => x.version_id), 'version_id');
  const errataByResource = groupBy(errataQ.results.filter(x => !x.version_id), 'resource_id');
  const versionsByResource = groupBy(versionsQ.results, 'resource_id');
  const resources = resourcesQ.results.map(resource => ({
    ...resource,
    subject: resource.subject_name ? resource.subject_name + (resource.subject_code ? '（' + resource.subject_code + '）' : '') : '',
    versions: (versionsByResource[resource.id] || []).map(version => ({...version,meta:safeJson(version.meta_json,[]),links:linksByVersion[version.id]||[],errata:errataByVersion[version.id]||[]})),
    errata: errataByResource[resource.id] || []
  }));
  const settings = Object.fromEntries(settingsQ.results.map(row => [row.key, safeJson(row.value_json, row.value_json)]));
  return {ok:true,generated_at:now,subjects:subjectsQ.results,resources,experiences:experiencesQ.results,announcements:announcementsQ.results,settings};
}

async function handleAdmin(request, env, url, identity) {
  if (request.method==='GET' && url.pathname==='/admin/me') {
    return json({ok:true,identity,profile:{email:identity.email,display_name:identity.display_name,role:identity.role,status:identity.status}},200,request,env);
  }
  if (request.method==='GET' && url.pathname==='/admin/bootstrap') {
    const denied=requireRole(identity,'reviewer',request,env); if(denied)return denied;
    return json(await getAdminBootstrap(env,identity),200,request,env);
  }
  if (url.pathname.startsWith('/admin/accounts')) return handleAdminAccounts(request,env,url,identity);
  if (url.pathname.startsWith('/admin/files')) return handleAdminFiles(request,env,url,identity);
  if (url.pathname==='/admin/studio-sync') {
    const denied=requireRole(identity,'editor',request,env); if(denied)return denied;
    return handleStudioSync(request,env,identity);
  }
  if (url.pathname.startsWith('/admin/settings')) {
    const needed=request.method==='GET'?'reviewer':'admin';
    const denied=requireRole(identity,needed,request,env); if(denied)return denied;
    return handleAdminSettings(request,env,url,identity);
  }
  const parts=url.pathname.split('/').filter(Boolean), entity=parts[1], id=parts[2]?decodeURIComponent(parts[2]):null, config=ENTITY_CONFIG[entity];
  if (!config) return json({ok:false,error:'unknown_entity'},404,request,env);
  const needed=request.method==='GET'?'reviewer':(entity==='admins'?'admin':'editor');
  const denied=requireRole(identity,needed,request,env); if(denied)return denied;
  if (entity==='admins') return json({ok:false,error:'use_accounts_endpoint'},409,request,env);
  if (request.method==='GET') {
    const rows=await env.DB.prepare('SELECT * FROM '+config.table+' ORDER BY updated_at DESC').all();
    return json({ok:true,items:rows.results},200,request,env);
  }
  if (request.method==='POST') {
    const body=await readJson(request), created=await createEntity(env,config,body);
    await audit(env,identity.email,'create',entity,created.id||created.email,created);
    return json({ok:true,item:created},201,request,env);
  }
  if (request.method==='PUT' && id) {
    const body=await readJson(request), updated=await updateEntity(env,config,id,body);
    if (!updated) return json({ok:false,error:'not_found'},404,request,env);
    await audit(env,identity.email,'update',entity,id,body);
    return json({ok:true,item:updated},200,request,env);
  }
  if (request.method==='DELETE' && id) {
    const key=config.key||'id';
    await env.DB.prepare('DELETE FROM '+config.table+' WHERE '+key+'=?').bind(id).run();
    await audit(env,identity.email,'delete',entity,id,{});
    return json({ok:true},200,request,env);
  }
  return json({ok:false,error:'method_not_allowed'},405,request,env);
}

async function getAdminBootstrap(env, identity) {
  const tables=['subjects','resources','resource_versions','resource_links','errata','experiences','announcements','files','site_settings','admin_profiles','audit_logs'];
  const data={ok:true,identity};
  for(const table of tables){
    const order=table==='audit_logs'?'created_at DESC':(table==='site_settings'?'key':(table==='files'?'updated_at DESC, created_at DESC':'updated_at DESC'));
    data[table]=(await env.DB.prepare('SELECT * FROM '+table+' ORDER BY '+order+' LIMIT 1000').all()).results;
  }
  data.studio_revision=await getStudioRevision(env);
  return data;
}

async function handleStudioSync(request, env, identity) {
  if (request.method !== 'PUT') return json({ok:false,error:'method_not_allowed'},405,request,env);
  const body = await readJson(request);
  const requestedRevision=Number.isFinite(Number(body.base_revision))?Number(body.base_revision):null;
  const revisionClaim=await claimStudioRevision(env,requestedRevision);
  if(!revisionClaim.ok)return json({ok:false,error:'sync_conflict',current_revision:revisionClaim.current},409,request,env);
  const subjects = Array.isArray(body.subjects) ? body.subjects : [];
  const resources = Array.isArray(body.resources) ? body.resources : [];
  const versions = Array.isArray(body.versions) ? body.versions : [];
  const links = Array.isArray(body.links) ? body.links : [];
  const errata = Array.isArray(body.errata) ? body.errata : [];
  const experiences = Array.isArray(body.experiences) ? body.experiences : [];
  const announcements = Array.isArray(body.announcements) ? body.announcements : [];
  const statements = [
    env.DB.prepare("DELETE FROM resource_links"),
    env.DB.prepare("DELETE FROM resource_versions"),
    env.DB.prepare("DELETE FROM errata"),
    env.DB.prepare("DELETE FROM resources"),
    env.DB.prepare("DELETE FROM subjects"),
    env.DB.prepare("DELETE FROM experiences"),
    env.DB.prepare("DELETE FROM announcements")
  ];

  for (const x of subjects) statements.push(
    env.DB.prepare("INSERT INTO subjects (id,name,code,sort_order,visible,updated_at) VALUES (?,?,?,?,?,CURRENT_TIMESTAMP)")
      .bind(x.id,x.name||'',x.code||'',Number(x.sort_order)||100,x.visible?1:0)
  );
  for (const x of resources) statements.push(
    env.DB.prepare("INSERT INTO resources (id,slug,title,subject_id,resource_type,description,status,visible,pinned,release_version,published_at,updated_at,sort_order) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)")
      .bind(x.id,x.slug||x.id,x.title||'',x.subject_id||null,x.resource_type||'其他',x.description||'',x.status||'draft',x.visible?1:0,x.pinned?1:0,x.release_version||'v1.0',x.published_at||null,x.updated_at||new Date().toISOString(),Number(x.sort_order)||100)
  );
  for (const x of versions) statements.push(
    env.DB.prepare("INSERT INTO resource_versions (id,resource_id,name,release_version,published_at,format,note,meta_json,current,visible,sort_order,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)")
      .bind(x.id,x.resource_id,x.name||'未命名版本',x.release_version||'v1.0',x.published_at||null,x.format||'PDF',x.note||'',JSON.stringify(Array.isArray(x.meta)?x.meta:[]),x.current?1:0,x.visible===false?0:1,Number(x.sort_order)||100)
  );
  for (const x of links) statements.push(
    env.DB.prepare("INSERT INTO resource_links (id,version_id,label,kind,url,access_code,note,visible,sort_order,updated_at) VALUES (?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)")
      .bind(x.id,x.version_id,x.label||'链接',x.kind||'link',x.url||'',x.access_code||'',x.note||'',x.visible===false?0:1,Number(x.sort_order)||100)
  );
  for (const x of errata) statements.push(
    env.DB.prepare("INSERT INTO errata (id,resource_id,version_id,title,body,status,visible,updated_at) VALUES (?,?,?,?,?,?,?,CURRENT_TIMESTAMP)")
      .bind(x.id,x.resource_id,x.version_id||null,x.title||'未命名勘误',x.body||'',x.status||'recorded',x.visible===false?0:1)
  );
  for (const x of experiences) statements.push(
    env.DB.prepare("INSERT INTO experiences (id,title,source_url,school,major,year,stage,author,body,status,visible,published_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)")
      .bind(x.id,x.title||'',x.source_url||'',x.school||'',x.major||'',x.year||'',x.stage||'',x.author||'',x.body||'',x.status||'published',x.visible===false?0:1,x.published_at||null)
  );
  for (const x of announcements) statements.push(
    env.DB.prepare("INSERT INTO announcements (id,title,kind,body,status,visible,pinned,dismissible,audience,publish_at,expires_at,cta_text,cta_url,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)")
      .bind(x.id,x.title||'',x.kind||'更新通知',x.body||'',x.status||'draft',x.visible===false?0:1,x.pinned?1:0,x.dismissible===false?0:1,x.audience||'所有访客',x.publish_at||null,x.expires_at||null,x.cta_text||'',x.cta_url||'')
  );

  if (statements.length) await env.DB.batch(statements);
  if (body.copy && typeof body.copy === 'object') {
    await env.DB.prepare("INSERT INTO site_settings (key,value_json,updated_at) VALUES ('public.copy',?,CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json,updated_at=CURRENT_TIMESTAMP")
      .bind(JSON.stringify(body.copy)).run();
  }
  await audit(env,identity.email,'sync','studio','snapshot',{revision:revisionClaim.next,subjects:subjects.length,resources:resources.length,versions:versions.length,links:links.length,errata:errata.length,experiences:experiences.length,announcements:announcements.length});
  return json({ok:true,studio_revision:revisionClaim.next,counts:{subjects:subjects.length,resources:resources.length,versions:versions.length,links:links.length,errata:errata.length,experiences:experiences.length,announcements:announcements.length}},200,request,env);
}


async function handleAdminFiles(request,env,url,identity){
  const needed=request.method==='GET'?'reviewer':'editor';
  const denied=requireRole(identity,needed,request,env); if(denied)return denied;
  const parts=url.pathname.split('/').filter(Boolean);
  const id=parts[2]?decodeURIComponent(parts[2]):null;

  if(request.method==='GET'){
    if(id){
      const item=await env.DB.prepare("SELECT * FROM files WHERE id=?").bind(id).first();
      return item?json({ok:true,item},200,request,env):json({ok:false,error:'not_found'},404,request,env);
    }
    const rows=await env.DB.prepare("SELECT * FROM files ORDER BY updated_at DESC,created_at DESC LIMIT 1000").all();
    return json({ok:true,items:rows.results},200,request,env);
  }

  if(request.method==='POST'){
    const body=await readJson(request);
    const fileId=String(body.id||crypto.randomUUID());
    const objectKey=String(body.object_key||('external-'+fileId)).slice(0,500);
    const name=String(body.name||'未命名文件').slice(0,300);
    const mimeType=String(body.mime_type||'application/octet-stream').slice(0,160);
    const sizeBytes=Math.max(0,Math.floor(Number(body.size_bytes)||0));
    const externalUrl=String(body.external_url||'').trim().slice(0,4000);
    const usageNote=String(body.usage_note||'').trim().slice(0,1000);
    const isPublic=body.is_public===false?0:1;
    const resourceId=body.resource_id||null;
    const versionId=body.version_id||null;
    await env.DB.prepare("INSERT INTO files (id,object_key,name,mime_type,size_bytes,is_public,resource_id,version_id,external_url,usage_note,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)")
      .bind(fileId,objectKey,name,mimeType,sizeBytes,isPublic,resourceId,versionId,externalUrl,usageNote).run();
    const item=await env.DB.prepare("SELECT * FROM files WHERE id=?").bind(fileId).first();
    await audit(env,identity.email,'create','files',fileId,{name,external_url:externalUrl,resource_id:resourceId,version_id:versionId});
    return json({ok:true,item},201,request,env);
  }

  if(request.method==='PUT'&&id){
    const existing=await env.DB.prepare("SELECT * FROM files WHERE id=?").bind(id).first();
    if(!existing)return json({ok:false,error:'not_found'},404,request,env);
    const body=await readJson(request);
    const objectKey=('object_key' in body)?String(body.object_key||('external-'+id)).slice(0,500):existing.object_key;
    const name=('name' in body)?String(body.name||'未命名文件').slice(0,300):existing.name;
    const mimeType=('mime_type' in body)?String(body.mime_type||'application/octet-stream').slice(0,160):existing.mime_type;
    const sizeBytes=('size_bytes' in body)?Math.max(0,Math.floor(Number(body.size_bytes)||0)):Number(existing.size_bytes||0);
    const externalUrl=('external_url' in body)?String(body.external_url||'').trim().slice(0,4000):(existing.external_url||'');
    const usageNote=('usage_note' in body)?String(body.usage_note||'').trim().slice(0,1000):(existing.usage_note||'');
    const isPublic=('is_public' in body)?(body.is_public===false?0:1):Number(existing.is_public||0);
    const resourceId=('resource_id' in body)?(body.resource_id||null):existing.resource_id;
    const versionId=('version_id' in body)?(body.version_id||null):existing.version_id;
    await env.DB.prepare("UPDATE files SET object_key=?,name=?,mime_type=?,size_bytes=?,is_public=?,resource_id=?,version_id=?,external_url=?,usage_note=?,updated_at=CURRENT_TIMESTAMP WHERE id=?")
      .bind(objectKey,name,mimeType,sizeBytes,isPublic,resourceId,versionId,externalUrl,usageNote,id).run();
    const item=await env.DB.prepare("SELECT * FROM files WHERE id=?").bind(id).first();
    await audit(env,identity.email,'update','files',id,{name,external_url:externalUrl,resource_id:resourceId,version_id:versionId});
    return json({ok:true,item},200,request,env);
  }

  if(request.method==='DELETE'&&id){
    await env.DB.prepare("DELETE FROM files WHERE id=?").bind(id).run();
    await audit(env,identity.email,'delete','files',id,{});
    return json({ok:true},200,request,env);
  }

  return json({ok:false,error:'method_not_allowed'},405,request,env);
}

async function ensureStudioRevision(env){
  await env.DB.prepare("INSERT OR IGNORE INTO site_settings (key,value_json,updated_at) VALUES ('internal.studio_revision','0',CURRENT_TIMESTAMP)").run();
}
async function getStudioRevision(env){
  await ensureStudioRevision(env);
  const row=await env.DB.prepare("SELECT value_json FROM site_settings WHERE key='internal.studio_revision'").first();
  const parsed=safeJson(row?.value_json,0);
  return Number.isFinite(Number(parsed))?Number(parsed):0;
}
async function claimStudioRevision(env,baseRevision){
  await ensureStudioRevision(env);
  const current=await getStudioRevision(env);
  if(baseRevision!==null&&baseRevision!==current)return {ok:false,current};
  const next=current+1;
  const result=await env.DB.prepare("UPDATE site_settings SET value_json=?,updated_at=CURRENT_TIMESTAMP WHERE key='internal.studio_revision' AND value_json=?")
    .bind(JSON.stringify(next),JSON.stringify(current)).run();
  if(Number(result?.meta?.changes||0)!==1)return {ok:false,current:await getStudioRevision(env)};
  return {ok:true,current,next};
}

async function handleAdminSettings(request, env, url, identity) {
  const key=decodeURIComponent(url.pathname.slice('/admin/settings/'.length));
  if (!key) return json({ok:false,error:'missing_key'},400,request,env);
  if (request.method==='GET') {
    const row=await env.DB.prepare("SELECT key,value_json,updated_at FROM site_settings WHERE key=?").bind(key).first();
    return row?json({ok:true,item:{...row,value:safeJson(row.value_json,row.value_json)}},200,request,env):json({ok:false,error:'not_found'},404,request,env);
  }
  if (request.method==='PUT') {
    const body=await readJson(request), valueJson=JSON.stringify(body.value??body);
    await env.DB.prepare("INSERT INTO site_settings (key,value_json,updated_at) VALUES (?,?,CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json,updated_at=CURRENT_TIMESTAMP").bind(key,valueJson).run();
    await audit(env,identity.email,'upsert','settings',key,body);
    return json({ok:true,key,value:body.value??body},200,request,env);
  }
  if (request.method==='DELETE') {await env.DB.prepare("DELETE FROM site_settings WHERE key=?").bind(key).run();await audit(env,identity.email,'delete','settings',key,{});return json({ok:true},200,request,env);}
  return json({ok:false,error:'method_not_allowed'},405,request,env);
}

async function createEntity(env,config,body){const key=config.key||'id',id=key==='email'?String(body.email||'').trim().toLowerCase():(body.id||crypto.randomUUID());if(!id)throw new Error('missing_entity_key');const data=normalizeFields(config.fields,body),fields=[key,...Object.keys(data)],values=[id,...Object.values(data)],placeholders=fields.map(()=>'?').join(',');await env.DB.prepare('INSERT INTO '+config.table+' ('+fields.join(',')+') VALUES ('+placeholders+')').bind(...values).run();return env.DB.prepare('SELECT * FROM '+config.table+' WHERE '+key+'=?').bind(id).first();}
async function updateEntity(env,config,id,body){const key=config.key||'id',data=normalizeFields(config.fields,body),entries=Object.entries(data);if(!entries.length)return env.DB.prepare('SELECT * FROM '+config.table+' WHERE '+key+'=?').bind(id).first();const set=entries.map(([field])=>field+'=?').join(','),values=entries.map(([,value])=>value);await env.DB.prepare('UPDATE '+config.table+' SET '+set+',updated_at=CURRENT_TIMESTAMP WHERE '+key+'=?').bind(...values,id).run();return env.DB.prepare('SELECT * FROM '+config.table+' WHERE '+key+'=?').bind(id).first();}
function normalizeFields(fields,body){const out={};for(const field of fields){if(!(field in body))continue;let value=body[field];if(BOOL_FIELDS.has(field))value=value?1:0;if(INT_FIELDS.has(field))value=Number.isFinite(Number(value))?Number(value):100;if(field==='meta_json'&&typeof value!=='string')value=JSON.stringify(value??[]);out[field]=value??null;}return out;}
async function audit(env,actor,action,entityType,entityId,payload){await env.DB.prepare("INSERT INTO audit_logs (id,actor_email,action,entity_type,entity_id,payload_json) VALUES (?,?,?,?,?,?)").bind(crypto.randomUUID(),actor||'',action,entityType,String(entityId||''),JSON.stringify(payload||{})).run();}

const AUTH_COOKIE='__Host-yanku_session';
const SESSION_SECONDS=60*60*24*7;
// Cloudflare Workers Web Crypto supports at most 100,000 PBKDF2 iterations.
const PASSWORD_ITERATIONS=100000;
const ROLE_RANK={reviewer:1,editor:2,admin:3,owner:4};

async function handleAuth(request, env, url) {
  if (request.method==='GET' && url.pathname==='/auth/setup/status') {
    const row=await env.DB.prepare("SELECT COUNT(*) AS n FROM admin_credentials").first();
    return json({ok:true,needs_setup:Number(row?.n||0)===0,setup_token_configured:Boolean(env.ADMIN_SETUP_TOKEN)},200,request,env,{'Cache-Control':'no-store'});
  }
  if (request.method==='POST' && url.pathname==='/auth/setup') return handleInitialSetup(request,env);
  if (request.method==='POST' && url.pathname==='/auth/login') return handleLogin(request,env);
  if (request.method==='POST' && url.pathname==='/auth/logout') return handleLogout(request,env);
  if (request.method==='GET' && url.pathname==='/auth/me') {
    const identity=await requireSession(request,env);
    if(identity instanceof Response)return identity;
    return json({ok:true,identity},200,request,env,{'Cache-Control':'no-store'});
  }
  if (request.method==='POST' && url.pathname==='/auth/profile') {
    const identity=await requireSession(request,env);
    if(identity instanceof Response)return identity;
    if(!mutationOriginAllowed(request,env))return json({ok:false,error:'origin_not_allowed'},403,request,env);
    const body=await readJson(request),displayName=String(body.display_name||'').trim().slice(0,80);
    if(!displayName)return json({ok:false,error:'invalid_display_name'},400,request,env);
    await env.DB.prepare("UPDATE admin_profiles SET display_name=?,updated_at=CURRENT_TIMESTAMP WHERE email=?").bind(displayName,identity.email).run();
    await audit(env,identity.email,'update_profile','admin',identity.email,{display_name:displayName});
    return json({ok:true,identity:{...identity,display_name:displayName}},200,request,env,{'Cache-Control':'no-store'});
  }
  if (request.method==='POST' && url.pathname==='/auth/change-password') {
    const identity=await requireSession(request,env);
    if(identity instanceof Response)return identity;
    const body=await readJson(request);
    if(!validPassword(body.current_password)||!validPassword(body.new_password))return json({ok:false,error:'invalid_password'},400,request,env);
    const credential=await env.DB.prepare("SELECT password_hash,password_salt,password_iterations FROM admin_credentials WHERE email=?").bind(identity.email).first();
    if(!credential||!(await verifyPassword(body.current_password,credential)))return json({ok:false,error:'invalid_credentials'},401,request,env);
    const next=await makePasswordRecord(body.new_password);
    await env.DB.prepare("UPDATE admin_credentials SET password_hash=?,password_salt=?,password_iterations=?,updated_at=CURRENT_TIMESTAMP WHERE email=?").bind(next.hash,next.salt,next.iterations,identity.email).run();
    await env.DB.prepare("DELETE FROM admin_sessions WHERE email=?").bind(identity.email).run();
    await audit(env,identity.email,'change_password','admin',identity.email,{});
    return json({ok:true},200,request,env,{'Set-Cookie':clearSessionCookie()});
  }
  return json({ok:false,error:'not_found'},404,request,env);
}

async function handleInitialSetup(request,env){
  if(!mutationOriginAllowed(request,env))return json({ok:false,error:'origin_not_allowed'},403,request,env);
  const count=await env.DB.prepare("SELECT COUNT(*) AS n FROM admin_credentials").first();
  if(Number(count?.n||0)>0)return json({ok:false,error:'setup_complete'},409,request,env);
  if(!env.ADMIN_SETUP_TOKEN)return json({ok:false,error:'setup_not_configured'},503,request,env);
  const body=await readJson(request);
  if(!(await safeSecretEqual(String(body.setup_token||''),String(env.ADMIN_SETUP_TOKEN))))return json({ok:false,error:'invalid_setup_token'},403,request,env);
  const email=normalizeEmail(body.email);
  const displayName=String(body.display_name||'主管理员').trim().slice(0,80)||'主管理员';
  if(!validEmail(email))return json({ok:false,error:'invalid_email'},400,request,env);
  if(!validPassword(body.password))return json({ok:false,error:'weak_password',min_length:12},400,request,env);
  const password=await makePasswordRecord(body.password);
  await env.DB.batch([
    env.DB.prepare("INSERT INTO admin_profiles (email,display_name,role,status,created_at,updated_at) VALUES (?,?, 'owner','active',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)").bind(email,displayName),
    env.DB.prepare("INSERT INTO admin_credentials (email,password_hash,password_salt,password_iterations,created_at,updated_at) VALUES (?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)").bind(email,password.hash,password.salt,password.iterations)
  ]);
  await audit(env,email,'initial_setup','admin',email,{role:'owner'});
  const session=await createSession(env,email,request);
  return json({ok:true,identity:{email,display_name:displayName,role:'owner',status:'active'}},201,request,env,{'Set-Cookie':session.cookie,'Cache-Control':'no-store'});
}

async function handleLogin(request,env){
  if(!mutationOriginAllowed(request,env))return json({ok:false,error:'origin_not_allowed'},403,request,env);
  const body=await readJson(request);
  const email=normalizeEmail(body.email), password=String(body.password||'');
  if(!validEmail(email)||!password)return json({ok:false,error:'invalid_credentials'},401,request,env);
  const ipHash=await hashText(request.headers.get('cf-connecting-ip')||'unknown');
  const recent=await env.DB.prepare("SELECT COUNT(*) AS n FROM admin_login_attempts WHERE identifier=? AND ip_hash=? AND success=0 AND created_at>=datetime('now','-15 minutes')").bind(email,ipHash).first();
  if(Number(recent?.n||0)>=10)return json({ok:false,error:'too_many_attempts'},429,request,env,{'Retry-After':'900'});
  const row=await env.DB.prepare("SELECT p.email,p.display_name,p.role,p.status,c.password_hash,c.password_salt,c.password_iterations FROM admin_profiles p JOIN admin_credentials c ON c.email=p.email WHERE p.email=?").bind(email).first();
  const ok=Boolean(row&&row.status==='active'&&await verifyPassword(password,row));
  await env.DB.prepare("INSERT INTO admin_login_attempts (id,identifier,ip_hash,success) VALUES (?,?,?,?)").bind(crypto.randomUUID(),email,ipHash,ok?1:0).run();
  if(!ok)return json({ok:false,error:'invalid_credentials'},401,request,env);
  await env.DB.prepare("DELETE FROM admin_login_attempts WHERE identifier=? AND ip_hash=? AND success=0").bind(email,ipHash).run();
  const session=await createSession(env,email,request);
  await audit(env,email,'login','admin',email,{});
  return json({ok:true,identity:{email:row.email,display_name:row.display_name,role:row.role,status:row.status}},200,request,env,{'Set-Cookie':session.cookie,'Cache-Control':'no-store'});
}

async function handleLogout(request,env){
  if(!mutationOriginAllowed(request,env))return json({ok:false,error:'origin_not_allowed'},403,request,env);
  const token=getCookie(request,AUTH_COOKIE);
  if(token){
    const tokenHash=await hashText(token);
    const row=await env.DB.prepare("SELECT email FROM admin_sessions WHERE token_hash=?").bind(tokenHash).first();
    await env.DB.prepare("DELETE FROM admin_sessions WHERE token_hash=?").bind(tokenHash).run();
    if(row?.email)await audit(env,row.email,'logout','admin',row.email,{});
  }
  return json({ok:true},200,request,env,{'Set-Cookie':clearSessionCookie(),'Cache-Control':'no-store'});
}

async function requireSession(request,env){
  const token=getCookie(request,AUTH_COOKIE);
  if(!token)return json({ok:false,error:'auth_required'},401,request,env,{'Cache-Control':'no-store'});
  const tokenHash=await hashText(token);
  const row=await env.DB.prepare("SELECT s.id,s.email,s.expires_at,p.display_name,p.role,p.status FROM admin_sessions s JOIN admin_profiles p ON p.email=s.email WHERE s.token_hash=? AND s.expires_at>CURRENT_TIMESTAMP LIMIT 1").bind(tokenHash).first();
  if(!row||row.status!=='active')return json({ok:false,error:'invalid_session'},401,request,env,{'Set-Cookie':clearSessionCookie(),'Cache-Control':'no-store'});
  env.DB.prepare("UPDATE admin_sessions SET last_seen_at=CURRENT_TIMESTAMP WHERE id=?").bind(row.id).run().catch(()=>{});
  return {email:row.email,display_name:row.display_name,role:row.role,status:row.status,session_id:row.id};
}

async function createSession(env,email,request){
  const raw=base64UrlEncode(crypto.getRandomValues(new Uint8Array(32)));
  const tokenHash=await hashText(raw);
  const id=crypto.randomUUID();
  const expires=new Date(Date.now()+SESSION_SECONDS*1000).toISOString();
  const ipHash=await hashText(request.headers.get('cf-connecting-ip')||'unknown');
  const userAgent=String(request.headers.get('user-agent')||'').slice(0,300);
  await env.DB.prepare("INSERT INTO admin_sessions (id,email,token_hash,user_agent,ip_hash,expires_at) VALUES (?,?,?,?,?,?)").bind(id,email,tokenHash,userAgent,ipHash,expires).run();
  await env.DB.prepare("DELETE FROM admin_sessions WHERE expires_at<=CURRENT_TIMESTAMP").run();
  return {id,cookie:AUTH_COOKIE+'='+raw+'; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age='+SESSION_SECONDS};
}

async function handleAdminAccounts(request,env,url,identity){
  const denied=requireRole(identity,'admin',request,env); if(denied)return denied;
  const parts=url.pathname.split('/').filter(Boolean);
  const target=parts[2]?normalizeEmail(decodeURIComponent(parts[2])):'';
  if(request.method==='GET'&&parts.length===2){
    const rows=await env.DB.prepare("SELECT email,display_name,role,status,created_at,updated_at FROM admin_profiles ORDER BY CASE role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 WHEN 'editor' THEN 2 ELSE 3 END, created_at").all();
    return json({ok:true,items:rows.results},200,request,env);
  }
  if(request.method==='POST'&&parts.length===2){
    const body=await readJson(request),email=normalizeEmail(body.email),role=normalizeRole(body.role);
    if(!validEmail(email)||!validPassword(body.password))return json({ok:false,error:'invalid_account_data',min_password_length:12},400,request,env);
    if(role==='owner'&&identity.role!=='owner')return json({ok:false,error:'forbidden'},403,request,env);
    const rec=await makePasswordRecord(body.password);
    try{
      await env.DB.batch([
        env.DB.prepare("INSERT INTO admin_profiles (email,display_name,role,status) VALUES (?,?,?,?)").bind(email,String(body.display_name||email).trim().slice(0,80),role,body.status==='disabled'?'disabled':'active'),
        env.DB.prepare("INSERT INTO admin_credentials (email,password_hash,password_salt,password_iterations) VALUES (?,?,?,?)").bind(email,rec.hash,rec.salt,rec.iterations)
      ]);
    }catch{return json({ok:false,error:'account_exists'},409,request,env)}
    await audit(env,identity.email,'create','admin',email,{role});
    return json({ok:true,item:{email,display_name:String(body.display_name||email).trim().slice(0,80),role,status:body.status==='disabled'?'disabled':'active'}},201,request,env);
  }
  if(!target)return json({ok:false,error:'missing_email'},400,request,env);
  const existing=await env.DB.prepare("SELECT email,role,status FROM admin_profiles WHERE email=?").bind(target).first();
  if(!existing)return json({ok:false,error:'not_found'},404,request,env);
  if(existing.role==='owner'&&identity.role!=='owner')return json({ok:false,error:'forbidden'},403,request,env);
  if(request.method==='PUT'){
    const body=await readJson(request),role=body.role?normalizeRole(body.role):existing.role;
    if(role==='owner'&&identity.role!=='owner')return json({ok:false,error:'forbidden'},403,request,env);
    await env.DB.prepare("UPDATE admin_profiles SET display_name=?,role=?,status=?,updated_at=CURRENT_TIMESTAMP WHERE email=?").bind(String(body.display_name||target).trim().slice(0,80),role,body.status==='disabled'?'disabled':'active',target).run();
    if(body.password){
      if(!validPassword(body.password))return json({ok:false,error:'weak_password',min_length:12},400,request,env);
      const rec=await makePasswordRecord(body.password);
      await env.DB.prepare("UPDATE admin_credentials SET password_hash=?,password_salt=?,password_iterations=?,updated_at=CURRENT_TIMESTAMP WHERE email=?").bind(rec.hash,rec.salt,rec.iterations,target).run();
      await env.DB.prepare("DELETE FROM admin_sessions WHERE email=?").bind(target).run();
    }
    await audit(env,identity.email,'update','admin',target,{role,status:body.status||existing.status,password_reset:Boolean(body.password)});
    return json({ok:true,item:await env.DB.prepare("SELECT email,display_name,role,status,created_at,updated_at FROM admin_profiles WHERE email=?").bind(target).first()},200,request,env);
  }
  if(request.method==='DELETE'){
    if(target===identity.email)return json({ok:false,error:'cannot_delete_self'},409,request,env);
    if(existing.role==='owner')return json({ok:false,error:'cannot_delete_owner'},409,request,env);
    await env.DB.prepare("DELETE FROM admin_profiles WHERE email=?").bind(target).run();
    await audit(env,identity.email,'delete','admin',target,{});
    return json({ok:true},200,request,env);
  }
  return json({ok:false,error:'method_not_allowed'},405,request,env);
}

function requireRole(identity,minRole,request,env){
  if((ROLE_RANK[identity.role]||0)<(ROLE_RANK[minRole]||999))return json({ok:false,error:'forbidden',required_role:minRole},403,request,env);
  if(request.method!=='GET'&&!mutationOriginAllowed(request,env))return json({ok:false,error:'origin_not_allowed'},403,request,env);
  return null;
}
function normalizeEmail(value){return String(value||'').trim().toLowerCase()}
function normalizeRole(value){return ['owner','admin','editor','reviewer'].includes(value)?value:'reviewer'}
function validEmail(value){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)&&value.length<=254}
function validPassword(value){const s=String(value||'');return s.length>=12&&s.length<=200}
function mutationOriginAllowed(request,env){const origin=request.headers.get('origin')||'';return Boolean(origin&&allowedOrigin(request,env)===origin)}
function getCookie(request,name){const raw=request.headers.get('cookie')||'';for(const part of raw.split(';')){const [k,...rest]=part.trim().split('=');if(k===name)return rest.join('=')}return ''}
function clearSessionCookie(){return AUTH_COOKIE+'=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0'}
async function makePasswordRecord(password){const saltBytes=crypto.getRandomValues(new Uint8Array(16)),salt=base64UrlEncode(saltBytes),hash=await pbkdf2Hash(String(password),saltBytes,PASSWORD_ITERATIONS);return {salt,hash,iterations:PASSWORD_ITERATIONS}}
async function verifyPassword(password,row){try{const salt=base64UrlDecode(row.password_salt),candidate=await pbkdf2Hash(String(password),salt,Number(row.password_iterations)||PASSWORD_ITERATIONS);return timingSafeStringEqual(candidate,row.password_hash)}catch{return false}}
async function pbkdf2Hash(password,salt,iterations){const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);const bits=await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt,iterations},material,256);return base64UrlEncode(new Uint8Array(bits))}
async function hashText(value){const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(String(value)));return base64UrlEncode(new Uint8Array(digest))}
async function safeSecretEqual(a,b){const [aa,bb]=await Promise.all([crypto.subtle.digest('SHA-256',new TextEncoder().encode(a)),crypto.subtle.digest('SHA-256',new TextEncoder().encode(b))]);const av=new Uint8Array(aa),bv=new Uint8Array(bb);if(typeof crypto.subtle.timingSafeEqual==='function')return crypto.subtle.timingSafeEqual(av,bv);let diff=0;for(let i=0;i<av.length;i++)diff|=av[i]^bv[i];return diff===0}
function timingSafeStringEqual(a,b){const av=new TextEncoder().encode(String(a)),bv=new TextEncoder().encode(String(b));if(av.length!==bv.length)return false;if(typeof crypto.subtle.timingSafeEqual==='function')return crypto.subtle.timingSafeEqual(av,bv);let diff=0;for(let i=0;i<av.length;i++)diff|=av[i]^bv[i];return diff===0}
function base64UrlEncode(bytes){let s='';for(const b of bytes)s+=String.fromCharCode(b);return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
function base64UrlDecode(value){const padded=value.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-value.length%4)%4),binary=atob(padded);return Uint8Array.from(binary,c=>c.charCodeAt(0));}

function groupBy(items,key){return items.reduce((acc,item)=>{const value=item[key];(acc[value]||=[]).push(item);return acc;},{});}
function safeJson(value,fallback){try{return JSON.parse(value);}catch{return fallback;}}
async function readJson(request){const contentType=request.headers.get('content-type')||'';if(!contentType.includes('application/json'))throw new Error('expected_json');return request.json();}
function allowedOrigin(request,env){const origin=request.headers.get('origin')||'',allowed=String(env.ALLOWED_ORIGINS||'').split(',').map(x=>x.trim()).filter(Boolean);if(!origin)return allowed[0]||'*';return allowed.includes(origin)?origin:'';}
function corsHeaders(request,env){const origin=allowedOrigin(request,env),headers=new Headers({'Vary':'Origin','Access-Control-Allow-Methods':'GET,POST,PUT,DELETE,OPTIONS','Access-Control-Allow-Headers':'Content-Type','Access-Control-Max-Age':'86400'});if(origin){headers.set('Access-Control-Allow-Origin',origin);headers.set('Access-Control-Allow-Credentials','true');}return headers;}
function corsPreflight(request,env){if(!allowedOrigin(request,env))return new Response(null,{status:403});return new Response(null,{status:204,headers:corsHeaders(request,env)});}
function publicCacheHeaders(env){const seconds=Math.max(0,Number(env.PUBLIC_CACHE_SECONDS||60));return {'Cache-Control':'public, max-age='+seconds+', s-maxage='+seconds};}
function json(data,status,request,env,extraHeaders={}){const headers=corsHeaders(request,env);headers.set('Content-Type','application/json; charset=utf-8');for(const [key,value] of Object.entries(extraHeaders))headers.set(key,value);return new Response(JSON.stringify(data),{status,headers});}

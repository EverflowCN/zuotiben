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
  if (url.pathname === '/health') return json({ ok: true, service: 'zuotiben-api', d1: Boolean(env.DB), storage: 'external-links' }, 200, request, env);
  if (request.method === 'GET' && url.pathname === '/public/bootstrap') return json(await getPublicBootstrap(env), 200, request, env, publicCacheHeaders(env));
  if (url.pathname.startsWith('/admin/')) {
    const identity = await requireAccessIdentity(request, env);
    if (identity instanceof Response) return identity;
    return handleAdmin(request, env, url, identity);
  }
  return json({ ok: false, error: 'not_found' }, 404, request, env);
}

async function getPublicBootstrap(env) {
  const now = new Date().toISOString();
  const [subjectsQ, resourcesQ, versionsQ, linksQ, errataQ, experiencesQ, announcementsQ, settingsQ] = await Promise.all([
    env.DB.prepare("SELECT id,name,code,sort_order FROM subjects WHERE visible=1 ORDER BY sort_order,name").all(),
    env.DB.prepare("SELECT r.id,r.slug,r.title,r.resource_type,r.description,r.release_version,r.published_at,r.updated_at,r.pinned,r.sort_order,s.name AS subject_name,s.code AS subject_code FROM resources r LEFT JOIN subjects s ON s.id=r.subject_id WHERE r.visible=1 AND r.status='published' ORDER BY r.pinned DESC,r.sort_order,r.updated_at DESC").all(),
    env.DB.prepare("SELECT id,resource_id,name,release_version,published_at,format,note,meta_json,current,sort_order FROM resource_versions WHERE visible=1 ORDER BY sort_order,name").all(),
    env.DB.prepare("SELECT id,version_id,label,kind,url,access_code,note,sort_order FROM resource_links WHERE visible=1 ORDER BY sort_order,label").all(),
    env.DB.prepare("SELECT id,resource_id,version_id,title,body,status,updated_at FROM errata WHERE visible=1 ORDER BY updated_at DESC").all(),
    env.DB.prepare("SELECT id,title,source_url,school,major,year,stage,author,body,published_at,updated_at FROM experiences WHERE visible=1 AND status='published' ORDER BY published_at DESC,updated_at DESC").all(),
    env.DB.prepare("SELECT id,title,kind,body,pinned,dismissible,publish_at,expires_at,cta_text,cta_url,updated_at FROM announcements WHERE visible=1 AND status='published' AND audience='所有访客' AND (publish_at IS NULL OR publish_at='' OR publish_at<=?) AND (expires_at IS NULL OR expires_at='' OR expires_at>?) ORDER BY pinned DESC,publish_at DESC,updated_at DESC").bind(now, now).all(),
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
    const profile=await env.DB.prepare("SELECT email,display_name,role,status FROM admin_profiles WHERE email=?").bind(identity.email).first();
    return json({ok:true,identity,profile:profile||{email:identity.email,role:'admin',status:'active'}},200,request,env);
  }
  if (request.method==='GET' && url.pathname==='/admin/bootstrap') return json(await getAdminBootstrap(env,identity),200,request,env);
  if (url.pathname==='/admin/studio-sync') return handleStudioSync(request,env,identity);
  if (url.pathname.startsWith('/admin/settings')) return handleAdminSettings(request,env,url,identity);
  const parts=url.pathname.split('/').filter(Boolean), entity=parts[1], id=parts[2]?decodeURIComponent(parts[2]):null, config=ENTITY_CONFIG[entity];
  if (!config) return json({ok:false,error:'unknown_entity'},404,request,env);
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
  const tables=['subjects','resources','resource_versions','resource_links','errata','experiences','announcements','site_settings','admin_profiles','audit_logs'];
  const data={ok:true,identity};
  for(const table of tables){const order=table==='audit_logs'?'created_at DESC':(table==='site_settings'?'key':'updated_at DESC');data[table]=(await env.DB.prepare('SELECT * FROM '+table+' ORDER BY '+order+' LIMIT 1000').all()).results;}
  return data;
}

async function handleStudioSync(request, env, identity) {
  if (request.method !== 'PUT') return json({ok:false,error:'method_not_allowed'},405,request,env);
  const body = await readJson(request);
  const subjects = Array.isArray(body.subjects) ? body.subjects : [];
  const resources = Array.isArray(body.resources) ? body.resources : [];
  const versions = Array.isArray(body.versions) ? body.versions : [];
  const links = Array.isArray(body.links) ? body.links : [];
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
  await audit(env,identity.email,'sync','studio','snapshot',{subjects:subjects.length,resources:resources.length,versions:versions.length,links:links.length,experiences:experiences.length,announcements:announcements.length});
  return json({ok:true,counts:{subjects:subjects.length,resources:resources.length,versions:versions.length,links:links.length,experiences:experiences.length,announcements:announcements.length}},200,request,env);
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

async function requireAccessIdentity(request, env) {
  if (!env.ACCESS_TEAM_DOMAIN||!env.ACCESS_AUD) return json({ok:false,error:'access_not_configured'},503,request,env);
  const token=request.headers.get('cf-access-jwt-assertion');
  if(!token)return json({ok:false,error:'access_required'},401,request,env);
  const payload=await verifyAccessJwt(token,env.ACCESS_TEAM_DOMAIN,env.ACCESS_AUD);
  if(!payload)return json({ok:false,error:'invalid_access_token'},401,request,env);
  const email=payload.email||request.headers.get('cf-access-authenticated-user-email')||'';
  if(!email)return json({ok:false,error:'missing_identity'},401,request,env);
  return {email,sub:payload.sub||'',aud:payload.aud};
}

async function verifyAccessJwt(token,teamDomain,expectedAud){try{const [headerPart,payloadPart,signaturePart]=token.split('.');if(!headerPart||!payloadPart||!signaturePart)return null;const header=JSON.parse(new TextDecoder().decode(base64UrlDecode(headerPart))),payload=JSON.parse(new TextDecoder().decode(base64UrlDecode(payloadPart))),issuer='https://'+teamDomain+'.cloudflareaccess.com',aud=Array.isArray(payload.aud)?payload.aud:[payload.aud];if(payload.iss!==issuer||!aud.includes(expectedAud)||!payload.exp||payload.exp*1000<=Date.now())return null;const certsResponse=await fetch(issuer+'/cdn-cgi/access/certs',{cf:{cacheTtl:3600,cacheEverything:true}});if(!certsResponse.ok)return null;const certs=await certsResponse.json(),jwk=(certs.keys||[]).find(key=>key.kid===header.kid);if(!jwk)return null;const key=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']),data=new TextEncoder().encode(headerPart+'.'+payloadPart),signature=base64UrlDecode(signaturePart),valid=await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,signature,data);return valid?payload:null;}catch{return null;}}
function base64UrlDecode(value){const padded=value.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-value.length%4)%4),binary=atob(padded);return Uint8Array.from(binary,c=>c.charCodeAt(0));}
function groupBy(items,key){return items.reduce((acc,item)=>{const value=item[key];(acc[value]||=[]).push(item);return acc;},{});}
function safeJson(value,fallback){try{return JSON.parse(value);}catch{return fallback;}}
async function readJson(request){const contentType=request.headers.get('content-type')||'';if(!contentType.includes('application/json'))throw new Error('expected_json');return request.json();}
function allowedOrigin(request,env){const origin=request.headers.get('origin')||'',allowed=String(env.ALLOWED_ORIGINS||'').split(',').map(x=>x.trim()).filter(Boolean);if(!origin)return allowed[0]||'*';return allowed.includes(origin)?origin:'';}
function corsHeaders(request,env){const origin=allowedOrigin(request,env),headers=new Headers({'Vary':'Origin','Access-Control-Allow-Methods':'GET,POST,PUT,DELETE,OPTIONS','Access-Control-Allow-Headers':'Content-Type','Access-Control-Max-Age':'86400'});if(origin){headers.set('Access-Control-Allow-Origin',origin);headers.set('Access-Control-Allow-Credentials','true');}return headers;}
function corsPreflight(request,env){if(!allowedOrigin(request,env))return new Response(null,{status:403});return new Response(null,{status:204,headers:corsHeaders(request,env)});}
function publicCacheHeaders(env){const seconds=Math.max(0,Number(env.PUBLIC_CACHE_SECONDS||60));return {'Cache-Control':'public, max-age='+seconds+', s-maxage='+seconds};}
function json(data,status,request,env,extraHeaders={}){const headers=corsHeaders(request,env);headers.set('Content-Type','application/json; charset=utf-8');for(const [key,value] of Object.entries(extraHeaders))headers.set(key,value);return new Response(JSON.stringify(data),{status,headers});}

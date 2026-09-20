const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const sameId=(a,b)=>String(a)===String(b);
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[char]));
const ICONS={
  x:'<path d="M18 6 6 18M6 6l12 12"/>',menu:'<path d="M4 7h16M4 12h16M4 17h16"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-3.7-3.7"/>',home:'<path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/>',
  box:'<path d="M4 5h16v14H4Z"/><path d="M4 9h16M9 13h6"/>',article:'<path d="M5 3h14v18H5Z"/><path d="M8 8h8M8 12h8M8 16h5"/>',
  errata:'<path d="M4 5h10v14H4Z"/><path d="M7 9h4M7 13h4"/><circle cx="17" cy="16" r="3"/><path d="m19.2 18.2 2 2"/>',
  bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 7h18s-3 0-3-7"/><path d="M10 19a2 2 0 0 0 4 0"/>',
  tag:'<path d="M20 13 13 20 4 11V4h7Z"/><circle cx="8.5" cy="8.5" r="1"/>',folder:'<path d="M3 6h7l2 2h9v11H3Z"/>',
  users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  settings:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1V21H9.6v-.08a1.7 1.7 0 0 0-1.1-1.52 1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.1 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1-.4H2.4V9.6h.08A1.7 1.7 0 0 0 4 8.5a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 8.4 4.1a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1V2.4h4v.08A1.7 1.7 0 0 0 15 4a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 8.4a1.7 1.7 0 0 0 .6 1 1.7 1.7 0 0 0 1 .4h.08v4H21a1.7 1.7 0 0 0-1.6 1.2Z"/>',
  audit:'<path d="M4 4h16v16H4Z"/><path d="M8 9h8M8 13h8M8 17h5"/>',logout:'<path d="M10 17l5-5-5-5"/><path d="M15 12H3"/><path d="M14 4h6v16h-6"/>',
  eye:'<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  account:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  text:'<path d="M4 5h16M9 9h11M9 13h11M9 17h7"/><path d="M4 9h1M4 13h1M4 17h1"/>'
};
function icon(name){return '<svg viewBox="0 0 24 24" aria-hidden="true">'+(ICONS[name]||ICONS.box)+'</svg>'}
$$('[data-icon]').forEach(el=>el.innerHTML=icon(el.dataset.icon));

function safeLocalJson(key,fallback){
  try{
    const raw=localStorage.getItem(key);
    if(raw===null||raw==='')return fallback;
    const parsed=JSON.parse(raw);
    return parsed??fallback;
  }catch{
    try{localStorage.removeItem(key)}catch{}
    return fallback;
  }
}
const storedPinnedResources=safeLocalJson('yanku-pinned-resource-titles',[]);
const storedPinnedAnnouncements=safeLocalJson('yanku-pinned-announcement-titles',[]);
const pinnedResourceTitles=new Set(Array.isArray(storedPinnedResources)?storedPinnedResources:[]);
const pinnedAnnouncementTitles=new Set(Array.isArray(storedPinnedAnnouncements)?storedPinnedAnnouncements:[]);
const storedAnnouncementsRaw=safeLocalJson('yanku-announcements-v2',null);
const storedAnnouncements=Array.isArray(storedAnnouncementsRaw)?storedAnnouncementsRaw:null;

function safeLocalText(key,fallback=''){
  try{
    const value=localStorage.getItem(key);
    return value===null?fallback:value;
  }catch{return fallback}
}

const siteCopyDefaults={
  brandName:'研库',
  mobileBrandSubtitle:'资源导航',
  sidebarColumnsTitle:'栏目',
  sidebarSubjectsTitle:'科目',
  navOverview:'总览',
  navResources:'资料',
  navExperience:'经验贴',
  overviewEyebrow:'OVERVIEW',
  overviewTitle:'总览',
  overviewDesc:'快速查看最近更新、公告、勘误与资源收录情况。',
  overviewSearchPlaceholder:'搜索资源、科目、经验或勘误',
  resourcesEyebrow:'RESOURCE LIBRARY',
  resourcesTitle:'全部资源',
  resourcesDesc:'书籍、讲义、真题、做题本与打印版本统一索引；同一资源可以提供多个版本和多个获取入口。',
  resourcesSearchPlaceholder:'搜索资源、科目、版本或关键词',
  experienceEyebrow:'EXPERIENCE',
  experienceTitle:'经验贴',
  experienceDesc:'围绕院校、专业、初试、复试、择校与备考方法整理可追溯来源的经验内容。',
  experienceSearchPlaceholder:'搜索经验贴、院校或专业',
  allResourcesLabel:'全部资料',
  allSubjectsLabel:'全部科目',
  subjectGroupLabel:'已收录科目',
  noSubjectMatch:'没有匹配的已收录科目',
  filterHint:'支持搜索',
  toolbarSort:'最近更新',
  viewNote:'资源 · 版本 · 渠道',
  freeTitle:'全部资源免费公开',
  freeBody:'本站收录与整理的资源均免费公开，不设置付费门槛。',
  qqTitle:'更多资料在 QQ 群',
  qqBody:'更多资料、更新与交流可加入 QQ 群。',
  qqNumber:'1032998814',
  qqCopyButton:'复制群号',
  qqJoinButton:'加入群',
  qqJoinUrl:'',
  showQQJoinButton:false,
  progressTitle:'功能持续添加中',
  progressBody:'资料、经验贴、勘误与更多实用功能会持续补充与完善。',
  showFreeInfo:true,
  showQQInfo:true,
  showProgressInfo:true,
  recentTitle:'最近更新',
  recentAction:'查看全部',
  maintenanceTitle:'资源维护',
  maintenanceAction:'使用说明',
  maintenanceEntryLabel:'获取入口',
  maintenanceEntryTitle:'网盘 · 直链 · 打印',
  maintenanceEntryBody:'按具体版本分别提供',
  maintenanceErrataLabel:'勘误提交',
  maintenanceErrataTitle:'发现问题可申请提交',
  maintenanceErrataBody:'提交入口开放后可直接在这里反馈',
  metricResourcesLabel:'已收录资料',
  metricResourcesNote:'查看全部资源',
  metricVersionsLabel:'资源版本',
  metricVersionsNote:'标准版 / 打印版等',
  metricExperienceLabel:'经验贴',
  metricExperienceNote:'备考经验整理',
  metricErrataLabel:'公开勘误',
  metricErrataNote:'随对应版本查看',
  resourceEmptyTitle:'暂时没有收录资源',
  resourceEmptyBody:'有内容后才会显示对应科目。',
  experienceSectionTitle:'经验贴',
  experienceSectionBody:'后续可按院校、专业、初试、复试、择校、时间规划等维度整理真实经验内容。',
  experienceEmptyTitle:'暂未收录经验贴',
  experienceEmptyBody:'后续可以从公开经验贴中筛选、整理并注明来源，不会先堆空分类。',
  siteNoteTitle:'说明',
  siteNoteBody:'本站用于整理和索引公开学习资源、经验与勘误。涉及第三方内容时，请遵守相应版权、授权与平台规则。',
  footerLeft:'研库 · 考研学习资源索引与分发',
  footerRight:'zuotiben.top',
  copySuccessText:'QQ群号已复制'
};
function loadSiteCopy(){
  const saved=safeLocalJson('yanku-site-copy-v1',{});
  return {...siteCopyDefaults,...(saved&&typeof saved==='object'&&!Array.isArray(saved)?saved:{})};
}
function saveSiteCopy(){localStorage.setItem('yanku-site-copy-v1',JSON.stringify(state.copy));queueCloudSync()}
const copyGroups=[
  {title:'品牌与导航',desc:'站点品牌、侧栏和栏目名称。',fields:[
    ['brandName','品牌名称'],['mobileBrandSubtitle','移动端副标题'],['sidebarColumnsTitle','侧栏栏目标题'],['sidebarSubjectsTitle','侧栏科目标题'],
    ['navOverview','总览栏目名'],['navResources','资料栏目名'],['navExperience','经验贴栏目名']
  ]},
  {title:'页面标题与搜索',desc:'各页面主标题、说明和搜索框提示。',fields:[
    ['overviewEyebrow','总览英文眉题'],['overviewTitle','总览标题'],['overviewDesc','总览说明','textarea'],['overviewSearchPlaceholder','总览搜索提示'],
    ['resourcesEyebrow','资料英文眉题'],['resourcesTitle','资料默认标题'],['resourcesDesc','资料说明','textarea'],['resourcesSearchPlaceholder','资料搜索提示'],
    ['experienceEyebrow','经验贴英文眉题'],['experienceTitle','经验贴标题'],['experienceDesc','经验贴说明','textarea'],['experienceSearchPlaceholder','经验贴搜索提示']
  ]},
  {title:'筛选与列表',desc:'资源筛选、工具栏与空状态文案。',fields:[
    ['allResourcesLabel','全部资料文字'],['allSubjectsLabel','全部科目文字'],['subjectGroupLabel','科目组标题'],['noSubjectMatch','无科目匹配提示'],
    ['filterHint','筛选提示'],['toolbarSort','排序说明'],['viewNote','列表右侧说明'],['resourceEmptyTitle','资料空状态标题'],['resourceEmptyBody','资料空状态说明','textarea']
  ]},
  {title:'首页信息卡',desc:'免费公开、QQ群和持续更新说明。',fields:[
    ['freeTitle','免费公开标题'],['freeBody','免费公开说明','textarea'],['qqTitle','QQ群标题'],['qqBody','QQ群说明','textarea'],['qqNumber','QQ群号'],['qqCopyButton','复制按钮文字'],
    ['qqJoinButton','加入群按钮文字'],['qqJoinUrl','QQ群加入链接'],
    ['progressTitle','持续更新标题'],['progressBody','持续更新说明','textarea']
  ]},
  {title:'首页统计与维护',desc:'总览统计卡、最近更新和资源维护文案。',fields:[
    ['metricResourcesLabel','资料统计标题'],['metricResourcesNote','资料统计说明'],['metricVersionsLabel','版本统计标题'],['metricVersionsNote','版本统计说明'],
    ['metricExperienceLabel','经验贴统计标题'],['metricExperienceNote','经验贴统计说明'],['metricErrataLabel','勘误统计标题'],['metricErrataNote','勘误统计说明'],
    ['recentTitle','最近更新标题'],['recentAction','最近更新按钮'],['maintenanceTitle','资源维护标题'],['maintenanceAction','资源维护按钮'],
    ['maintenanceEntryLabel','获取入口小标题'],['maintenanceEntryTitle','获取入口标题'],['maintenanceEntryBody','获取入口说明'],
    ['maintenanceErrataLabel','勘误小标题'],['maintenanceErrataTitle','勘误标题'],['maintenanceErrataBody','勘误说明']
  ]},
  {title:'经验贴、说明与页脚',desc:'经验贴空状态、站点说明和页脚。',fields:[
    ['experienceSectionTitle','经验贴区标题'],['experienceSectionBody','经验贴区说明','textarea'],['experienceEmptyTitle','经验贴空状态标题'],['experienceEmptyBody','经验贴空状态说明','textarea'],
    ['siteNoteTitle','站点说明标题'],['siteNoteBody','站点说明正文','textarea'],['footerLeft','页脚左侧'],['footerRight','页脚右侧'],['copySuccessText','复制成功提示']
  ]}
];

const state={
  section:'overview',
  resources:[
    {id:1,key:'408-workbook',title:'408 做题本',subjectName:'计算机学科专业基础',subjectCode:'408',type:'做题本',versions:2,defaultVersions:true,extraVersions:[],customLinks:[],releaseVersion:'v1.0',publishedAt:'2026-09-19',visible:true,pinned:pinnedResourceTitles.has('408 做题本'),status:'整理中',updated:'2026-09-19'},
    {id:2,key:'math2-workbook',title:'数学二做题本',subjectName:'数学二',subjectCode:'302',type:'做题本',versions:2,defaultVersions:true,extraVersions:[],customLinks:[],releaseVersion:'v1.0',publishedAt:'2026-09-19',visible:true,pinned:pinnedResourceTitles.has('数学二做题本'),status:'整理中',updated:'2026-09-19'}
  ],
  experiences:[],
  errata:[],
  announcements:storedAnnouncements||[
    {id:1,title:'资源中心持续整理中',kind:'更新通知',body:'资料会按标准版、平板版、打印专版等分别发布；经验贴与勘误栏目也会逐步补充。',status:'published',visible:true,pinned:pinnedAnnouncementTitles.has('资源中心持续整理中'),dismissible:true,audience:'所有访客',publishAt:'2026-09-19T00:00',expiresAt:'',ctaText:'',ctaUrl:'',updated:'2026-09-19'},
    {id:2,title:'同一资源可能存在多个版本与入口',kind:'使用说明',body:'标准版、平板版、打印专版会分别标注；不同获取入口以对应版本为准。',status:'published',visible:true,pinned:pinnedAnnouncementTitles.has('同一资源可能存在多个版本与入口'),dismissible:false,audience:'所有访客',publishAt:'2026-09-19T00:00',expiresAt:'',ctaText:'',ctaUrl:'',updated:'2026-09-19'}
  ],
  categories:[
    {id:1,name:'计算机学科专业基础',code:'408',visible:true,count:1,order:1},
    {id:2,name:'数学二',code:'302',visible:true,count:1,order:2}
  ],
  files:[],
  admins:[{id:1,name:'主管理员',role:'owner',status:'active',last:'当前会话',locked:true}],
  announcementSelection:new Set(),
  copy:loadSiteCopy(),
  account:{displayName:'主管理员',username:'owner',email:'',role:'Owner',mfa:false,lastLogin:'当前会话'},
  settings:{resources:true,experience:true,siteName:'研库',siteDescription:'考研学习资源索引与分发',errataSubmitUrl:safeLocalText('yanku-errata-submit-url','')}
};
function loadStudioCollections(){
  const value=safeLocalJson('yanku-studio-collections-v1',null);
  return value&&typeof value==='object'&&!Array.isArray(value)?value:null;
}
function saveStudioCollections(){
  const data={
    resources:state.resources,
    experiences:state.experiences,
    errata:state.errata,
    categories:state.categories,
    admins:state.admins
  };
  localStorage.setItem('yanku-studio-collections-v1',JSON.stringify(data));
  queueCloudSync();
}
const persistedCollections=loadStudioCollections();
if(persistedCollections){
  if(Array.isArray(persistedCollections.resources)) state.resources=persistedCollections.resources;
  if(Array.isArray(persistedCollections.experiences)) state.experiences=persistedCollections.experiences;
  if(Array.isArray(persistedCollections.errata)) state.errata=persistedCollections.errata;
  if(Array.isArray(persistedCollections.categories)) state.categories=persistedCollections.categories;
  if(Array.isArray(persistedCollections.admins)){
    const owner=state.admins.find(x=>x.locked);
    state.admins=persistedCollections.admins.filter(x=>!x.locked);
    if(owner) state.admins.unshift(owner);
  }
}

const STUDIO_API_BASE=location.hostname.endsWith('zuotiben.top')?'https://api.zuotiben.top':'https://zuotiben-api.bm9h54b4t9.workers.dev';
const cloudState={status:'checking',message:'正在检测 D1',syncTimer:null,lastError:'',revision:0,syncInFlight:false,syncPending:false};

function cloudStatusLabel(){
  if(cloudState.status==='connected') return 'D1 已连接';
  if(cloudState.status==='syncing') return '正在同步 D1';
  if(cloudState.status==='conflict') return '检测到并发更新';
  if(cloudState.status==='setup') return '等待初始化';
  if(cloudState.status==='auth') return '未登录';
  if(cloudState.status==='error') return '云端暂不可用';
  return '检测云端中';
}
function refreshCloudStatus(){
  const el=document.querySelector('[data-cloud-status]');
  if(el) el.textContent=cloudStatusLabel();
  const top=document.querySelector('.workspace-status');
  if(top){
    top.innerHTML='<i></i>'+cloudStatusLabel();
    top.classList.toggle('cloud-connected',cloudState.status==='connected');
  }
}
async function studioApi(path,options={}){
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),8000);
  const init={credentials:'include',cache:'no-store',signal:controller.signal,...options};
  init.headers={Accept:'application/json',...(options.body?{'Content-Type':'application/json'}:{}),...(options.headers||{})};
  try{
    const response=await fetch(STUDIO_API_BASE+path,init);
    const type=response.headers.get('content-type')||'';
    const data=type.includes('application/json')?await response.json():null;
    if(!response.ok){
      const error=new Error(data?.error||('http_'+response.status));
      error.status=response.status;
      error.code=data?.error||'';
      error.data=data||null;
      throw error;
    }
    return data;
  }catch(error){
    if(error?.name==='AbortError'){const timeoutError=new Error('request_timeout');timeoutError.code='request_timeout';throw timeoutError}
    throw error;
  }finally{clearTimeout(timeout)}
}
function dbId(prefix,value){return prefix+'-'+String(value??crypto.randomUUID()).replace(/[^a-zA-Z0-9_-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,80)}
function resourceDbStatus(value){return value==='已发布'||value==='published'?'published':'draft'}
function toCloudDateTime(value){if(!value)return null;const d=new Date(value);return Number.isNaN(d.getTime())?value:d.toISOString()}
function toLocalDateTime(value){if(!value)return '';const d=new Date(value);if(Number.isNaN(d.getTime()))return String(value).replace('Z','').slice(0,16);const pad=n=>String(n).padStart(2,'0');return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+'T'+pad(d.getHours())+':'+pad(d.getMinutes())}
function buildCloudSnapshot(){
  const subjectIdByKey=new Map();
  const subjects=state.categories.map((x,index)=>{
    const id=String(x.id||'').startsWith('subject-')?String(x.id):dbId('subject',x.code||x.id||index+1);
    subjectIdByKey.set((x.name||'')+'|'+(x.code||''),id);
    return {id,name:x.name||'',code:x.code||'',sort_order:Number(x.order)||100,visible:x.visible!==false};
  });
  const resources=[],versions=[],links=[];
  state.resources.forEach((x,index)=>{
    const rid=String(x.id||'').startsWith('resource-')?String(x.id):dbId('resource',x.key||x.id||index+1);
    const skey=(x.subjectName||'')+'|'+(x.subjectCode||'');
    let subjectId=subjectIdByKey.get(skey)||null;
    if(!subjectId && (x.subjectName||x.subjectCode)){
      subjectId=dbId('subject',x.subjectCode||('auto-'+index));
      subjectIdByKey.set(skey,subjectId);
      subjects.push({id:subjectId,name:x.subjectName||'',code:x.subjectCode||'',sort_order:100+index,visible:true});
    }
    resources.push({
      id:rid,slug:x.key||String(rid).replace(/^resource-/,''),
      title:x.title||'未命名资料',subject_id:subjectId,resource_type:x.type||'其他',
      description:x.description||'',status:resourceDbStatus(x.status),visible:x.visible!==false,pinned:Boolean(x.pinned),
      release_version:x.releaseVersion||'v1.0',published_at:x.publishedAt||null,updated_at:x.updated||new Date().toISOString(),
      sort_order:Number(x.order)||100
    });
    let localVersions=[];
    if(x.defaultVersions){
      localVersions=[
        {id:rid+'-standard',name:'标准版',releaseVersion:x.releaseVersion||'v1.0',publishedAt:x.publishedAt||null,format:'PDF',note:'常规阅读与书写版本。',order:10,current:true,visible:true,meta:['PDF']},
        {id:rid+'-print',name:'打印专版',releaseVersion:x.releaseVersion||'v1.0',publishedAt:x.publishedAt||null,format:'PDF',note:'双面打印优化版本。',order:20,current:true,visible:true,meta:['A4','双面印刷']}
      ];
    }
    if(Array.isArray(x.extraVersions))localVersions.push(...x.extraVersions);
    localVersions.forEach((v,vi)=>{
      const vid=String(v.id||'').startsWith('version-')?String(v.id):dbId('version',(v.id||rid+'-'+vi));
      versions.push({id:vid,resource_id:rid,name:v.name||'未命名版本',release_version:v.releaseVersion||x.releaseVersion||'v1.0',published_at:v.publishedAt||x.publishedAt||null,format:v.format||'PDF',note:v.note||'',meta:Array.isArray(v.meta)?v.meta:[],current:v.current!==false,visible:v.visible!==false,sort_order:Number(v.order)||Number(v.sort_order)||100});
      (v.links||[]).forEach((ln,li)=>links.push({id:String(ln.id||'').startsWith('link-')?String(ln.id):dbId('link',(ln.id||vid+'-'+li)),version_id:vid,label:ln.label||'链接',kind:ln.kind||ln.type||'link',url:ln.url||'',access_code:ln.code||ln.access_code||'',note:ln.note||'',visible:ln.visible!==false,sort_order:Number(ln.order)||Number(ln.sort_order)||100}));
    });
    const fallbackVersion=versions.find(v=>v.resource_id===rid)?.id;
    (x.customLinks||[]).forEach((ln,li)=>{
      if(!fallbackVersion)return;
      links.push({id:String(ln.id||'').startsWith('link-')?String(ln.id):dbId('link',(ln.id||rid+'-custom-'+li)),version_id:ln.versionId||fallbackVersion,label:ln.label||'链接',kind:ln.kind||ln.type||'link',url:ln.url||'',access_code:ln.code||'',note:ln.note||'',visible:ln.visible!==false,sort_order:Number(ln.order)||100});
    });
  });
  const experiences=state.experiences.map((x,index)=>({id:String(x.id||'').startsWith('experience-')?String(x.id):dbId('experience',x.id||index+1),title:x.title||'未命名经验贴',source_url:x.sourceUrl||'',school:x.school||'',major:x.major||'',year:x.year||'',stage:x.stage||'',author:x.author||'',body:x.body||'',status:x.status==='draft'?'draft':'published',visible:x.visible!==false,published_at:x.publishedAt||new Date().toISOString().slice(0,10)}));
  const errata=state.errata.map((x,index)=>({id:String(x.id||'').startsWith('errata-')?String(x.id):dbId('errata',x.id||index+1),resource_id:x.resourceId||x.resource_id||'',version_id:x.versionId||x.version_id||null,title:x.title||'未命名勘误',body:x.body||'',status:x.status||'recorded',visible:x.visible!==false}));
  const announcements=state.announcements.map((x,index)=>({id:String(x.id||'').startsWith('announcement-')?String(x.id):dbId('announcement',x.id||index+1),title:x.title||'未命名公告',kind:x.kind||'更新通知',body:x.body||'',status:x.status||'draft',visible:x.visible!==false,pinned:Boolean(x.pinned),dismissible:x.dismissible!==false,audience:x.audience||'所有访客',publish_at:toCloudDateTime(x.publishAt),expires_at:toCloudDateTime(x.expiresAt),cta_text:x.ctaText||'',cta_url:x.ctaUrl||''}));
  return {subjects,resources,versions,links,errata,experiences,announcements,copy:state.copy};
}
function applyCloudBootstrap(data){
  const subjects=data.subjects||[], versions=data.resource_versions||[], links=data.resource_links||[];
  const subjectById=new Map(subjects.map(x=>[x.id,x]));
  const linksByVersion=new Map();
  links.forEach(x=>{if(!linksByVersion.has(x.version_id))linksByVersion.set(x.version_id,[]);linksByVersion.get(x.version_id).push(x)});
  const versionsByResource=new Map();
  versions.forEach(v=>{if(!versionsByResource.has(v.resource_id))versionsByResource.set(v.resource_id,[]);versionsByResource.get(v.resource_id).push(v)});
  state.categories=subjects.map(x=>({id:x.id,name:x.name,code:x.code||'',visible:Boolean(x.visible),count:0,order:x.sort_order||100}));
  state.resources=(data.resources||[]).map(r=>{
    const subject=subjectById.get(r.subject_id)||{};
    const vs=(versionsByResource.get(r.id)||[]).map(v=>({id:v.id,name:v.name,releaseVersion:v.release_version||r.release_version||'v1.0',publishedAt:v.published_at||r.published_at||'',format:v.format||'PDF',order:v.sort_order||100,note:v.note||'',current:Boolean(v.current),visible:Boolean(v.visible),meta:(()=>{try{return JSON.parse(v.meta_json||'[]')}catch{return []}})(),links:(linksByVersion.get(v.id)||[]).map(ln=>({id:ln.id,versionId:v.id,label:ln.label,type:ln.kind,url:ln.url||'',code:ln.access_code||'',note:ln.note||'',visible:Boolean(ln.visible),order:ln.sort_order||100}))}));
    return {id:r.id,key:r.slug,title:r.title,description:r.description||'',subjectName:subject.name||'',subjectCode:subject.code||'',type:r.resource_type||'其他',versions:vs.length,defaultVersions:false,extraVersions:vs,customLinks:[],releaseVersion:r.release_version||'v1.0',publishedAt:r.published_at||'',visible:Boolean(r.visible),pinned:Boolean(r.pinned),status:r.status==='published'?'已发布':'草稿',updated:(r.updated_at||'').slice(0,10),order:r.sort_order||100};
  });
  state.categories.forEach(c=>c.count=state.resources.filter(r=>r.subjectName===c.name&&r.subjectCode===c.code).length);
  state.experiences=(data.experiences||[]).map(x=>({id:x.id,title:x.title,sourceUrl:x.source_url||'',school:x.school||'',major:x.major||'',year:x.year||'',stage:x.stage||'',author:x.author||'',body:x.body||'',status:x.status,visible:Boolean(x.visible),publishedAt:x.published_at||''}));
  state.errata=(data.errata||[]).map(x=>({id:x.id,resourceId:x.resource_id||'',versionId:x.version_id||'',title:x.title||'',body:x.body||'',status:x.status||'recorded',visible:Boolean(x.visible),updated:(x.updated_at||'').slice(0,10)}));
  state.announcements=(data.announcements||[]).map(x=>({id:x.id,title:x.title,kind:x.kind||'更新通知',body:x.body||'',status:x.status||'draft',visible:Boolean(x.visible),pinned:Boolean(x.pinned),dismissible:Boolean(x.dismissible),audience:x.audience||'所有访客',publishAt:toLocalDateTime(x.publish_at),expiresAt:toLocalDateTime(x.expires_at),ctaText:x.cta_text||'',ctaUrl:x.cta_url||'',updated:(x.updated_at||'').slice(0,10)}));
  if(Array.isArray(data.files))state.files=data.files.map(x=>({id:x.id,name:x.name||'',kind:fileKindFromMime(x.mime_type,x.name),mimeType:x.mime_type||'application/octet-stream',url:x.external_url||'',usage:x.usage_note||'',sizeBytes:Number(x.size_bytes)||0,size:formatFileSize(Number(x.size_bytes)||0),visible:Boolean(x.is_public),resourceId:x.resource_id||'',versionId:x.version_id||'',updated:x.updated_at||x.created_at||''}));
  cloudState.revision=Number.isFinite(Number(data.studio_revision))?Number(data.studio_revision):cloudState.revision;
  const copyRow=(data.site_settings||[]).find(x=>x.key==='public.copy');
  if(copyRow){try{state.copy={...siteCopyDefaults,...JSON.parse(copyRow.value_json||'{}')}}catch{}}
  const settingsRow=(data.site_settings||[]).find(x=>x.key==='public.settings');
  if(settingsRow){try{state.settings={...state.settings,...JSON.parse(settingsRow.value_json||'{}')}}catch{}}
  const profiles=data.admin_profiles||[];
  if(profiles.length)state.admins=profiles.map((x,index)=>({id:x.email||index+1,name:x.display_name||x.email,identifier:x.email,role:x.role||'admin',status:x.status||'active',last:'云端账号',locked:x.role==='owner'}));
  state.audit=data.audit_logs||[];
  localStorage.setItem('yanku-pinned-resource-titles',JSON.stringify(state.resources.filter(x=>x.pinned).map(x=>x.title)));
  localStorage.setItem('yanku-pinned-announcement-titles',JSON.stringify(state.announcements.filter(x=>x.pinned).map(x=>x.title)));
}
function authErrorText(code){
  return ({
    internal_error:'云端创建账号时发生内部错误，请查看 Cloudflare Worker 日志（internal_error）',
    origin_not_allowed:'当前网站地址未获后端允许，请核对 ALLOWED_ORIGINS',
    request_timeout:'云端请求超过 8 秒，请检查网络及 Worker 日志后重试',
    'Failed to fetch':'无法连接云端接口，请检查网络或跨域配置',
    'Load failed':'无法连接云端接口，请检查网络或跨域配置',
    invalid_credentials:'邮箱或密码错误',
    too_many_attempts:'登录尝试过多，请稍后再试',
    invalid_setup_token:'初始化口令错误',
    setup_not_configured:'还没有配置首次初始化口令',
    setup_complete:'主管理员已经初始化',
    weak_password:'密码至少 12 位',
    invalid_email:'邮箱格式不正确',
    auth_required:'请先登录',
    invalid_session:'登录已失效，请重新登录',
    forbidden:'当前账号无权管理其他管理员',
    owner_role_reserved:'主管理员角色为系统保留角色',
    owner_account_protected:'主管理员账号受保护'
  })[code]||'操作失败，请检查后重试';
}
function ensureAuthGate(){
  let gate=document.getElementById('authGate');
  if(!gate){
    gate=document.createElement('section');
    gate.id='authGate';gate.className='auth-gate';
    document.body.appendChild(gate);
  }
  return gate;
}
function hideAuthGate(){
  const gate=ensureAuthGate();gate.hidden=true;document.body.classList.remove('auth-locked');
}
function renderAuthGate(mode,setupStatus={},message=''){
  const gate=ensureAuthGate();
  document.body.classList.add('auth-locked');gate.hidden=false;
  const setup=mode==='setup';
  gate.innerHTML='<div class="auth-card"><div class="auth-brand"><span class="brand-mark">研</span><div><strong>Studio</strong><small>'+(setup?'首次初始化':'管理员登录')+'</small></div></div>'+
    '<h1>'+(setup?'创建主管理员':'进入管理后台')+'</h1>'+
    '<p>'+(setup?'首次初始化只执行一次。账号和密码会存入 Cloudflare D1。':'使用云端管理员账号登录。')+'</p>'+
    (message?'<div class="auth-error">'+message+'</div>':'')+
    '<form id="authForm" class="auth-form">'+
      (setup?'<label><span>初始化口令</span><input id="authSetupToken" type="password" autocomplete="off" required placeholder="Cloudflare 中设置的 ADMIN_SETUP_TOKEN"></label>':'')+
      (setup?'<label><span>显示名称</span><input id="authDisplayName" autocomplete="name" value="主管理员" maxlength="80"></label>':'')+
      '<label><span>管理员邮箱</span><input id="authEmail" type="email" autocomplete="username" required></label>'+
      '<label><span>密码</span><input id="authPassword" type="password" autocomplete="'+(setup?'new-password':'current-password')+'" minlength="12" required></label>'+
      (setup?'<label><span>确认密码</span><input id="authPassword2" type="password" autocomplete="new-password" minlength="12" required></label>':'')+
      '<button class="btn primary auth-submit" type="submit">'+(setup?'创建 Owner':'登录')+'</button>'+
    '</form>'+
    (setup&&!setupStatus.setup_token_configured?'<div class="auth-hint"><strong>还差一步：</strong>先在 Worker 的变量与机密里添加 <code>ADMIN_SETUP_TOKEN</code>，类型选 Secret。</div>':'')+
    '<a class="auth-public-link" href="../">返回公开站点</a></div>';
  $('#authForm').onsubmit=async event=>{
    event.preventDefault();
    const button=gate.querySelector('.auth-submit');button.disabled=true;button.textContent=setup?'正在创建…':'正在登录…';
    try{
      const password=$('#authPassword').value;
      if(setup&&password!==$('#authPassword2').value)throw Object.assign(new Error('password_mismatch'),{code:'password_mismatch'});
      const payload=setup?{
        setup_token:$('#authSetupToken').value,
        display_name:$('#authDisplayName').value.trim(),
        email:$('#authEmail').value.trim(),
        password
      }:{email:$('#authEmail').value.trim(),password};
      await studioApi(setup?'/auth/setup':'/auth/login',{method:'POST',body:JSON.stringify(payload)});
      hideAuthGate();await bootstrapStudioCloud();
    }catch(error){
      renderAuthGate(mode,setupStatus,error.code==='password_mismatch'?'两次密码不一致':authErrorText(error.code||error.message));
    }
  };
}
async function bootstrapStudioCloud(){
  const gate=ensureAuthGate();
  if(document.body.classList.contains('auth-locked'))gate.hidden=false;
  try{
    const data=await studioApi('/admin/bootstrap');
    applyCloudBootstrap(data);
    if(data.identity){
      state.account.displayName=data.identity.display_name||data.identity.email||'管理员';
      state.account.username=data.identity.email||'';
      state.account.email=data.identity.email||'';
      state.account.role=({owner:'Owner',admin:'Admin',editor:'Editor',reviewer:'Reviewer'})[data.identity.role]||data.identity.role;
      state.account.lastLogin='当前云端会话';
    }
    cloudState.status='connected';cloudState.lastError='';
    localStorage.setItem('yanku-studio-cloud-ready','1');
    hideAuthGate();render();refreshCloudStatus();
  }catch(error){
    cloudState.lastError=error.code||error.message||'unknown';
    if(error.status===401||error.code==='auth_required'||error.code==='invalid_session'){
      try{
        const status=await studioApi('/auth/setup/status');
        cloudState.status=status.needs_setup?'setup':'auth';
        renderAuthGate(status.needs_setup?'setup':'login',status);
      }catch(statusError){
        cloudState.status='error';
        renderAuthGate('login',{},'认证服务暂不可用，请确认 Worker 已部署最新版本。');
      }
    }else{
      cloudState.status='error';
      renderAuthGate('login',{},'后台初始化失败。可以先重新登录；如果仍失败，请刷新页面。');
    }
    refreshCloudStatus();
  }
}
function queueCloudSync(){
  if(!['connected','syncing'].includes(cloudState.status))return;
  if(cloudState.syncInFlight){cloudState.syncPending=true;return}
  clearTimeout(cloudState.syncTimer);
  cloudState.syncTimer=setTimeout(flushCloudSync,450);
}
async function flushCloudSync(){
  if(cloudState.syncInFlight){cloudState.syncPending=true;return}
  if(!['connected','syncing'].includes(cloudState.status))return;
  cloudState.syncInFlight=true;
  cloudState.status='syncing';
  refreshCloudStatus();
  try{
    const snapshot=buildCloudSnapshot();
    snapshot.base_revision=cloudState.revision;
    const result=await studioApi('/admin/studio-sync',{method:'PUT',body:JSON.stringify(snapshot)});
    if(Number.isFinite(Number(result?.studio_revision)))cloudState.revision=Number(result.studio_revision);
    cloudState.status='connected';
    cloudState.lastError='';
  }catch(error){
    cloudState.lastError=error.code||error.message||'unknown';
    if(error.status===409&&error.code==='sync_conflict'){
      cloudState.status='conflict';
      const remote=Number(error.data?.current_revision);
      if(Number.isFinite(remote))cloudState.lastError='sync_conflict@'+remote;
      toast('检测到其他管理员已更新云端。为避免覆盖，当前修改未继续同步，请刷新后台后重新操作。');
    }else{
      cloudState.status='error';
      toast('云端同步失败，本地副本已保留');
    }
  }finally{
    cloudState.syncInFlight=false;
    refreshCloudStatus();
    if(cloudState.syncPending&&cloudState.status==='connected'){
      cloudState.syncPending=false;
      queueCloudSync();
    }else if(cloudState.status!=='connected'){
      cloudState.syncPending=false;
    }
  }
}

const navGroups=[
  {label:'内容',items:[['overview','概览','home'],['resources','资料','box'],['errata','勘误','errata'],['experience','经验贴','article'],['announcements','公告','bell'],['copy','文案与说明','text']]},
  {label:'资源管理',items:[['taxonomy','科目管理','tag'],['files','文件','folder']]},
  {label:'系统',items:[['account','账号中心','account'],['admins','成员与权限','users'],['settings','站点设置','settings'],['audit','审计日志','audit']]}
];
const titles={overview:['OVERVIEW','概览'],resources:['RESOURCES','资料'],errata:['ERRATA','勘误'],experience:['EXPERIENCE','经验贴'],announcements:['ANNOUNCEMENTS','公告'],copy:['COPY','文案与说明'],taxonomy:['SUBJECTS','科目管理'],files:['MEDIA','文件'],account:['ACCOUNT','账号中心'],admins:['ACCESS','成员与权限'],settings:['SETTINGS','站点设置'],audit:['AUDIT','审计日志']};
function subjectLabel(item){return item.subjectName+(item.subjectCode?'（'+item.subjectCode+'）':'')}
function savePinnedResources(){localStorage.setItem('yanku-pinned-resource-titles',JSON.stringify(state.resources.filter(x=>x.pinned).map(x=>x.title)));queueCloudSync()}
function savePinnedAnnouncements(){localStorage.setItem('yanku-pinned-announcement-titles',JSON.stringify(state.announcements.filter(x=>x.pinned).map(x=>x.title)));queueCloudSync()}
function saveAnnouncements(){localStorage.setItem('yanku-announcements-v2',JSON.stringify(state.announcements));savePinnedAnnouncements();queueCloudSync()}
function announcementStatusLabel(x){if(x.status==='draft')return '草稿';if(x.status==='scheduled')return '定时';if(x.status==='expired')return '已过期';return '已发布'}
function pinButton(scope,id,on){return '<button class="pin-control '+(on?'active':'')+'" type="button" data-pin="'+scope+'" data-id="'+id+'" aria-label="'+(on?'取消置顶':'置顶')+'"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6l1 6 3 3v2H5v-2l3-3Z"/><path d="M12 14v7"/></svg></button>'}
function renderNav(){
  const owner=state.account?.role==='Owner'||state.account?.role==='owner';
  $('#nav').innerHTML=navGroups.map(g=>{
    const items=g.items.filter(([id])=>id!=='admins'||owner);
    if(!items.length)return '';
    return '<div class="nav-group">'+g.label+'</div>'+items.map(([id,label,ic])=>'<button class="nav-item '+(state.section===id?'active':'')+'" data-section="'+id+'">'+icon(ic)+'<span>'+label+'</span>'+badge(id)+'</button>').join('');
  }).join('');
  $('#nav [data-section]').forEach(b=>b.onclick=()=>{state.section=b.dataset.section;render();closeSide()});
}
function badge(id){const n={resources:state.resources.length,experience:state.experiences.length,errata:state.errata.length,announcements:state.announcements.length,admins:state.admins.length}[id];return n?'<b>'+n+'</b>':''}
function head(title,desc,action=''){return '<div class="page-head"><div><div class="eyebrow">'+titles[state.section][0]+'</div><h1>'+title+'</h1><p>'+desc+'</p></div><div class="page-actions">'+action+'</div></div>'}
function metric(label,value,note){return '<article class="metric"><span>'+label+'</span><strong>'+value+'</strong><small>'+note+'</small></article>'}
function renderOverview(){
  const visibleResources=state.resources.filter(x=>x.visible).length;
  const hiddenResources=state.resources.length-visibleResources;
  return head('概览','管理资源、公告、版本、权限与前台状态。','<button class="btn primary" data-new-resource>＋ 新建资料</button>')+
  '<section class="studio-status-strip">'+
    '<div><span class="status-dot online"></span><p><small>前台</small><strong>正常访问</strong></p></div>'+
    '<div><span class="status-dot preview"></span><p><small>数据源</small><strong data-cloud-status>'+cloudStatusLabel()+'</strong></p></div>'+
    '<div><span class="status-dot neutral"></span><p><small>资源状态</small><strong>'+visibleResources+' 显示 · '+hiddenResources+' 隐藏</strong></p></div>'+
  '</section>'+
  '<div class="metric-grid studio-metrics">'+
    metric('公开资料',visibleResources,'共 '+state.resources.length+' 项')+
    metric('资源版本',state.resources.reduce((n,x)=>n+x.versions,0),'标准版 / 打印版等')+
    metric('经验贴',state.experiences.length,'当前已发布')+
    metric('成员',state.admins.length,'含主管理员')+
  '</div>'+
  '<div class="grid two overview-panels">'+
    '<section class="card"><div class="card-head"><div><h2>公告</h2><p>仅在前台总览显示</p></div><div class="row-actions"><button class="btn small" data-jump-announcements>管理公告</button><button class="btn small" data-new-announcement>＋ 新建</button></div></div><div class="card-body"><div class="list">'+
      state.announcements.slice().sort((a,b)=>Number(b.pinned)-Number(a.pinned)).map(x=>'<div class="list-row compact"><div><strong>'+x.title+(x.pinned?' <span class="mini-pin">置顶</span>':'')+'</strong><small>'+x.kind+' · '+x.updated+'</small></div><div class="row-actions">'+pinButton('announcement',x.id,x.pinned)+toggle('announcement',x.id,x.visible)+'<button class="btn small" data-edit-announcement="'+x.id+'">编辑</button></div></div>').join('')+
    '</div></div></section>'+
    '<section class="card"><div class="card-head"><div><h2>最近资料</h2><p>快速进入版本、渠道与勘误</p></div><button class="btn small" data-jump-resources>管理全部</button></div><div class="card-body"><div class="list">'+
      state.resources.slice().sort((a,b)=>Number(b.pinned)-Number(a.pinned)).map(x=>'<button class="overview-resource-row" type="button" data-edit-resource="'+x.id+'"><span class="resource-dot"></span><span><strong>'+x.title+(x.pinned?' <span class="mini-pin">置顶</span>':'')+'</strong><small>'+subjectLabel(x)+' · '+(x.releaseVersion||'未标版本')+' · '+x.versions+' 个版本</small></span><span class="pill '+(x.visible?'green':'')+'">'+(x.visible?'显示':'隐藏')+'</span></button>').join('')+
    '</div></div></section>'+
  '</div>'+
  '<section class="card quick-card"><div class="card-head"><div><h2>快捷操作</h2><p>常用管理入口</p></div></div><div class="quick-actions-grid">'+
    '<button type="button" data-new-resource>'+icon('plus')+'<span><strong>新建资料</strong><small>创建资源与版本</small></span></button>'+
    '<button type="button" data-new-announcement>'+icon('bell')+'<span><strong>发布公告</strong><small>显示在前台总览</small></span></button>'+
    '<button type="button" data-jump-taxonomy>'+icon('tag')+'<span><strong>科目管理</strong><small>管理科目名称与代码</small></span></button>'+
    '<button type="button" data-jump-settings>'+icon('settings')+'<span><strong>站点设置</strong><small>链接与显示策略</small></span></button>'+
  '</div></section>'
}
function settingRow(k){const labels={resources:'资料',experience:'经验贴',errata:'勘误',notice:'公告'};return '<div class="list-row"><div><strong>'+labels[k]+'</strong><small>前台栏目</small></div>'+toggle('settings',k,state.settings[k])+'</div>'}
function toggle(scope,id,on){return '<button class="switch '+(on?'on':'')+'" data-toggle="'+scope+'" data-id="'+id+'" aria-label="切换显示"><i></i></button>'}
function renderResources(){
  const visible=state.resources.filter(x=>x.visible).length;
  const hidden=state.resources.length-visible;
  const rows=state.resources.slice().sort((a,b)=>Number(b.pinned)-Number(a.pinned)).map(x=>'<tr>'+
    '<td class="resource-main-cell"><div class="title-cell resource-title-cell"><span class="resource-table-icon">'+icon('box')+'</span><span><strong>'+escapeHtml(x.title)+(x.pinned?' <span class="mini-pin">置顶</span>':'')+'</strong><small>#'+escapeHtml(x.id)+' · '+escapeHtml(x.releaseVersion)+'</small></span></div></td>'+
    '<td class="subject-cell"><strong>'+escapeHtml(subjectLabel(x))+'</strong></td>'+
    '<td class="type-cell"><span class="pill">'+escapeHtml(x.type)+'</span></td>'+
    '<td class="release-cell"><strong>'+escapeHtml(x.releaseVersion)+'</strong><small class="cell-sub">'+escapeHtml(x.publishedAt)+'</small></td>'+
    '<td class="version-cell"><strong>'+escapeHtml(x.versions)+'</strong><small class="cell-sub"> 个版本</small></td>'+
    '<td class="toggle-cell">'+toggle('resource',x.id,x.visible)+'</td>'+
    '<td class="pin-cell">'+pinButton('resource',x.id,x.pinned)+'</td>'+
    '<td class="status-cell"><span class="pill orange">'+escapeHtml(x.status)+'</span></td>'+
    '<td class="actions-cell"><div class="row-actions"><button class="btn small" data-edit-resource="'+escapeHtml(x.id)+'">编辑</button><button class="icon-danger" aria-label="删除" data-delete-resource="'+escapeHtml(x.id)+'">×</button></div></td>'+
  '</tr>').join('');
  return head('资料','统一管理资料本体、科目、发布版本、下载入口、打印与勘误。','<button class="btn primary page-create" data-new-resource>＋ 新建资料</button>')+
  '<section class="resource-summary"><button class="summary-chip active"><strong>'+state.resources.length+'</strong><span>全部</span></button><button class="summary-chip"><strong>'+visible+'</strong><span>显示</span></button><button class="summary-chip"><strong>'+hidden+'</strong><span>隐藏</span></button><button class="summary-chip"><strong>'+state.resources.filter(x=>x.pinned).length+'</strong><span>置顶</span></button></section>'+
  '<section class="card data-card"><div class="toolbar"><label class="table-search">'+icon('search')+'<input class="control grow" placeholder="搜索标题、科目或代码"></label><div class="toolbar-spacer"></div><select class="control"><option>全部类型</option><option>做题本</option><option>书籍</option><option>讲义</option><option>真题</option></select><select class="control"><option>全部状态</option><option>显示</option><option>隐藏</option></select></div><div class="table-wrap"><table class="table resource-table"><thead><tr><th>资源</th><th>科目</th><th>类型</th><th>发布版本 / 日期</th><th>版本数</th><th>显示</th><th>置顶</th><th>状态</th><th></th></tr></thead><tbody>'+rows+'</tbody></table></div></section>'
}
function renderExperience(){
  const rows=state.experiences.map(x=>'<tr><td><div class="title-cell"><strong>'+escapeHtml(x.title)+'</strong><small>'+escapeHtml(x.author||'未填写作者')+' · '+escapeHtml(x.year||'未填年份')+'</small></div></td><td>'+escapeHtml((x.school||'')+(x.major?' / '+x.major:''))+'</td><td><span class="pill">'+escapeHtml(x.stage||'未分类')+'</span></td><td>'+toggle('experience',x.id,x.visible)+'</td><td><div class="row-actions"><button class="btn small" data-edit-experience="'+escapeHtml(x.id)+'">编辑</button><button class="icon-danger" data-delete-experience="'+escapeHtml(x.id)+'" aria-label="删除">×</button></div></td></tr>').join('');
  return head('经验贴','按院校、专业、年份和阶段整理，并保留原始来源。','<button class="btn primary" data-new-experience>＋ 新建经验贴</button>')+
  '<section class="card data-card"><div class="toolbar"><input class="control grow" placeholder="搜索标题、院校、专业或作者"><select class="control"><option>全部阶段</option><option>初试</option><option>复试</option><option>择校</option></select></div>'+
  (state.experiences.length?'<div class="table-wrap"><table class="table"><thead><tr><th>标题</th><th>院校 / 专业</th><th>阶段</th><th>显示</th><th></th></tr></thead><tbody>'+rows+'</tbody></table></div>':'<div class="empty"><strong>暂无经验贴</strong><p>点击右上角“新建经验贴”即可创建。</p></div>')+
  '</section>'
}
function errataStatusLabel(value){return ({pending:'待核对',recorded:'待核对',confirmed:'已确认',fixed:'已修正',ignored:'已忽略','待核对':'待核对','已确认':'已确认','已修正':'已修正','已忽略':'已忽略'})[value]||value||'待核对'}
function errataResourceName(item){const r=state.resources.find(x=>sameId(x.id,item.resourceId));return r?.title||item.resourceId||'未关联资源'}
function errataVersionName(item){const r=state.resources.find(x=>sameId(x.id,item.resourceId));const v=(r?.extraVersions||[]).find(x=>sameId(x.id,item.versionId));return v?.name||(item.versionId?'未找到版本':'资源级')}
function renderErrata(){
  const count=status=>state.errata.filter(x=>errataStatusLabel(x.status)===status).length;
  const rows=state.errata.map(x=>'<tr><td><div class="title-cell"><strong>'+escapeHtml(x.title)+'</strong><small>'+escapeHtml(errataResourceName(x))+' · '+escapeHtml(errataVersionName(x))+'</small></div></td><td><span class="pill">'+escapeHtml(errataStatusLabel(x.status))+'</span></td><td>'+(x.visible?'<span class="pill green">公开</span>':'<span class="pill">隐藏</span>')+'</td><td><div class="row-actions"><button class="btn small" data-edit-errata="'+escapeHtml(x.id)+'">编辑</button><button class="icon-danger" data-delete-errata="'+escapeHtml(x.id)+'" aria-label="删除">×</button></div></td></tr>').join('');
  return head('勘误','将问题关联到具体资源和版本，并跟踪处理状态；只有“已修正 + 公开”会出现在主页。','<button class="btn primary" data-new-errata>＋ 新建勘误</button>')+
  '<div class="metric-grid">'+metric('待核对',count('待核对'),'尚未确认')+metric('已确认',count('已确认'),'等待修正')+metric('已修正',count('已修正'),'可公开记录')+metric('已忽略',count('已忽略'),'保留原因')+'</div>'+
  '<section class="card"><div class="toolbar"><input class="control grow" placeholder="搜索资源、题号或问题"></div>'+
  (state.errata.length?'<div class="table-wrap"><table class="table"><thead><tr><th>勘误</th><th>状态</th><th>主页</th><th></th></tr></thead><tbody>'+rows+'</tbody></table></div>':'<div class="empty"><strong>暂无勘误</strong><p>点击右上角“新建勘误”即可建立云端记录。</p></div>')+'</section>'
}
function renderAnnouncements(){
  const published=state.announcements.filter(x=>x.status==='published').length;
  const drafts=state.announcements.filter(x=>x.status==='draft').length;
  const scheduled=state.announcements.filter(x=>x.status==='scheduled').length;
  const rows=state.announcements.slice().sort((a,b)=>Number(b.pinned)-Number(a.pinned)||String(b.updated).localeCompare(String(a.updated))).map(x=>
    '<tr>'+
      '<td class="select-cell"><input class="row-check" type="checkbox" data-select-announcement="'+escapeHtml(x.id)+'" '+(state.announcementSelection.has(String(x.id))?'checked':'')+'></td>'+
      '<td><div class="title-cell"><strong>'+escapeHtml(x.title)+(x.pinned?' <span class="mini-pin">置顶</span>':'')+'</strong><small>'+escapeHtml(x.kind)+' · '+escapeHtml(x.audience)+'</small></div></td>'+
      '<td><span class="pill '+(x.status==='published'?'green':x.status==='scheduled'?'blue':x.status==='draft'?'':'orange')+'">'+escapeHtml(announcementStatusLabel(x))+'</span></td>'+
      '<td>'+pinButton('announcement',x.id,x.pinned)+'</td>'+
      '<td>'+toggle('announcement',x.id,x.visible)+'</td>'+
      '<td><div class="announcement-time"><strong>'+escapeHtml((x.publishAt||'').replace('T',' ')||'立即')+'</strong><small>'+escapeHtml(x.expiresAt?'至 '+x.expiresAt.replace('T',' '):'长期有效')+'</small></div></td>'+
      '<td><div class="row-actions"><button class="btn small" data-preview-announcement="'+escapeHtml(x.id)+'">预览</button><button class="btn small" data-edit-announcement="'+escapeHtml(x.id)+'">编辑</button><button class="btn small" data-duplicate-announcement="'+escapeHtml(x.id)+'">复制</button><button class="icon-danger" aria-label="删除" data-delete-announcement="'+escapeHtml(x.id)+'">×</button></div></td>'+
    '</tr>'
  ).join('');
  return head('公告','独立管理前台总览公告：发布、草稿、定时、过期、置顶和显示策略。','<button class="btn primary" data-new-announcement>＋ 新建公告</button>')+
    '<section class="announcement-summary">'+
      '<button class="summary-chip active"><strong>'+state.announcements.length+'</strong><span>全部</span></button>'+
      '<button class="summary-chip"><strong>'+published+'</strong><span>已发布</span></button>'+
      '<button class="summary-chip"><strong>'+drafts+'</strong><span>草稿</span></button>'+
      '<button class="summary-chip"><strong>'+scheduled+'</strong><span>定时</span></button>'+
    '</section>'+
    '<section class="card data-card">'+
      '<div class="toolbar announcement-toolbar"><label class="table-search">'+icon('search')+'<input class="control grow" placeholder="搜索公告标题或正文"></label><select class="control"><option>全部状态</option><option>已发布</option><option>草稿</option><option>定时</option><option>已过期</option></select><select class="control"><option>全部类型</option><option>更新通知</option><option>使用说明</option><option>维护</option></select></div>'+
      '<div class="bulk-bar '+(state.announcementSelection.size?'show':'')+'"><span>已选择 '+state.announcementSelection.size+' 项</span><div><button class="btn small" data-announcement-bulk="show">显示</button><button class="btn small" data-announcement-bulk="hide">隐藏</button><button class="btn small" data-announcement-bulk="publish">发布</button><button class="btn small danger" data-announcement-bulk="delete">删除</button></div></div>'+
      '<div class="table-wrap"><table class="table announcement-table"><thead><tr><th class="select-cell"><input id="selectAllAnnouncements" type="checkbox"></th><th>公告</th><th>状态</th><th>置顶</th><th>显示</th><th>发布时间</th><th></th></tr></thead><tbody>'+rows+'</tbody></table></div>'+
    '</section>'
}
function renderCopy(){
  const groups=copyGroups.map(group=>
    '<section class="card copy-group"><div class="card-head"><div><h2>'+group.title+'</h2><p>'+group.desc+'</p></div></div><div class="card-body"><div class="copy-field-grid">'+
      group.fields.map(([key,label,type])=>{
        const value=state.copy[key]??'';
        return '<label class="field '+(type==='textarea'?'wide':'')+'"><span>'+label+'</span>'+(type==='textarea'?'<textarea data-copy-input="'+key+'">'+value+'</textarea>':'<input data-copy-input="'+key+'" value="'+value+'">')+'</label>'
      }).join('')+
    '</div></div></section>'
  ).join('');
  return head('文案与说明','统一修改前台文字；保存后刷新前台即可看到变化。','<button class="btn" data-copy-export>导出 JSON</button><button class="btn" data-copy-reset>恢复默认</button><button class="btn primary" data-copy-save>保存文案</button>')+
    '<section class="card copy-visibility-card"><div class="card-head"><div><h2>首页信息卡显示</h2><p>控制免费公开、QQ群和持续更新信息是否出现在总览。</p></div></div><div class="card-body"><div class="list">'+
      '<div class="list-row"><div><strong>免费公开</strong><small>显示“全部资源免费公开”信息卡</small></div>'+toggle('copy-visibility','showFreeInfo',state.copy.showFreeInfo)+'</div>'+
      '<div class="list-row"><div><strong>QQ群</strong><small>显示QQ群号和复制入口</small></div>'+toggle('copy-visibility','showQQInfo',state.copy.showQQInfo)+'</div>'+
      '<div class="list-row"><div><strong>QQ群加入按钮</strong><small>配置加入链接后可在前台显示“加入群”</small></div>'+toggle('copy-visibility','showQQJoinButton',state.copy.showQQJoinButton)+'</div>'+
      '<div class="list-row"><div><strong>持续更新</strong><small>显示功能持续添加中的说明</small></div>'+toggle('copy-visibility','showProgressInfo',state.copy.showProgressInfo)+'</div>'+
    '</div></div></section>'+
    '<div class="copy-groups">'+groups+'</div>'+
    '<div class="design-note">动态数据（资源数量、版本数量、发布日期等）仍由对应内容模块生成；其余主要前台文案都集中在这里维护。</div>'
}
function renderTaxonomy(){
  const rows=state.categories.map(x=>'<tr><td><strong>'+escapeHtml(x.name)+'</strong><small class="cell-sub">（'+escapeHtml(x.code)+'）</small></td><td>'+escapeHtml(x.count)+'</td><td>'+escapeHtml(x.order)+'</td><td>'+toggle('category',x.id,x.visible)+'</td><td><div class="row-actions"><button class="btn small" data-edit-category="'+escapeHtml(x.id)+'">编辑</button><button class="btn small danger" data-delete-category="'+escapeHtml(x.id)+'">删除</button></div></td></tr>').join('');
  return head('科目管理','统一使用「科目名称（科目代码）」；不再维护“公共课 / 专业课”这种上级分类。','<button class="btn primary" data-new-category>＋ 新建科目</button>')+
  '<section class="card"><div class="table-wrap"><table class="table"><thead><tr><th>科目</th><th>资源数</th><th>排序</th><th>显示</th><th></th></tr></thead><tbody>'+rows+'</tbody></table></div></section>'
}

function fileKindFromMime(mime,name=''){
  const m=String(mime||'').toLowerCase(),n=String(name||'').toLowerCase();
  if(m.includes('pdf')||n.endsWith('.pdf'))return 'PDF';
  if(m.startsWith('image/')||/\.(png|jpe?g|gif|webp|svg)$/.test(n))return '图片';
  if(/zip|rar|7z|gzip|tar/.test(m)||/\.(zip|rar|7z|tar|gz)$/.test(n))return '压缩包';
  return '其他';
}
function fileMimeFromKind(kind,file){
  if(file?.type)return file.type;
  if(kind==='PDF')return 'application/pdf';
  if(kind==='图片')return 'image/*';
  if(kind==='压缩包')return 'application/zip';
  return 'application/octet-stream';
}
function formatFileSize(bytes){
  const n=Number(bytes)||0;
  if(!n)return '未记录大小';
  if(n<1024)return n+' B';
  if(n<1024*1024)return (n/1024).toFixed(n<10240?1:0)+' KB';
  return (n/1024/1024).toFixed(n<10*1024*1024?2:1)+' MB';
}
function fileAssociationLabel(file){
  const resource=state.resources.find(r=>sameId(r.id,file.resourceId));
  const version=resource?.extraVersions?.find(v=>sameId(v.id,file.versionId));
  const linked=[resource?.title,version?.name].filter(Boolean).join(' · ');
  return file.usage||linked||'未关联';
}
async function persistCloudFile(record,fileBlob){
  const id=record.id||('file-'+Date.now());
  const payload={
    id,
    object_key:record.objectKey||('external-'+id),
    name:record.name||fileBlob?.name||'未命名文件',
    mime_type:fileMimeFromKind(record.kind,fileBlob),
    size_bytes:fileBlob?.size??record.sizeBytes??0,
    is_public:record.visible!==false,
    resource_id:record.resourceId||null,
    version_id:record.versionId||null,
    external_url:record.url||'',
    usage_note:record.usage||''
  };
  try{
    const data=await studioApi(record.id?'/admin/files/'+encodeURIComponent(record.id):'/admin/files',{method:record.id?'PUT':'POST',body:JSON.stringify(payload)});
    return {cloud:true,item:data.item};
  }catch(error){
    if(error.status===404||error.code==='unknown_entity'){
      return {cloud:false,error};
    }
    throw error;
  }
}
function renderFiles(){
  const rows=state.files.map(x=>'<tr><td><div class="title-cell"><strong>'+escapeHtml(x.name)+'</strong><small>'+escapeHtml(x.kind)+' · '+escapeHtml(x.size||formatFileSize(x.sizeBytes))+'</small></div></td><td>'+escapeHtml(fileAssociationLabel(x))+'</td><td><span class="pill '+(x.visible?'green':'')+'">'+(x.visible?'公开':'隐藏')+'</span></td><td><div class="row-actions">'+(x.url?'<a class="btn small" href="'+escapeHtml(x.url)+'" target="_blank" rel="noopener">打开</a>':'')+'<button class="btn small" data-edit-file="'+escapeHtml(x.id)+'">编辑</button><button class="icon-danger" data-delete-file="'+escapeHtml(x.id)+'" aria-label="删除">×</button></div></td></tr>').join('');
  return head('文件','文件元数据保存在 Cloudflare D1；文件本体继续使用百度、夸克、直链或其他外部存储。','<button class="btn primary" data-upload>＋ 登记文件</button>')+
  '<section class="card data-card"><div class="toolbar"><input class="control grow" placeholder="搜索文件名或关联资源"><select class="control"><option>全部文件</option><option>PDF</option><option>图片</option><option>压缩包</option><option>其他</option></select></div>'+
  (state.files.length?'<div class="table-wrap"><table class="table"><thead><tr><th>文件</th><th>用途 / 关联</th><th>状态</th><th></th></tr></thead><tbody>'+rows+'</tbody></table></div>':'<div class="empty"><strong>尚未登记文件</strong><p>可以登记外部文件链接并关联到资料或版本；文件内容本身不会上传到 D1。</p></div>')+
  '</section>'
}
function renderAccount(){
  const a=state.account;
  return head('账号中心','管理当前账号资料、安全选项与会话。','<button class="btn primary" data-save-account>保存账号</button>')+
  '<div class="grid two account-grid">'+
    '<section class="card"><div class="card-head"><div><h2>账号资料</h2><p>当前工作台身份</p></div></div><div class="card-body"><div class="account-profile"><span class="account-avatar">主</span><div><strong>'+a.displayName+'</strong><small>'+a.role+' · '+a.username+'</small></div></div><div class="form-grid" style="margin-top:14px"><label class="field wide"><span>显示名称</span><input id="accountDisplayName" value="'+a.displayName+'"></label><label class="field"><span>登录账号</span><input id="accountUsername" value="'+a.username+'" disabled></label><label class="field"><span>登录邮箱</span><input id="accountEmail" type="email" value="'+a.email+'" disabled></label></div></div></section>'+
    '<section class="card"><div class="card-head"><div><h2>安全</h2><p>Cloudflare D1 云端认证</p></div></div><div class="card-body"><div class="list"><div class="list-row"><div><strong>修改密码</strong><small>设置新的后台访问密码</small></div><button class="btn small" data-account-password>修改</button></div><div class="list-row"><div><strong>两步验证</strong><small>当前版本尚未接入 TOTP</small></div><span class="pill">暂未开放</span></div><div class="list-row"><div><strong>恢复代码</strong><small>需要启用两步验证后提供</small></div><button class="btn small" disabled>暂未开放</button></div></div></div></section>'+
  '</div>'+
  '<section class="card" style="margin-top:14px"><div class="card-head"><div><h2>登录会话</h2><p>当前仅展示本次会话</p></div><button class="btn small danger" disabled>退出其他会话 · 暂未开放</button></div><div class="card-body"><div class="session-row"><span class="session-device">'+icon('account')+'</span><div><strong>当前设备</strong><small>当前会话 · 最近活动刚刚</small></div><span class="pill green">当前</span></div></div></section>'+
  '<div class="design-note" style="margin-top:14px">账号、密码哈希与登录会话均由 Worker + D1 管理；浏览器不会保存管理员密码。</div>'
}
function renderAdmins(){
  const owner=state.account?.role==='Owner'||state.account?.role==='owner';
  if(!owner)return head('成员与权限','管理员账号彼此隔离，只有主管理员可以管理其他成员。','');
  const rows=state.admins.map(x=>'<tr><td><div class="title-cell"><strong>'+escapeHtml(x.name)+'</strong><small>'+(x.locked?'当前主管理员':'授权成员')+'</small></div></td><td><span class="pill blue">'+escapeHtml(({owner:'Owner',admin:'Admin',editor:'Editor',reviewer:'Reviewer'}[x.role]||x.role))+'</span></td><td><span class="pill '+(x.status==='active'?'green':'red')+'">'+(x.status==='active'?'启用':'停用')+'</span></td><td>'+escapeHtml(x.last)+'</td><td><div class="row-actions"><button class="btn small" data-edit-admin="'+escapeHtml(x.id)+'">'+(x.locked?'查看主管理员':'编辑')+'</button><button class="btn small danger" '+(x.locked?'disabled':'')+' data-delete-admin="'+escapeHtml(x.id)+'">删除</button></div></td></tr>').join('');
  return head('成员与权限','管理员账号彼此隔离；只有主管理员可以查看、创建、修改或删除其他管理员。','<button class="btn primary" data-new-admin>＋ 新增成员</button>')+
  '<section class="card"><div class="table-wrap"><table class="table"><thead><tr><th>成员</th><th>角色</th><th>状态</th><th>最近活动</th><th></th></tr></thead><tbody>'+rows+'</tbody></table></div></section>'+
  '<section class="card" style="margin-top:14px"><div class="card-head"><div><h2>权限矩阵</h2><p>成员管理仅 Owner 可用；普通管理员之间互不可见、互不可管理。</p></div></div><div class="card-body">'+permissionMatrix()+'</div></section>'
}
function permissionMatrix(){
  const rows=[
    ['资料 / 渠道 / 勘误',1,1,1,0],
    ['经验贴管理',1,1,1,0],
    ['公告管理',1,1,1,0],
    ['科目管理',1,1,1,0],
    ['成员与权限',1,0,0,0],
    ['站点设置',1,1,0,0],
    ['查看后台数据',1,1,1,1],
    ['审计日志',1,1,0,1]
  ];
  let h='<div class="permission-grid"><div class="head">权限</div><div class="head">Owner</div><div class="head">管理员</div><div class="head">编辑</div><div class="head">审核</div>';
  rows.forEach(r=>{h+='<div>'+r[0]+'</div>'+r.slice(1).map(v=>'<div class="'+(v?'yes':'no')+'">'+(v?'✓':'—')+'</div>').join('')});
  return h+'</div>'
}
function renderSettings(){
  return head('站点设置','控制公开站点的名称、说明、栏目、默认排序和整体显示。','<button class="btn primary" data-save-settings>保存设置</button>')+
  '<div class="grid two"><section class="card"><div class="card-head"><div><h2>基础信息</h2><p>前台公开信息</p></div></div><div class="card-body"><div class="form-grid"><label class="field wide"><span>站点名称</span><input id="siteNameInput" value="'+state.settings.siteName+'"></label><label class="field wide"><span>站点说明</span><textarea id="siteDescriptionInput">'+state.settings.siteDescription+'</textarea></label></div></div></section>'+
  '<section class="card"><div class="card-head"><div><h2>栏目显示</h2><p>关闭后前台不加载该栏目</p></div></div><div class="card-body"><div class="list">'+['resources','experience'].map(k=>settingRow(k)).join('')+'</div></div></section></div>'+
  '<section class="card" style="margin-top:14px"><div class="card-head"><div><h2>交互链接</h2><p>统一配置前台需要跳转到外部页面的入口</p></div></div><div class="card-body"><div class="form-grid"><label class="field wide"><span>勘误申请提交链接</span><input id="errataSubmitUrlInput" type="url" placeholder="https://..." value="'+state.settings.errataSubmitUrl+'"></label><div class="field wide"><span>说明</span><div class="design-note">前台每个资料版本的「勘误」旁会显示「申请提交」。保存后写入 Cloudflare D1，并由公开主页实时读取。</div></div></div></div></section>'+
  '<section class="card" style="margin-top:14px"><div class="card-head"><div><h2>危险操作</h2><p>全站级操作必须由主管理员执行</p></div></div><div class="card-body"><div class="list-row"><div><strong>导出全部配置</strong><small>不包含密钥与身份凭据</small></div><button class="btn small" data-export-config>导出 JSON</button></div><div class="list-row"><div><strong>清空演示数据</strong><small>为避免误删生产数据，当前未开放</small></div><button class="btn small danger" disabled>暂未开放</button></div></div></section>'
}
function settingRow(k){const labels={resources:'资料栏目',experience:'经验贴栏目'};return '<div class="list-row"><div><strong>'+labels[k]+'</strong><small>前台显示</small></div>'+toggle('settings',k,state.settings[k])+'</div>'}
function renderAudit(){
  const rows=(state.audit||[]).map(x=>'<tr><td>'+escapeHtml(String(x.created_at||'').replace('T',' ').slice(0,19))+'</td><td>'+escapeHtml(x.actor_email||'系统')+'</td><td>'+escapeHtml(x.action)+'</td><td>'+escapeHtml(x.entity_type)+' · '+escapeHtml(x.entity_id||'')+'</td><td><span class="pill green">成功</span></td></tr>').join('');
  return head('审计日志','记录高权限操作，包括创建、修改、删除、权限变更和同步。','<button class="btn" type="button" data-export-audit>导出日志</button>')+
  '<section class="card"><div class="table-wrap"><table class="table"><thead><tr><th>时间</th><th>成员</th><th>动作</th><th>对象</th><th>结果</th></tr></thead><tbody>'+(rows||'<tr><td colspan="5">暂无审计记录</td></tr>')+'</tbody></table></div></section>'
}

function globalSearchItems(){
  const items=[];
  state.resources.forEach(x=>items.push({kind:'资料',section:'resources',id:x.id,title:x.title,meta:[x.subjectName,x.subjectCode,x.releaseVersion,x.type].filter(Boolean).join(' · '),text:[x.title,x.description,x.subjectName,x.subjectCode,x.releaseVersion,x.type].join(' ')}));
  state.errata.forEach(x=>items.push({kind:'勘误',section:'errata',id:x.id,title:x.title,meta:errataResourceName(x)+' · '+errataStatusLabel(x.status),text:[x.title,x.body,errataResourceName(x),errataVersionName(x),errataStatusLabel(x.status)].join(' ')}));
  state.announcements.forEach(x=>items.push({kind:'公告',section:'announcements',id:x.id,title:x.title,meta:[x.kind,announcementStatusLabel(x)].filter(Boolean).join(' · '),text:[x.title,x.body,x.kind,announcementStatusLabel(x)].join(' ')}));
  if(state.account?.role==='Owner'||state.account?.role==='owner')state.admins.forEach(x=>items.push({kind:'成员',section:'admins',id:x.id,title:x.name,meta:[x.identifier||'',({owner:'Owner',admin:'管理员',editor:'编辑',reviewer:'审核'}[x.role]||x.role)].filter(Boolean).join(' · '),text:[x.name,x.identifier,x.role,x.status].join(' ')}));
  return items;
}
function closeGlobalSearch(){
  const box=$('#globalSearchResults'),input=$('#globalSearch');
  if(box)box.hidden=true;
  if(input)input.setAttribute('aria-expanded','false');
}
function renderGlobalSearchResults(){
  const input=$('#globalSearch'),box=$('#globalSearchResults');
  if(!input||!box)return;
  const query=input.value.trim().toLowerCase();
  if(!query){closeGlobalSearch();box.innerHTML='';return}
  const matches=globalSearchItems().filter(item=>item.text.toLowerCase().includes(query)).slice(0,10);
  box.innerHTML=matches.length
    ? '<div class="global-search-result-list">'+matches.map(item=>
        '<button type="button" class="global-search-result" data-search-section="'+escapeHtml(item.section)+'" data-search-id="'+escapeHtml(item.id)+'">'+
          '<span class="global-search-kind">'+escapeHtml(item.kind)+'</span>'+
          '<span class="global-search-copy"><strong>'+escapeHtml(item.title)+'</strong><small>'+escapeHtml(item.meta||'')+'</small></span>'+
        '</button>'
      ).join('')+'</div>'
    : '<div class="global-search-empty">没有匹配结果</div>';
  box.hidden=false;
  input.setAttribute('aria-expanded','true');
  $$('#globalSearchResults [data-search-section]').forEach(button=>button.onclick=()=>{
    const section=button.dataset.searchSection,id=button.dataset.searchId;
    closeGlobalSearch();
    input.value='';
    state.section=section;
    render();
    if(section==='resources')openResource(id);
    else if(section==='errata')openErrataEditor(id);
    else if(section==='announcements')openAnnouncement(id);
    else if(section==='admins')openAdmin(id);
  });
}

function render(){
  const owner=state.account?.role==='Owner'||state.account?.role==='owner';
  if(state.section==='admins'&&!owner)state.section='account';
  renderNav(); const [ey,title]=titles[state.section]; $('#topEyebrow').textContent=ey;$('#topTitle').textContent=title;
  const r={overview:renderOverview,resources:renderResources,errata:renderErrata,experience:renderExperience,announcements:renderAnnouncements,copy:renderCopy,taxonomy:renderTaxonomy,files:renderFiles,account:renderAccount,admins:renderAdmins,settings:renderSettings,audit:renderAudit}[state.section];
  $('#panelHost').innerHTML=r(); bind();
}
function bind(){
  $$('[data-pin]').forEach(button=>button.onclick=event=>{event.stopPropagation();const scope=button.dataset.pin,id=button.dataset.id;if(scope==='resource'){const item=state.resources.find(x=>x.id==id);if(item){item.pinned=!item.pinned;savePinnedResources();saveStudioCollections()}}if(scope==='announcement'){const item=state.announcements.find(x=>x.id==id);if(item){item.pinned=!item.pinned;saveAnnouncements()}}render();toast('置顶状态已更新')});
  $$('[data-toggle]').forEach(b=>b.onclick=async()=>{
    const s=b.dataset.toggle,id=b.dataset.id;
    if(s==='copy-visibility')return;
    if(s==='settings'){
      const previous=Boolean(state.settings[id]);
      state.settings[id]=!previous;
      render();
      try{
        await studioApi('/admin/settings/public.settings',{method:'PUT',body:JSON.stringify({value:state.settings})});
        toast('栏目设置已同步到云端');
      }catch(error){
        state.settings[id]=previous;
        render();
        toast('保存失败，已恢复原设置');
      }
      return;
    }
    if(s==='resource'){const x=state.resources.find(x=>x.id==id);if(x){x.visible=!x.visible;saveStudioCollections()}}
    if(s==='announcement'){const x=state.announcements.find(x=>x.id==id);if(x){x.visible=!x.visible;saveAnnouncements()}}
    if(s==='experience'){const x=state.experiences.find(x=>x.id==id);if(x){x.visible=!x.visible;saveStudioCollections()}}
    if(s==='category'){const x=state.categories.find(x=>x.id==id);if(x){x.visible=!x.visible;saveStudioCollections()}}
    render();toast('状态已更新')
  });
  $$('[data-edit-resource]').forEach(b=>b.onclick=()=>openResource(b.dataset.editResource));
  $('[data-new-resource]')?.addEventListener('click',()=>openResource());
  $$('[data-delete-resource]').forEach(b=>b.onclick=()=>confirmDelete('删除资料','删除后将同时移除版本与渠道。',()=>{state.resources=state.resources.filter(x=>x.id!=b.dataset.deleteResource);saveStudioCollections();render();toast('已删除')}));
  $$('[data-select-announcement]').forEach(b=>b.onchange=()=>{const id=String(b.dataset.selectAnnouncement);b.checked?state.announcementSelection.add(id):state.announcementSelection.delete(id);render()});
  $('#selectAllAnnouncements')?.addEventListener('change',e=>{state.announcementSelection=new Set(e.target.checked?state.announcements.map(x=>String(x.id)):[]);render()});
  $$('[data-announcement-bulk]').forEach(b=>b.onclick=()=>{
    const action=b.dataset.announcementBulk;
    if(action==='delete'){state.announcements=state.announcements.filter(x=>!state.announcementSelection.has(String(x.id)))}
    else state.announcements.forEach(x=>{if(state.announcementSelection.has(String(x.id))){if(action==='show')x.visible=true;if(action==='hide')x.visible=false;if(action==='publish'){x.status='published';x.visible=true}}});
    state.announcementSelection.clear();saveAnnouncements();render();toast('批量操作已完成')
  });
  $$('[data-edit-announcement]').forEach(b=>b.onclick=()=>openAnnouncement(b.dataset.editAnnouncement));
  $$('[data-preview-announcement]').forEach(b=>b.onclick=()=>previewAnnouncement(b.dataset.previewAnnouncement));
  $$('[data-duplicate-announcement]').forEach(b=>b.onclick=()=>duplicateAnnouncement(b.dataset.duplicateAnnouncement));
  $('[data-new-announcement]')?.addEventListener('click',()=>openAnnouncement());
  $$('[data-delete-announcement]').forEach(b=>b.onclick=()=>confirmDelete('删除公告','该公告将不再出现在前台。',()=>{state.announcements=state.announcements.filter(x=>x.id!=b.dataset.deleteAnnouncement);saveAnnouncements();render();toast('已删除')}));
  $('[data-copy-save]')?.addEventListener('click',()=>{
    $$('[data-copy-input]').forEach(input=>state.copy[input.dataset.copyInput]=input.value);
    saveSiteCopy();toast('前台文案已保存')
  });
  $('[data-copy-reset]')?.addEventListener('click',()=>confirmDelete('恢复默认文案','将恢复所有前台文案和说明卡默认值。',()=>{state.copy={...siteCopyDefaults};saveSiteCopy();render();toast('已恢复默认文案')}));
  $('[data-copy-export]')?.addEventListener('click',()=>{
    const text=JSON.stringify(state.copy,null,2);
    navigator.clipboard?.writeText(text).then(()=>toast('文案 JSON 已复制')).catch(()=>toast('复制失败'))
  });
  $$('[data-toggle="copy-visibility"]').forEach(button=>button.onclick=()=>{
    const key=button.dataset.id;state.copy[key]=!state.copy[key];saveSiteCopy();render();toast('显示设置已更新')
  });
  $('[data-new-admin]')?.addEventListener('click',openAdmin);
  $('[data-account-password]')?.addEventListener('click',openPasswordEditor);
  $$('[data-edit-admin]').forEach(b=>b.onclick=()=>openAdmin(b.dataset.editAdmin));
  $$('[data-delete-admin]').forEach(b=>b.onclick=()=>{if(b.disabled)return;confirmDelete('删除成员','删除后该成员的云端登录权限和会话都会失效。',async()=>{try{await studioApi('/admin/accounts/'+encodeURIComponent(b.dataset.deleteAdmin),{method:'DELETE'});toast('成员已删除');await bootstrapStudioCloud()}catch(error){toast(authErrorText(error.code||error.message))}})});
  $('[data-save-settings]')?.addEventListener('click',async()=>{
    state.settings.siteName=$('#siteNameInput')?.value.trim()||'研库';
    state.settings.siteDescription=$('#siteDescriptionInput')?.value.trim()||'';
    state.settings.errataSubmitUrl=$('#errataSubmitUrlInput')?.value.trim()||'';
    localStorage.setItem('yanku-errata-submit-url',state.settings.errataSubmitUrl);
    try{
      await studioApi('/admin/settings/public.settings',{method:'PUT',body:JSON.stringify({value:state.settings})});
      toast('站点设置已同步到云端');
    }catch(error){toast(authErrorText(error.code||error.message))}
  });
  $('[data-new-experience]')?.addEventListener('click',()=>openExperience());
  $$('[data-edit-experience]').forEach(b=>b.onclick=()=>openExperience(b.dataset.editExperience));
  $$('[data-delete-experience]').forEach(b=>b.onclick=()=>confirmDelete('删除经验贴','删除后将从后台列表移除。',()=>{state.experiences=state.experiences.filter(x=>x.id!=b.dataset.deleteExperience);saveStudioCollections();render();toast('经验贴已删除')}));
  $('[data-new-errata]')?.addEventListener('click',()=>openErrataEditor());
  $$('[data-edit-errata]').forEach(b=>b.onclick=()=>openErrataEditor(b.dataset.editErrata));
  $$('[data-delete-errata]').forEach(b=>b.onclick=()=>confirmDelete('删除勘误','删除后该记录将从 D1 和公开页面移除。',()=>{state.errata=state.errata.filter(x=>!sameId(x.id,b.dataset.deleteErrata));saveStudioCollections();render();toast('勘误已删除')}));
  $('[data-new-category]')?.addEventListener('click',()=>openCategory());
  $$('[data-edit-category]').forEach(b=>b.onclick=()=>openCategory(b.dataset.editCategory));
  $$('[data-delete-category]').forEach(b=>b.onclick=()=>confirmDelete('删除科目','不会删除资料；原属于该科目的资料将变为未分类。',()=>{const category=state.categories.find(x=>sameId(x.id,b.dataset.deleteCategory));if(category){state.resources.forEach(r=>{if(r.subjectName===category.name&&r.subjectCode===category.code){r.subjectName='';r.subjectCode=''}})}state.categories=state.categories.filter(x=>!sameId(x.id,b.dataset.deleteCategory));saveStudioCollections();render();toast('科目已删除')}));
  $('[data-upload]')?.addEventListener('click',()=>openFile());
  $$('[data-edit-file]').forEach(b=>b.onclick=()=>openFile(b.dataset.editFile));
  $('[data-delete-file]').forEach(b=>b.onclick=()=>confirmDelete('删除文件记录','只删除 D1 中的文件元数据，不会删除外部网盘或直链文件。',async()=>{
    const id=b.dataset.deleteFile;
    try{
      await studioApi('/admin/files/'+encodeURIComponent(id),{method:'DELETE'});
      state.files=state.files.filter(x=>!sameId(x.id,id));
      render();toast('D1 文件记录已删除');
    }catch(error){
      if(error.status===404||error.code==='unknown_entity'){
        state.files=state.files.filter(x=>!sameId(x.id,id));
        render();toast('云端文件接口尚未部署，已从当前页面移除');
      }else toast(authErrorText(error.code||error.message))
    }
  }));
  $('[data-jump-resources]')?.addEventListener('click',()=>{state.section='resources';render()});
  $('[data-jump-announcements]')?.addEventListener('click',()=>{state.section='announcements';render()});
  $('[data-jump-taxonomy]')?.addEventListener('click',()=>{state.section='taxonomy';render()});
  $('[data-jump-settings]')?.addEventListener('click',()=>{state.section='settings';render()});
  $('[data-save-account]')?.addEventListener('click',async()=>{const displayName=$('#accountDisplayName')?.value.trim()||state.account.displayName;try{const data=await studioApi('/auth/profile',{method:'POST',body:JSON.stringify({display_name:displayName})});state.account.displayName=data.identity?.display_name||displayName;render();toast('账号资料已同步到云端')}catch(error){toast(authErrorText(error.code||error.message))}});
  $('[data-export-config]')?.addEventListener('click',()=>{const text=JSON.stringify(buildCloudSnapshot(),null,2);navigator.clipboard?.writeText(text).then(()=>toast('配置 JSON 已复制')).catch(()=>toast('复制失败'))});
  $('[data-export-audit]')?.addEventListener('click',()=>{const text=JSON.stringify(state.audit||[],null,2);navigator.clipboard?.writeText(text).then(()=>toast('审计日志 JSON 已复制')).catch(()=>toast('复制失败'))});
}
function openResource(id){
  const x=state.resources.find(x=>sameId(x.id,id))||{id:null,title:'',subjectName:'',subjectCode:'',type:'做题本',visible:true,pinned:false,status:'草稿',versions:0,defaultVersions:false,extraVersions:[],customLinks:[],releaseVersion:'v1.0',publishedAt:'2026-09-19',updated:'2026-09-19',order:100};
  x.extraVersions=x.extraVersions||[];x.customLinks=x.customLinks||[];
  const hasDefaultVersions=x.defaultVersions ?? [1,2].includes(Number(x.id));
  const defaultVersionCards=hasDefaultVersions?(
    '<div class="version-admin-card"><div class="version-admin-head"><span class="pill blue">PDF</span><div class="grow"><strong>标准版</strong><small>下载渠道与勘误</small></div><div class="version-head-actions"><button class="btn small" data-add-custom-link>＋ 链接</button><button class="btn small">编辑版本</button></div></div><div class="version-admin-links"><button class="admin-subitem" data-open-channel><span>百度网盘</span><small>链接 / 提取码</small></button><button class="admin-subitem" data-open-channel><span>夸克网盘</span><small>链接 / 提取码</small></button><button class="admin-subitem" data-open-channel><span>直链</span><small>URL</small></button><button class="admin-subitem errata-admin-item" data-open-errata><span>勘误</span><small>0 条 · 待核对 / 已修正</small></button></div></div>'+
    '<div class="version-admin-card"><div class="version-admin-head"><span class="pill">PRINT</span><div class="grow"><strong>打印专版</strong><small>A4 · 双面 · 留空白页</small></div><div class="version-head-actions"><button class="btn small" data-add-custom-link>＋ 链接</button><button class="btn small">编辑版本</button></div></div><div class="version-admin-links"><button class="admin-subitem" data-open-channel><span>打印链接</span><small>在线打印 / 下载</small></button><button class="admin-subitem errata-admin-item" data-open-errata><span>勘误</span><small>0 条 · 待核对 / 已修正</small></button></div></div>'
  ):'';
  const customVersionCards=x.extraVersions.map(v=>{
    const linkRows=(v.links||[]).map(link=>'<div class="custom-link-row"><div><strong>'+link.label+'</strong><small>'+(link.type||'link')+' · '+(link.url||'未填 URL')+(link.code?' · '+link.code:'')+'</small></div><div class="row-actions"><span class="pill">'+(link.visible===false?'隐藏':'显示')+'</span><button class="btn small" data-edit-link="'+link.id+'" data-version-id="'+v.id+'">编辑</button><button class="icon-danger" data-delete-link="'+link.id+'" data-version-id="'+v.id+'" aria-label="删除">×</button></div></div>').join('');
    const errataCount=state.errata.filter(e=>sameId(e.resourceId,x.id)&&sameId(e.versionId,v.id)).length;
    return '<div class="version-admin-card"><div class="version-admin-head"><span class="pill blue">'+v.format+'</span><div class="grow"><strong>'+v.name+'</strong><small>'+(v.releaseVersion||x.releaseVersion||'')+' · '+(v.publishedAt||x.publishedAt||'')+(v.note?' · '+v.note:'')+'</small></div><div class="version-head-actions"><button class="btn small" data-add-custom-link data-version-id="'+v.id+'">＋ 链接</button><button class="btn small" data-edit-version="'+v.id+'">编辑版本</button><button class="icon-danger" data-delete-version="'+v.id+'" aria-label="删除版本">×</button></div></div>'+(linkRows?'<div class="custom-link-list">'+linkRows+'</div>':'')+'<button class="admin-subitem errata-admin-item" data-version-errata="'+v.id+'"><span>勘误</span><small>'+errataCount+' 条</small></button></div>'
  }).join('');
  const versions=(defaultVersionCards+customVersionCards)||'<div class="empty compact-empty"><strong>还没有版本</strong><p>先添加标准版、打印版或其他版本。</p></div>';

  const body=
    '<div class="resource-editor-hero"><div><div class="hero-badges"><span class="pill '+(x.visible?'green':'')+'">'+(x.visible?'前台显示':'前台隐藏')+'</span>'+(x.pinned?'<span class="pill blue">置顶</span>':'')+'</div><h3>'+(x.title||'新资料')+'</h3><p>'+subjectLabel(x)+' · '+x.releaseVersion+'</p></div><button class="btn small" id="previewResourceButton">预览前台</button></div>'+
    '<div class="drawer-tabs" role="tablist">'+
      '<button class="active" type="button" data-resource-tab="basic">基本信息</button>'+
      '<button type="button" data-resource-tab="versions">版本与渠道</button>'+
      '<button type="button" data-resource-tab="publish">发布设置</button>'+
    '</div>'+
    '<div class="resource-tab-panel active" data-resource-panel="basic"><div class="form-grid">'+
      '<label class="field wide"><span>标题</span><input id="dTitle" value="'+x.title+'"></label>'+
      '<label class="field"><span>科目名称</span><input id="dSubjectName" value="'+x.subjectName+'" placeholder="如：数学二"></label>'+
      '<label class="field"><span>科目代码</span><input id="dSubjectCode" value="'+x.subjectCode+'" placeholder="如：302"></label>'+
      '<label class="field"><span>资源类型</span><select id="dType"><option>'+x.type+'</option><option>书籍</option><option>讲义</option><option>真题</option><option>做题本</option></select></label>'+
      '<label class="field"><span>整理状态</span><select id="dStatus"><option>'+x.status+'</option><option>草稿</option><option>整理中</option><option>已发布</option></select></label>'+
      '<label class="field wide"><span>简介</span><textarea id="dDescription" placeholder="资源说明">'+(x.description||'')+'</textarea></label>'+
    '</div></div>'+
    '<div class="resource-tab-panel" data-resource-panel="versions"><div class="subsection-head"><div><h3>版本与获取入口</h3><p>支持任意网盘、下载站、打印店、表单或自定义链接。</p></div><button class="btn small" data-add-version>＋ 添加版本</button></div><div class="inline-list">'+versions+'</div><button class="custom-link-add" type="button" data-add-custom-link>＋ 给首个版本添加链接</button></div>'+
    '<div class="resource-tab-panel" data-resource-panel="publish"><div class="publish-settings">'+
      '<div class="setting-tile"><div><strong>前台显示</strong><small>关闭后资源不会出现在公开列表</small></div>'+toggle('preview-resource-visible','x',x.visible)+'</div>'+
      '<div class="setting-tile"><div><strong>置顶资源</strong><small>在筛选结果和最近资源中优先展示</small></div>'+pinButton('resource',x.id||'new',x.pinned)+'</div>'+
      '<div class="form-grid"><label class="field"><span>发布版本</span><input id="dReleaseVersion" value="'+x.releaseVersion+'" placeholder="如：v1.2"></label><label class="field"><span>发布日期</span><input id="dPublishedAt" type="date" value="'+x.publishedAt+'"></label><label class="field"><span>更新时间</span><input id="dUpdated" type="date" value="'+x.updated+'"></label><label class="field"><span>排序权重</span><input id="dOrder" type="number" value="'+(x.order||100)+'"></label><label class="field wide"><span>版本说明</span><textarea placeholder="本次发布更新了什么"></textarea></label></div>'+
      '<div class="design-note">发布版本、发布日期和更新时间会随资料配置同步到 Cloudflare D1。</div>'+
    '</div></div>';

  const save=()=>{
    x.title=$('#dTitle')?.value.trim()||x.title||'未命名资料';
    x.subjectName=$('#dSubjectName')?.value.trim()||x.subjectName;
    x.subjectCode=$('#dSubjectCode')?.value.trim()||x.subjectCode;
    x.type=$('#dType')?.value||x.type;
    x.description=$('#dDescription')?.value.trim()||'';
    x.status=$('#dStatus')?.value||x.status;
    x.releaseVersion=$('#dReleaseVersion')?.value.trim()||x.releaseVersion;
    x.publishedAt=$('#dPublishedAt')?.value||x.publishedAt;
    x.updated=$('#dUpdated')?.value||x.updated;
    x.order=Number($('#dOrder')?.value)||100;
    if(!x.id){x.id=Date.now();x.visible=false;x.versions=0;state.resources.push(x)}
    savePinnedResources();saveStudioCollections();render();toast(id?'资料已保存':'已创建草稿')
  };
  openDrawer(id?'编辑资料':'新建资料',body,save);

  $$('[data-resource-tab]').forEach(button=>button.onclick=()=>{
    $$('[data-resource-tab]').forEach(el=>el.classList.toggle('active',el===button));
    $$('[data-resource-panel]').forEach(panel=>panel.classList.toggle('active',panel.dataset.resourcePanel===button.dataset.resourceTab));
  });
  $$('[data-open-channel]').forEach(button=>button.onclick=()=>{const rid=ensureResourceRecord(x);openCustomLink(rid,'新增获取入口',x.extraVersions?.[0]?.id)});
  $$('[data-add-custom-link]').forEach(button=>button.onclick=()=>{const rid=ensureResourceRecord(x);openCustomLink(rid,'新增自定义链接',button.dataset.versionId||x.extraVersions?.[0]?.id)});
  $$('[data-edit-link]').forEach(button=>button.onclick=()=>openCustomLink(x.id,'编辑链接',button.dataset.versionId,button.dataset.editLink));
  $$('[data-delete-link]').forEach(button=>button.onclick=()=>confirmDelete('删除链接','删除后主页将不再显示该获取入口。',()=>{const version=x.extraVersions.find(v=>sameId(v.id,button.dataset.versionId));if(version){version.links=(version.links||[]).filter(link=>!sameId(link.id,button.dataset.deleteLink));saveStudioCollections();openResource(x.id);toast('链接已删除')}}));
  $$('[data-edit-version]').forEach(button=>button.onclick=()=>openVersionEditor(x.id,button.dataset.editVersion));
  $$('[data-delete-version]').forEach(button=>button.onclick=()=>confirmDelete('删除版本','删除后该版本的下载链接也会一并移除。',()=>{x.extraVersions=x.extraVersions.filter(v=>!sameId(v.id,button.dataset.deleteVersion));state.errata=state.errata.filter(e=>!sameId(e.versionId,button.dataset.deleteVersion));x.versions=(x.defaultVersions?2:0)+x.extraVersions.length;saveStudioCollections();openResource(x.id);toast('版本已删除')}));
  $$('[data-version-errata]').forEach(button=>button.onclick=()=>openErrataEditor(null,{resourceId:x.id,versionId:button.dataset.versionErrata}));
  $$('[data-open-errata]').forEach(button=>button.onclick=()=>openErrataEditor(null,{resourceId:x.id}));
  $('[data-add-version]')?.addEventListener('click',()=>{const rid=ensureResourceRecord(x);openVersionEditor(rid)});
  $('#previewResourceButton')?.addEventListener('click',()=>window.open('../','_blank','noopener'));
  $('#drawer [data-pin="resource"]')?.addEventListener('click',event=>{
    event.preventDefault();
    x.pinned=!x.pinned;savePinnedResources();saveStudioCollections();
    event.currentTarget.classList.toggle('active',x.pinned);
  });
  $('#drawer [data-toggle="preview-resource-visible"]')?.addEventListener('click',event=>{
    event.preventDefault();
    x.visible=!x.visible;saveStudioCollections();
    event.currentTarget.classList.toggle('on',x.visible);
  });
}
function openErrataEditor(id,preset={}){
  const existing=state.errata.find(x=>sameId(x.id,id));
  const firstResource=state.resources[0];
  const x=existing||{id:null,resourceId:preset.resourceId||firstResource?.id||'',versionId:preset.versionId||'',title:'',body:'',status:'pending',visible:false};
  const resourceOptions=state.resources.map(r=>'<option value="'+r.id+'" '+(sameId(r.id,x.resourceId)?'selected':'')+'>'+r.title+'</option>').join('');
  const versionOptions=resourceId=>{
    const resource=state.resources.find(r=>sameId(r.id,resourceId));
    return '<option value="">资源级</option>'+(resource?.extraVersions||[]).map(v=>'<option value="'+v.id+'" '+(sameId(v.id,x.versionId)?'selected':'')+'>'+v.name+' · '+(v.releaseVersion||'')+'</option>').join('')
  };
  const body='<div class="form-grid"><label class="field wide"><span>关联资源</span><select id="erResource">'+resourceOptions+'</select></label><label class="field wide"><span>关联版本</span><select id="erVersion">'+versionOptions(x.resourceId)+'</select></label><label class="field wide"><span>标题</span><input id="erTitle" value="'+x.title+'" placeholder="如：第 12 页答案更正"></label><label class="field wide"><span>说明</span><textarea id="erBody">'+x.body+'</textarea></label><label class="field"><span>状态</span><select id="erStatus"><option value="'+x.status+'">'+errataStatusLabel(x.status)+'</option><option value="pending">待核对</option><option value="confirmed">已确认</option><option value="fixed">已修正</option><option value="ignored">已忽略</option></select></label></div><div class="setting-tile" style="margin-top:12px"><div><strong>主页公开</strong><small>只有状态为“已修正”且开启后才会在公开页展示</small></div>'+toggle('draft-errata-visible','x',x.visible)+'</div>';
  openDrawer(existing?'编辑勘误':'新建勘误',body,()=>{
    x.resourceId=$('#erResource').value;
    x.versionId=$('#erVersion').value;
    x.title=$('#erTitle').value.trim()||'未命名勘误';
    x.body=$('#erBody').value.trim();
    x.status=$('#erStatus').value||'pending';
    if(!existing){x.id=Date.now();state.errata.unshift(x)}
    saveStudioCollections();render();toast(existing?'勘误已保存':'勘误已创建')
  });
  $('#erResource')?.addEventListener('change',e=>{$('#erVersion').innerHTML=versionOptions(e.target.value)});
  $('#drawer [data-toggle="draft-errata-visible"]')?.addEventListener('click',e=>{e.preventDefault();x.visible=!x.visible;e.currentTarget.classList.toggle('on',x.visible)})
}

function openAnnouncement(id){
  const x=state.announcements.find(x=>sameId(x.id,id))||{id:null,title:'',kind:'更新通知',body:'',status:'draft',visible:true,pinned:false,dismissible:true,audience:'所有访客',publishAt:'',expiresAt:'',ctaText:'',ctaUrl:'',updated:'2026-09-19'};
  const body=
    '<div class="announcement-editor-head"><span class="pill '+(x.status==='published'?'green':x.status==='scheduled'?'blue':'')+'">'+announcementStatusLabel(x)+'</span><span>'+(x.pinned?'已置顶':'普通公告')+'</span></div>'+
    '<div class="form-grid">'+
      '<label class="field wide"><span>标题</span><input id="aTitle" value="'+x.title+'"></label>'+
      '<label class="field"><span>类型</span><select id="aKind"><option>'+x.kind+'</option><option>更新通知</option><option>使用说明</option><option>维护</option><option>活动</option></select></label>'+
      '<label class="field"><span>发布状态</span><select id="aStatus"><option value="'+x.status+'">'+announcementStatusLabel(x)+'</option><option value="published">已发布</option><option value="draft">草稿</option><option value="scheduled">定时</option><option value="expired">已过期</option></select></label>'+
      '<label class="field"><span>受众</span><select id="aAudience"><option>'+x.audience+'</option><option>所有访客</option><option>仅管理员预览</option></select></label>'+
      '<label class="field"><span>展示位置</span><input value="前台总览顶部" disabled></label>'+
      '<label class="field wide"><span>正文</span><textarea id="aBody" placeholder="公告内容">'+(x.body||'')+'</textarea></label>'+
      '<label class="field"><span>发布时间</span><input id="aPublishAt" type="datetime-local" value="'+(x.publishAt||'')+'"></label>'+
      '<label class="field"><span>失效时间</span><input id="aExpiresAt" type="datetime-local" value="'+(x.expiresAt||'')+'"></label>'+
      '<label class="field"><span>按钮文字</span><input id="aCtaText" value="'+(x.ctaText||'')+'" placeholder="可选，如：查看详情"></label>'+
      '<label class="field"><span>按钮链接</span><input id="aCtaUrl" type="url" value="'+(x.ctaUrl||'')+'" placeholder="https://..."></label>'+
    '</div>'+
    '<div class="subsection announcement-settings">'+
      '<div class="setting-tile"><div><strong>前台显示</strong><small>关闭后不进入前台公告数据</small></div>'+toggle('preview-announcement-visible','a',x.visible)+'</div>'+
      '<div class="setting-tile"><div><strong>公告置顶</strong><small>总览顶部优先展示</small></div>'+pinButton('announcement',x.id||'new',x.pinned)+'</div>'+
      '<div class="setting-tile"><div><strong>允许关闭</strong><small>访客可以暂时隐藏该公告</small></div>'+toggle('preview-announcement-dismiss','b',x.dismissible)+'</div>'+
    '</div>';

  const save=()=>{
    x.title=$('#aTitle')?.value.trim()||'未命名公告';
    x.kind=$('#aKind')?.value||x.kind;
    x.status=$('#aStatus')?.value||x.status;
    x.audience=$('#aAudience')?.value||x.audience;
    x.body=$('#aBody')?.value.trim()||'';
    x.publishAt=$('#aPublishAt')?.value||'';
    x.expiresAt=$('#aExpiresAt')?.value||'';
    x.ctaText=$('#aCtaText')?.value.trim()||'';
    x.ctaUrl=$('#aCtaUrl')?.value.trim()||'';
    x.updated='2026-09-19';
    if(!id){x.id=Date.now();state.announcements.unshift(x)}
    saveAnnouncements();render();toast(id?'公告已保存':'公告已创建')
  };
  openDrawer(id?'编辑公告':'新建公告',body,save);
  $('#drawer [data-pin="announcement"]')?.addEventListener('click',event=>{
    event.preventDefault();
    x.pinned=!x.pinned;
    event.currentTarget.classList.toggle('active',x.pinned);
  });
  $('#drawer [data-toggle="preview-announcement-visible"]')?.addEventListener('click',event=>{
    event.preventDefault();
    x.visible=!x.visible;
    event.currentTarget.classList.toggle('on',x.visible);
  });
  $('#drawer [data-toggle="preview-announcement-dismiss"]')?.addEventListener('click',event=>{
    event.preventDefault();
    x.dismissible=!x.dismissible;
    event.currentTarget.classList.toggle('on',x.dismissible);
  });
}
function previewAnnouncement(id){
  const x=state.announcements.find(x=>sameId(x.id,id));if(!x)return;
  openDrawer('公告预览','<article class="announcement-preview"><div class="announcement-preview-meta"><span class="pill blue">'+x.kind+'</span>'+(x.pinned?'<span class="mini-pin">置顶</span>':'')+'</div><h2>'+x.title+'</h2><p>'+(x.body||'暂无正文')+'</p>'+(x.ctaText?'<button class="btn primary">'+x.ctaText+'</button>':'')+'<small>发布时间：'+(x.publishAt||'立即')+(x.expiresAt?' · 失效：'+x.expiresAt:'')+'</small></article>',null,true)
}
function duplicateAnnouncement(id){
  const source=state.announcements.find(x=>sameId(x.id,id));if(!source)return;
  const copy={...source,id:Date.now(),title:source.title+'（副本）',status:'draft',pinned:false,visible:false,updated:'2026-09-19'};
  state.announcements.unshift(copy);saveAnnouncements();render();toast('已复制为草稿')
}

function openExperience(id){
  const x=state.experiences.find(x=>sameId(x.id,id))||{id:null,title:'',sourceUrl:'',school:'',major:'',year:'2026',stage:'初试',author:'',body:'',visible:true};
  const body='<div class="form-grid"><label class="field wide"><span>标题</span><input id="eTitle" value="'+x.title+'"></label><label class="field wide"><span>来源链接</span><input id="eSource" type="url" value="'+x.sourceUrl+'" placeholder="https://..."></label><label class="field"><span>院校</span><input id="eSchool" value="'+x.school+'"></label><label class="field"><span>专业</span><input id="eMajor" value="'+x.major+'"></label><label class="field"><span>年份</span><input id="eYear" value="'+x.year+'"></label><label class="field"><span>阶段</span><select id="eStage"><option>'+x.stage+'</option><option>初试</option><option>复试</option><option>择校</option><option>时间规划</option></select></label><label class="field wide"><span>作者 / 来源名</span><input id="eAuthor" value="'+x.author+'"></label><label class="field wide"><span>正文 / 摘要</span><textarea id="eBody">'+x.body+'</textarea></label></div><div class="setting-tile" style="margin-top:12px"><div><strong>前台显示</strong><small>关闭后仅后台可见</small></div>'+toggle('draft-experience-visible','x',x.visible)+'</div>';
  openDrawer(id?'编辑经验贴':'新建经验贴',body,()=>{
    x.title=$('#eTitle').value.trim()||'未命名经验贴';x.sourceUrl=$('#eSource').value.trim();x.school=$('#eSchool').value.trim();x.major=$('#eMajor').value.trim();x.year=$('#eYear').value.trim();x.stage=$('#eStage').value;x.author=$('#eAuthor').value.trim();x.body=$('#eBody').value.trim();
    if(!id){x.id=Date.now();state.experiences.unshift(x)}saveStudioCollections();render();toast(id?'经验贴已保存':'经验贴已创建')
  });
  $('#drawer [data-toggle="draft-experience-visible"]')?.addEventListener('click',e=>{e.preventDefault();x.visible=!x.visible;e.currentTarget.classList.toggle('on',x.visible)})
}
function openCategory(id){
  const x=state.categories.find(x=>sameId(x.id,id))||{id:null,name:'',code:'',order:state.categories.length+1,visible:true,count:0};
  const originalName=x.name,originalCode=x.code;
  const body='<div class="form-grid"><label class="field wide"><span>科目名称</span><input id="cName" value="'+x.name+'" placeholder="如：数学二"></label><label class="field"><span>科目代码</span><input id="cCode" value="'+x.code+'" placeholder="如：302"></label><label class="field"><span>排序</span><input id="cOrder" type="number" value="'+x.order+'"></label></div><div class="setting-tile" style="margin-top:12px"><div><strong>前台显示</strong><small>关闭后不显示该科目</small></div>'+toggle('draft-category-visible','x',x.visible)+'</div>';
  openDrawer(id?'编辑科目':'新建科目',body,()=>{
    x.name=$('#cName').value.trim()||'未命名科目';x.code=$('#cCode').value.trim();x.order=Number($('#cOrder').value)||1;
    if(id){state.resources.forEach(r=>{if(r.subjectName===originalName&&r.subjectCode===originalCode){r.subjectName=x.name;r.subjectCode=x.code}})}
    if(!id){x.id=Date.now();state.categories.push(x)}saveStudioCollections();render();toast(id?'科目已保存':'科目已创建')
  });
  $('#drawer [data-toggle="draft-category-visible"]')?.addEventListener('click',e=>{e.preventDefault();x.visible=!x.visible;e.currentTarget.classList.toggle('on',x.visible)})
}
function openFile(id){
  const existing=state.files.find(x=>sameId(x.id,id));
  const x=existing?{...existing}:{id:null,name:'',kind:'PDF',mimeType:'application/pdf',url:'',usage:'',sizeBytes:0,size:'',visible:true,resourceId:'',versionId:''};
  const resourceOptions='<option value="">未关联资料</option>'+state.resources.map(r=>'<option value="'+escapeHtml(r.id)+'" '+(sameId(r.id,x.resourceId)?'selected':'')+'>'+escapeHtml(r.title)+'</option>').join('');
  const versionOptions=resourceId=>{
    const resource=state.resources.find(r=>sameId(r.id,resourceId));
    return '<option value="">未关联版本</option>'+(resource?.extraVersions||[]).map(v=>'<option value="'+escapeHtml(v.id)+'" '+(sameId(v.id,x.versionId)?'selected':'')+'>'+escapeHtml(v.name)+' · '+escapeHtml(v.releaseVersion||'')+'</option>').join('');
  };
  const body='<div class="form-grid">'+
    '<label class="field wide"><span>本地文件信息（可选）</span><input id="fLocal" type="file"><small>只读取文件名、类型和大小，不上传文件内容。</small></label>'+
    '<label class="field wide"><span>外部文件 URL</span><input id="fUrl" type="url" value="'+escapeHtml(x.url)+'" placeholder="https://..."></label>'+
    '<label class="field wide"><span>显示名称</span><input id="fName" value="'+escapeHtml(x.name)+'" placeholder="留空时使用本地文件名"></label>'+
    '<label class="field"><span>类型</span><select id="fKind"><option '+(x.kind==='PDF'?'selected':'')+'>PDF</option><option '+(x.kind==='图片'?'selected':'')+'>图片</option><option '+(x.kind==='压缩包'?'selected':'')+'>压缩包</option><option '+(x.kind==='其他'?'selected':'')+'>其他</option></select></label>'+
    '<label class="field"><span>关联资料</span><select id="fResource">'+resourceOptions+'</select></label>'+
    '<label class="field wide"><span>关联版本</span><select id="fVersion">'+versionOptions(x.resourceId)+'</select></label>'+
    '<label class="field wide"><span>用途 / 备注</span><input id="fUsage" value="'+escapeHtml(x.usage)+'" placeholder="例如：A4 打印版源文件"></label>'+
    '</div>'+
    '<div class="design-note" style="margin-top:12px">保存后元数据写入 Cloudflare D1；实际文件仍由外部 URL 提供，不会把文件字节写入 D1。</div>'+
    '<div class="setting-tile" style="margin-top:12px"><div><strong>公开</strong><small>标记该文件记录可用于公开资源</small></div>'+toggle('draft-file-visible','x',x.visible)+'</div>';
  openDrawer(id?'编辑文件':'登记文件',body,async()=>{
    const file=$('#fLocal').files?.[0];
    x.url=$('#fUrl').value.trim();
    x.name=$('#fName').value.trim()||file?.name||x.name||'未命名文件';
    x.kind=$('#fKind').value;
    x.usage=$('#fUsage').value.trim();
    x.resourceId=$('#fResource').value||'';
    x.versionId=$('#fVersion').value||'';
    if(file){x.sizeBytes=file.size;x.size=formatFileSize(file.size);x.mimeType=file.type||fileMimeFromKind(x.kind,file)}
    try{
      const saved=await persistCloudFile(x,file);
      if(saved.cloud){
        toast(id?'文件记录已同步到 D1':'文件记录已写入 D1');
        await bootstrapStudioCloud();
      }else{
        if(!x.id)x.id='file-local-'+Date.now();
        const index=state.files.findIndex(item=>sameId(item.id,x.id));
        if(index>=0)state.files[index]=x;else state.files.unshift(x);
        toast('云端文件接口尚未部署，当前记录仅保留在本次页面会话');
        render();
      }
    }catch(error){toast(authErrorText(error.code||error.message))}
  });
  $('#fResource')?.addEventListener('change',e=>{x.versionId='';$('#fVersion').innerHTML=versionOptions(e.target.value)});
  $('#drawer [data-toggle="draft-file-visible"]')?.addEventListener('click',e=>{e.preventDefault();x.visible=!x.visible;e.currentTarget.classList.toggle('on',x.visible)})
}
function ensureResourceRecord(x){
  x.extraVersions=x.extraVersions||[];x.customLinks=x.customLinks||[];
  if(!x.id){
    x.title=$('#dTitle')?.value.trim()||'未命名资料';x.subjectName=$('#dSubjectName')?.value.trim()||'';x.subjectCode=$('#dSubjectCode')?.value.trim()||'';x.type=$('#dType')?.value||'做题本';x.status='草稿';x.id=Date.now();x.defaultVersions=false;state.resources.push(x)
  }
  saveStudioCollections();return x.id
}
function openVersionEditor(resourceId,versionId){
  const resource=state.resources.find(x=>sameId(x.id,resourceId));if(!resource)return;
  resource.extraVersions=resource.extraVersions||[];
  const existing=resource.extraVersions.find(v=>sameId(v.id,versionId));
  const v=existing||{id:null,name:'',releaseVersion:resource.releaseVersion||'v1.0',publishedAt:resource.publishedAt||'2026-09-20',format:'PDF',order:100,note:'',current:true,visible:true,meta:[],links:[]};
  openDrawer(existing?'编辑版本':'新增版本','<div class="form-grid"><label class="field wide"><span>版本名称</span><input id="vName" value="'+(v.name||'')+'" placeholder="如：平板版 / 打印专版"></label><label class="field"><span>发布版本</span><input id="vReleaseVersion" value="'+(v.releaseVersion||resource.releaseVersion||'v1.0')+'" placeholder="如：v1.2"></label><label class="field"><span>发布日期</span><input id="vPublishedAt" type="date" value="'+(v.publishedAt||resource.publishedAt||'')+'"></label><label class="field"><span>格式</span><select id="vFormat"><option>'+((v.format)||'PDF')+'</option><option>PDF</option><option>HTML</option><option>ZIP</option><option>其他</option></select></label><label class="field"><span>排序</span><input id="vOrder" type="number" value="'+(v.order||100)+'"></label><label class="field wide"><span>版本说明</span><textarea id="vNote">'+(v.note||'')+'</textarea></label></div>',()=>{
    v.name=$('#vName').value.trim()||'未命名版本';
    v.releaseVersion=$('#vReleaseVersion').value.trim()||resource.releaseVersion||'v1.0';
    v.publishedAt=$('#vPublishedAt').value||resource.publishedAt||null;
    v.format=$('#vFormat').value||'PDF';
    v.order=Number($('#vOrder').value)||100;
    v.note=$('#vNote').value.trim();
    v.links=v.links||[];
    if(!existing){v.id=Date.now();resource.extraVersions.push(v)}
    resource.versions=(resource.defaultVersions?2:0)+resource.extraVersions.length;
    saveStudioCollections();openResource(resource.id);toast(existing?'版本已保存':'版本已创建')
  })
}
function openCustomLink(resourceId,title='新增自定义链接',versionId,linkId){
  const resource=state.resources.find(x=>sameId(x.id,resourceId));if(!resource)return;
  resource.extraVersions=resource.extraVersions||[];
  const version=resource.extraVersions.find(v=>sameId(v.id,versionId))||resource.extraVersions[0];
  if(!version)return toast('请先创建一个版本');
  version.links=version.links||[];
  const existing=version.links.find(link=>sameId(link.id,linkId));
  const link=existing||{id:null,label:'',type:'网盘',url:'',code:'',order:100,note:'',visible:true};
  openDrawer(title,'<div class="form-grid"><label class="field"><span>显示名称</span><input id="clName" value="'+(link.label||'')+'" placeholder="如：百度网盘 / 在线阅读"></label><label class="field"><span>链接类型</span><select id="clType"><option>'+((link.type)||'网盘')+'</option><option>网盘</option><option>直链下载</option><option>在线阅读</option><option>打印服务</option><option>表单</option><option>其他</option></select></label><label class="field wide"><span>URL</span><input id="clUrl" type="url" value="'+(link.url||'')+'" placeholder="https://..."></label><label class="field"><span>提取码 / 口令</span><input id="clCode" value="'+(link.code||'')+'"></label><label class="field"><span>排序</span><input id="clOrder" type="number" value="'+(link.order||100)+'"></label><label class="field wide"><span>说明</span><textarea id="clNote">'+(link.note||'')+'</textarea></label></div><div class="setting-tile" style="margin-top:12px"><div><strong>主页显示</strong><small>关闭后该入口保留在后台但不公开</small></div>'+toggle('draft-link-visible','x',link.visible!==false)+'</div>',()=>{
    link.label=$('#clName').value.trim()||'自定义链接';
    link.type=$('#clType').value;
    link.url=$('#clUrl').value.trim();
    link.code=$('#clCode').value.trim();
    link.order=Number($('#clOrder').value)||100;
    link.note=$('#clNote').value.trim();
    if(!existing){link.id=Date.now();version.links.push(link)}
    saveStudioCollections();openResource(resource.id);toast(existing?'链接已保存':'链接已创建')
  });
  $('#drawer [data-toggle="draft-link-visible"]')?.addEventListener('click',e=>{e.preventDefault();link.visible=link.visible===false; e.currentTarget.classList.toggle('on',link.visible)})
}
function openAdmin(id){
  const existing=state.admins.find(x=>String(x.id)===String(id));const owner=existing?.locked;
  const x=existing||{id:null,name:'',identifier:'',role:'editor',status:'active',last:'尚未登录',locked:false};
  const body='<div class="form-grid"><label class="field wide"><span>显示名称</span><input id="mName" value="'+x.name+'" '+(owner?'disabled':'')+'></label><label class="field wide"><span>登录邮箱</span><input id="mIdentifier" type="email" value="'+(x.identifier||'')+'" placeholder="name@example.com" '+(existing?'disabled':'')+'></label><label class="field"><span>角色</span><select id="mRole" '+(owner?'disabled':'')+'><option value="'+x.role+'">'+({owner:'Owner',admin:'管理员',editor:'编辑',reviewer:'审核'}[x.role]||x.role)+'</option>'+(owner?'':'<option value="admin">管理员</option><option value="editor">编辑</option><option value="reviewer">审核</option>')+'</select></label><label class="field"><span>状态</span><select id="mStatus" '+(owner?'disabled':'')+'><option value="'+x.status+'">'+(x.status==='active'?'启用':'停用')+'</option>'+(owner?'':'<option value="active">启用</option><option value="disabled">停用</option>')+'</select></label>'+
    (!owner?'<label class="field wide"><span>'+(existing?'重置密码（可留空）':'初始密码')+'</span><input id="mPassword" type="password" minlength="12" autocomplete="new-password" placeholder="至少 12 位"></label>':'')+
    '</div><div class="design-note" style="margin-top:14px">'+(owner?'Owner 不可由其他成员删除、停用或降权。':'权限由 Worker 服务端校验，不只是界面显示。')+'</div>';
  openDrawer(existing?'成员权限':'新增成员',body,owner?null:async()=>{
    const payload={display_name:$('#mName').value.trim()||'未命名成员',role:$('#mRole').value,status:$('#mStatus').value};
    if(!existing){payload.email=$('#mIdentifier').value.trim();payload.password=$('#mPassword').value}
    else if($('#mPassword')?.value)payload.password=$('#mPassword').value;
    try{
      await studioApi(existing?'/admin/accounts/'+encodeURIComponent(existing.identifier):'/admin/accounts',{method:existing?'PUT':'POST',body:JSON.stringify(payload)});
      toast(existing?'成员已保存':'成员已创建');await bootstrapStudioCloud();
    }catch(error){toast(authErrorText(error.code||error.message))}
  },owner)
}
function openPasswordEditor(){
  openDrawer('修改密码','<div class="form-grid"><label class="field wide"><span>当前密码</span><input id="pwCurrent" type="password" autocomplete="current-password"></label><label class="field wide"><span>新密码</span><input id="pwNew" type="password" minlength="12" autocomplete="new-password"></label><label class="field wide"><span>确认新密码</span><input id="pwNew2" type="password" minlength="12" autocomplete="new-password"></label></div><div class="design-note" style="margin-top:12px">修改后会注销该账号的所有现有会话，需要重新登录。</div>',async()=>{
    if($('#pwNew').value!==$('#pwNew2').value)return toast('两次新密码不一致');
    try{
      await studioApi('/auth/change-password',{method:'POST',body:JSON.stringify({current_password:$('#pwCurrent').value,new_password:$('#pwNew').value})});
      toast('密码已修改，请重新登录');cloudState.status='auth';renderAuthGate('login',{needs_setup:false});
    }catch(error){toast(authErrorText(error.code||error.message))}
  })
}

function openSimple(title,fields){openDrawer(title,'<div class="design-note">'+fields+'</div><div class="form-grid" style="margin-top:14px"><label class="field wide"><span>名称 / 标题</span><input></label><label class="field wide"><span>说明</span><textarea></textarea></label></div>',()=>toast('已保存'))}
function openDrawer(title,body,onSave,readOnly=false){
  $('#drawer').innerHTML='<header class="drawer-head"><h2>'+title+'</h2><button class="icon-btn" data-drawer-close>'+icon('x')+'</button></header><div class="drawer-body">'+body+'</div><footer class="drawer-foot"><button class="btn subtle" data-drawer-close>取消</button><div>'+(readOnly?'':'<button class="btn primary" data-drawer-save>保存</button>')+'</div></footer>';
  $('#drawer').hidden=false;$('#drawerBackdrop').hidden=false;$$('[data-drawer-close]').forEach(b=>b.onclick=closeDrawer);$('[data-drawer-save]')?.addEventListener('click',()=>{closeDrawer();onSave?.()})
}
function closeDrawer(){$('#drawer').hidden=true;$('#drawerBackdrop').hidden=true}
$('#drawerBackdrop').onclick=closeDrawer;
function confirmDelete(title,copy,onConfirm){
  $('#confirmModal').innerHTML='<h3>'+title+'</h3><p>'+copy+'</p><div class="confirm-actions"><button class="btn" data-confirm-cancel>取消</button><button class="btn danger" data-confirm-ok>确认删除</button></div>';
  $('#confirmModal').hidden=false;$('#modalBackdrop').hidden=false;$('[data-confirm-cancel]').onclick=closeConfirm;$('[data-confirm-ok]').onclick=()=>{onConfirm();closeConfirm()}
}
function closeConfirm(){$('#confirmModal').hidden=true;$('#modalBackdrop').hidden=true}
$('#modalBackdrop').onclick=closeConfirm;
function toast(msg){const el=document.createElement('div');el.className='toast';el.textContent=msg;$('#toastStack').appendChild(el);setTimeout(()=>el.remove(),2200)}
function openSide(){$('.sidebar').classList.add('open');$('#sideBackdrop').hidden=false}
function closeSide(){$('.sidebar').classList.remove('open');$('#sideBackdrop').hidden=true}
$('#sideOpen').onclick=openSide;$('#sideClose').onclick=closeSide;$('#sideBackdrop').onclick=closeSide;
$('#openPublic').onclick=()=>window.open('../','_blank','noopener');
$('#accountEntry').onclick=()=>{state.section='account';render();closeSide()};
$('#logoutButton')?.addEventListener('click',async()=>{try{await studioApi('/auth/logout',{method:'POST'})}catch{}cloudState.status='auth';renderAuthGate('login',{needs_setup:false})});
$('#globalSearch')?.addEventListener('input',renderGlobalSearchResults);
$('#globalSearch')?.addEventListener('focus',()=>{if($('#globalSearch').value.trim())renderGlobalSearchResults()});
document.addEventListener('pointerdown',event=>{if(!event.target.closest('.global-search-wrap'))closeGlobalSearch()});
document.addEventListener('keydown',e=>{
  if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();$('#globalSearch').focus();$('#globalSearch').select()}
  if(e.key==='Escape'){closeGlobalSearch();closeDrawer();closeConfirm();closeSide()}
});
bootstrapStudioCloud();

window.addEventListener('error',event=>{
  if(!document.body.classList.contains('auth-locked'))return;
  try{
    renderAuthGate('login',{},'后台脚本初始化异常，请重新登录。');
    console.error('Studio boot error:',event.error||event.message);
  }catch{}
});
window.addEventListener('unhandledrejection',event=>{
  if(!document.body.classList.contains('auth-locked'))return;
  try{
    renderAuthGate('login',{},'后台初始化请求异常，请重新登录。');
    console.error('Studio boot rejection:',event.reason);
  }catch{}
});

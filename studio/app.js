const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
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
  account:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'
};
function icon(name){return '<svg viewBox="0 0 24 24" aria-hidden="true">'+(ICONS[name]||ICONS.box)+'</svg>'}
$$('[data-icon]').forEach(el=>el.innerHTML=icon(el.dataset.icon));

const pinnedResourceTitles=new Set(JSON.parse(localStorage.getItem('yanku-pinned-resource-titles')||'[]'));
const pinnedAnnouncementTitles=new Set(JSON.parse(localStorage.getItem('yanku-pinned-announcement-titles')||'[]'));
const storedAnnouncements=JSON.parse(localStorage.getItem('yanku-announcements-v2')||'null');

const state={
  section:'overview',
  resources:[
    {id:1,key:'408-workbook',title:'408 做题本',subjectName:'计算机学科专业基础',subjectCode:'408',type:'做题本',versions:2,releaseVersion:'v1.0',publishedAt:'2026-09-19',visible:true,pinned:pinnedResourceTitles.has('408 做题本'),status:'整理中',updated:'2026-09-19'},
    {id:2,key:'math2-workbook',title:'数学二做题本',subjectName:'数学二',subjectCode:'302',type:'做题本',versions:2,releaseVersion:'v1.0',publishedAt:'2026-09-19',visible:true,pinned:pinnedResourceTitles.has('数学二做题本'),status:'整理中',updated:'2026-09-19'}
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
  account:{displayName:'主管理员',username:'owner',email:'',role:'Owner',mfa:false,lastLogin:'当前会话'},
  settings:{resources:true,experience:true,siteName:'研库',siteDescription:'考研学习资源索引与分发',errataSubmitUrl:localStorage.getItem('yanku-errata-submit-url')||''}
};
const navGroups=[
  {label:'内容',items:[['overview','概览','home'],['resources','资料','box'],['experience','经验贴','article'],['announcements','公告','bell']]},
  {label:'资源管理',items:[['taxonomy','科目管理','tag'],['files','文件','folder']]},
  {label:'系统',items:[['account','账号中心','account'],['admins','成员与权限','users'],['settings','站点设置','settings'],['audit','审计日志','audit']]}
];
const titles={overview:['OVERVIEW','概览'],resources:['RESOURCES','资料'],experience:['EXPERIENCE','经验贴'],announcements:['ANNOUNCEMENTS','公告'],taxonomy:['SUBJECTS','科目管理'],files:['MEDIA','文件'],account:['ACCOUNT','账号中心'],admins:['ACCESS','成员与权限'],settings:['SETTINGS','站点设置'],audit:['AUDIT','审计日志']};
function subjectLabel(item){return item.subjectName+(item.subjectCode?'（'+item.subjectCode+'）':'')}
function savePinnedResources(){localStorage.setItem('yanku-pinned-resource-titles',JSON.stringify(state.resources.filter(x=>x.pinned).map(x=>x.title)))}
function savePinnedAnnouncements(){localStorage.setItem('yanku-pinned-announcement-titles',JSON.stringify(state.announcements.filter(x=>x.pinned).map(x=>x.title)))}
function saveAnnouncements(){localStorage.setItem('yanku-announcements-v2',JSON.stringify(state.announcements));savePinnedAnnouncements()}
function announcementStatusLabel(x){if(x.status==='draft')return '草稿';if(x.status==='scheduled')return '定时';if(x.status==='expired')return '已过期';return '已发布'}
function pinButton(scope,id,on){return '<button class="pin-control '+(on?'active':'')+'" type="button" data-pin="'+scope+'" data-id="'+id+'" aria-label="'+(on?'取消置顶':'置顶')+'"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6l1 6 3 3v2H5v-2l3-3Z"/><path d="M12 14v7"/></svg></button>'}
function renderNav(){
  $('#nav').innerHTML=navGroups.map(g=>'<div class="nav-group">'+g.label+'</div>'+g.items.map(([id,label,ic])=>'<button class="nav-item '+(state.section===id?'active':'')+'" data-section="'+id+'">'+icon(ic)+'<span>'+label+'</span>'+badge(id)+'</button>').join('')).join('');
  $$('#nav [data-section]').forEach(b=>b.onclick=()=>{state.section=b.dataset.section;render();closeSide()});
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
    '<div><span class="status-dot preview"></span><p><small>数据源</small><strong>本地预览</strong></p></div>'+
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
      state.resources.slice().sort((a,b)=>Number(b.pinned)-Number(a.pinned)).map(x=>'<button class="overview-resource-row" type="button" data-edit-resource="'+x.id+'"><span class="resource-dot"></span><span><strong>'+x.title+(x.pinned?' <span class="mini-pin">置顶</span>':'')+'</strong><small>'+x.category+' · '+x.subject+' · '+x.versions+' 个版本</small></span><span class="pill '+(x.visible?'green':'')+'">'+(x.visible?'显示':'隐藏')+'</span></button>').join('')+
    '</div></div></section>'+
  '</div>'+
  '<section class="card quick-card"><div class="card-head"><div><h2>快捷操作</h2><p>常用管理入口</p></div></div><div class="quick-actions-grid">'+
    '<button type="button" data-new-resource>'+icon('plus')+'<span><strong>新建资料</strong><small>创建资源与版本</small></span></button>'+
    '<button type="button" data-new-announcement>'+icon('bell')+'<span><strong>发布公告</strong><small>显示在前台总览</small></span></button>'+
    '<button type="button" data-jump-taxonomy>'+icon('tag')+'<span><strong>分类与科目</strong><small>管理目录层级</small></span></button>'+
    '<button type="button" data-jump-settings>'+icon('settings')+'<span><strong>站点设置</strong><small>链接与显示策略</small></span></button>'+
  '</div></section>'
}
function settingRow(k){const labels={resources:'资料',experience:'经验贴',errata:'勘误',notice:'公告'};return '<div class="list-row"><div><strong>'+labels[k]+'</strong><small>前台栏目</small></div>'+toggle('settings',k,state.settings[k])+'</div>'}
function toggle(scope,id,on){return '<button class="switch '+(on?'on':'')+'" data-toggle="'+scope+'" data-id="'+id+'" aria-label="切换显示"><i></i></button>'}
function renderResources(){
  const visible=state.resources.filter(x=>x.visible).length;
  const hidden=state.resources.length-visible;
  const rows=state.resources.slice().sort((a,b)=>Number(b.pinned)-Number(a.pinned)).map(x=>'<tr>'+
    '<td class="resource-main-cell"><div class="title-cell resource-title-cell"><span class="resource-table-icon">'+icon('box')+'</span><span><strong>'+x.title+(x.pinned?' <span class="mini-pin">置顶</span>':'')+'</strong><small>#'+x.id+' · '+x.releaseVersion+'</small></span></div></td>'+
    '<td class="subject-cell"><strong>'+subjectLabel(x)+'</strong></td>'+
    '<td class="type-cell"><span class="pill">'+x.type+'</span></td>'+
    '<td class="release-cell"><strong>'+x.releaseVersion+'</strong><small class="cell-sub">'+x.publishedAt+'</small></td>'+
    '<td class="version-cell"><strong>'+x.versions+'</strong><small class="cell-sub"> 个版本</small></td>'+
    '<td class="toggle-cell">'+toggle('resource',x.id,x.visible)+'</td>'+
    '<td class="pin-cell">'+pinButton('resource',x.id,x.pinned)+'</td>'+
    '<td class="status-cell"><span class="pill orange">'+x.status+'</span></td>'+
    '<td class="actions-cell"><div class="row-actions"><button class="btn small" data-edit-resource="'+x.id+'">编辑</button><button class="icon-danger" aria-label="删除" data-delete-resource="'+x.id+'">×</button></div></td>'+
  '</tr>').join('');
  return head('资料','统一管理资料本体、科目、发布版本、下载入口、打印与勘误。','<button class="btn primary page-create" data-new-resource>＋ 新建资料</button>')+
  '<section class="resource-summary"><button class="summary-chip active"><strong>'+state.resources.length+'</strong><span>全部</span></button><button class="summary-chip"><strong>'+visible+'</strong><span>显示</span></button><button class="summary-chip"><strong>'+hidden+'</strong><span>隐藏</span></button><button class="summary-chip"><strong>'+state.resources.filter(x=>x.pinned).length+'</strong><span>置顶</span></button></section>'+
  '<section class="card data-card"><div class="toolbar"><label class="table-search">'+icon('search')+'<input class="control grow" placeholder="搜索标题、科目或代码"></label><div class="toolbar-spacer"></div><select class="control"><option>全部类型</option><option>做题本</option><option>书籍</option><option>讲义</option><option>真题</option></select><select class="control"><option>全部状态</option><option>显示</option><option>隐藏</option></select></div><div class="table-wrap"><table class="table resource-table"><thead><tr><th>资源</th><th>科目</th><th>类型</th><th>发布版本 / 日期</th><th>版本数</th><th>显示</th><th>置顶</th><th>状态</th><th></th></tr></thead><tbody>'+rows+'</tbody></table></div></section>'
}
function renderExperience(){
  return head('经验贴','按院校、专业、年份和阶段整理，并保留原始来源。','<button class="btn primary" data-new-experience>＋ 新建经验贴</button>')+
  '<section class="card"><div class="toolbar"><input class="control grow" placeholder="搜索标题、院校、专业或作者"><select class="control"><option>全部阶段</option><option>初试</option><option>复试</option><option>择校</option></select></div><div class="empty"><strong>暂无经验贴</strong><p>接入数据后，这里支持编辑、隐藏、删除、来源链接和抓取状态。</p></div></section>'
}
function renderErrata(){
  return head('勘误','将问题关联到具体资源、版本、页码或题号，并跟踪处理状态。','<button class="btn primary" data-new-errata>＋ 新建勘误</button>')+
  '<div class="metric-grid">'+metric('待核对','0','尚未确认')+metric('已确认','0','等待修正')+metric('已修正','0','公开记录')+metric('已忽略','0','保留原因')+'</div>'+
  '<section class="card"><div class="toolbar"><input class="control grow" placeholder="搜索资源、题号或问题"><select class="control"><option>全部状态</option><option>待核对</option><option>已确认</option><option>已修正</option><option>已忽略</option></select></div><div class="empty"><strong>暂无勘误</strong><p>后续用户提交和后台人工创建都会进入这里。</p></div></section>'
}
function renderAnnouncements(){
  const published=state.announcements.filter(x=>x.status==='published').length;
  const drafts=state.announcements.filter(x=>x.status==='draft').length;
  const scheduled=state.announcements.filter(x=>x.status==='scheduled').length;
  const rows=state.announcements.slice().sort((a,b)=>Number(b.pinned)-Number(a.pinned)||String(b.updated).localeCompare(String(a.updated))).map(x=>
    '<tr>'+
      '<td class="select-cell"><input class="row-check" type="checkbox" data-select-announcement="'+x.id+'" '+(state.announcementSelection.has(x.id)?'checked':'')+'></td>'+
      '<td><div class="title-cell"><strong>'+x.title+(x.pinned?' <span class="mini-pin">置顶</span>':'')+'</strong><small>'+x.kind+' · '+x.audience+'</small></div></td>'+
      '<td><span class="pill '+(x.status==='published'?'green':x.status==='scheduled'?'blue':x.status==='draft'?'':'orange')+'">'+announcementStatusLabel(x)+'</span></td>'+
      '<td>'+pinButton('announcement',x.id,x.pinned)+'</td>'+
      '<td>'+toggle('announcement',x.id,x.visible)+'</td>'+
      '<td><div class="announcement-time"><strong>'+((x.publishAt||'').replace('T',' ')||'立即')+'</strong><small>'+(x.expiresAt?'至 '+x.expiresAt.replace('T',' '):'长期有效')+'</small></div></td>'+
      '<td><div class="row-actions"><button class="btn small" data-preview-announcement="'+x.id+'">预览</button><button class="btn small" data-edit-announcement="'+x.id+'">编辑</button><button class="btn small" data-duplicate-announcement="'+x.id+'">复制</button><button class="icon-danger" aria-label="删除" data-delete-announcement="'+x.id+'">×</button></div></td>'+
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
function renderTaxonomy(){
  const rows=state.categories.map(x=>'<tr><td><strong>'+x.name+'</strong><small class="cell-sub">（'+x.code+'）</small></td><td>'+x.count+'</td><td>'+x.order+'</td><td>'+toggle('category',x.id,x.visible)+'</td><td><div class="row-actions"><button class="btn small" data-edit-category="'+x.id+'">编辑</button><button class="btn small danger" data-delete-category="'+x.id+'">删除</button></div></td></tr>').join('');
  return head('科目管理','统一使用「科目名称（科目代码）」；不再维护“公共课 / 专业课”这种上级分类。','<button class="btn primary" data-new-category>＋ 新建科目</button>')+
  '<section class="card"><div class="table-wrap"><table class="table"><thead><tr><th>科目</th><th>资源数</th><th>排序</th><th>显示</th><th></th></tr></thead><tbody>'+rows+'</tbody></table></div></section>'
}
function renderFiles(){
  return head('文件','统一管理封面、PDF、图片和其他附件，可替换、隐藏或删除。','<button class="btn primary" data-upload>＋ 上传文件</button>')+
  '<section class="card"><div class="toolbar"><input class="control grow" placeholder="搜索文件名或资源"><select class="control"><option>全部文件</option><option>PDF</option><option>图片</option></select></div><div class="empty"><strong>尚未接入文件存储</strong><p>后续接 Storage 后可查看大小、引用资源、公开状态、替换与删除。</p></div></section>'
}
function renderAccount(){
  const a=state.account;
  return head('账号中心','管理当前账号资料、安全选项与会话。','<button class="btn primary" data-save-account>保存账号</button>')+
  '<div class="grid two account-grid">'+
    '<section class="card"><div class="card-head"><div><h2>账号资料</h2><p>当前工作台身份</p></div></div><div class="card-body"><div class="account-profile"><span class="account-avatar">主</span><div><strong>'+a.displayName+'</strong><small>'+a.role+' · '+a.username+'</small></div></div><div class="form-grid" style="margin-top:14px"><label class="field wide"><span>显示名称</span><input id="accountDisplayName" value="'+a.displayName+'"></label><label class="field"><span>用户名</span><input id="accountUsername" value="'+a.username+'"></label><label class="field"><span>邮箱</span><input id="accountEmail" type="email" placeholder="name@example.com" value="'+a.email+'"></label></div></div></section>'+
    '<section class="card"><div class="card-head"><div><h2>安全</h2><p>正式接入身份服务后生效</p></div></div><div class="card-body"><div class="list"><div class="list-row"><div><strong>修改密码</strong><small>设置新的后台访问密码</small></div><button class="btn small" data-account-password>修改</button></div><div class="list-row"><div><strong>两步验证</strong><small>建议主管理员开启</small></div>'+toggle('preview-account-mfa','mfa',a.mfa)+'</div><div class="list-row"><div><strong>恢复代码</strong><small>用于无法使用验证器时恢复账号</small></div><button class="btn small">生成</button></div></div></div></section>'+
  '</div>'+
  '<section class="card" style="margin-top:14px"><div class="card-head"><div><h2>登录会话</h2><p>查看并管理已登录设备</p></div><button class="btn small danger">退出其他会话</button></div><div class="card-body"><div class="session-row"><span class="session-device">'+icon('account')+'</span><div><strong>当前设备</strong><small>当前会话 · 最近活动刚刚</small></div><span class="pill green">当前</span></div></div></section>'+
  '<div class="design-note" style="margin-top:14px">当前仍为无验证预览版。接入服务器后，这里将与登录、密码哈希、会话、2FA 和管理员权限系统连接。</div>'
}
function renderAdmins(){
  const rows=state.admins.map(x=>'<tr><td><div class="title-cell"><strong>'+x.name+'</strong><small>'+(x.locked?'当前主管理员':'授权成员')+'</small></div></td><td><span class="pill blue">'+(x.role==='owner'?'Owner':'Admin')+'</span></td><td><span class="pill green">'+(x.status==='active'?'启用':'停用')+'</span></td><td>'+x.last+'</td><td><div class="row-actions"><button class="btn small" data-edit-admin="'+x.id+'">'+(x.locked?'查看权限':'编辑')+'</button><button class="btn small danger" '+(x.locked?'disabled':'')+' data-delete-admin="'+x.id+'">删除</button></div></td></tr>').join('');
  return head('成员与权限','主管理员拥有全部权限，可创建多个管理员并逐项授权。','<button class="btn primary" data-new-admin>＋ 新增成员</button>')+
  '<section class="card"><div class="table-wrap"><table class="table"><thead><tr><th>成员</th><th>角色</th><th>状态</th><th>最近活动</th><th></th></tr></thead><tbody>'+rows+'</tbody></table></div></section>'+
  '<section class="card" style="margin-top:14px"><div class="card-head"><div><h2>权限矩阵</h2><p>Owner 始终拥有全部权限，不允许其他角色修改 Owner。</p></div></div><div class="card-body">'+permissionMatrix()+'</div></section>'
}
function permissionMatrix(){
  const rows=[['资料 / 渠道 / 勘误',1,1,1,1],['经验贴管理',1,1,1,0],['公告管理',1,1,0,0],['文件管理',1,1,1,0],['分类管理',1,1,0,0],['成员与权限',1,0,0,0],['站点设置',1,0,0,0],['审计日志',1,1,0,1]];
  let h='<div class="permission-grid"><div class="head">权限</div><div class="head">Owner</div><div class="head">管理员</div><div class="head">编辑</div><div class="head">审核</div>';
  rows.forEach(r=>{h+='<div>'+r[0]+'</div>'+r.slice(1).map(v=>'<div class="'+(v?'yes':'no')+'">'+(v?'✓':'—')+'</div>').join('')});return h+'</div>'
}
function renderSettings(){
  return head('站点设置','控制公开站点的名称、说明、栏目、默认排序和整体显示。','<button class="btn primary" data-save-settings>保存设置</button>')+
  '<div class="grid two"><section class="card"><div class="card-head"><div><h2>基础信息</h2><p>前台公开信息</p></div></div><div class="card-body"><div class="form-grid"><label class="field wide"><span>站点名称</span><input value="'+state.settings.siteName+'"></label><label class="field wide"><span>站点说明</span><textarea>'+state.settings.siteDescription+'</textarea></label></div></div></section>'+
  '<section class="card"><div class="card-head"><div><h2>栏目显示</h2><p>关闭后前台不加载该栏目</p></div></div><div class="card-body"><div class="list">'+['resources','experience'].map(k=>settingRow(k)).join('')+'</div></div></section></div>'+
  '<section class="card" style="margin-top:14px"><div class="card-head"><div><h2>交互链接</h2><p>统一配置前台需要跳转到外部页面的入口</p></div></div><div class="card-body"><div class="form-grid"><label class="field wide"><span>勘误申请提交链接</span><input id="errataSubmitUrlInput" type="url" placeholder="https://..." value="'+state.settings.errataSubmitUrl+'"></label><div class="field wide"><span>说明</span><div class="design-note">前台每个资料版本的「勘误」旁会显示「申请提交」。当前预览版保存到本浏览器，接入服务器后改为数据库配置。</div></div></div></div></section>'+
  '<section class="card" style="margin-top:14px"><div class="card-head"><div><h2>危险操作</h2><p>全站级操作必须由主管理员执行</p></div></div><div class="card-body"><div class="list-row"><div><strong>导出全部配置</strong><small>不包含密钥与身份凭据</small></div><button class="btn small">导出</button></div><div class="list-row"><div><strong>清空演示数据</strong><small>接入服务器后要求二次确认</small></div><button class="btn small danger">清空</button></div></div></section>'
}
function settingRow(k){const labels={resources:'资料栏目',experience:'经验贴栏目'};return '<div class="list-row"><div><strong>'+labels[k]+'</strong><small>前台显示</small></div>'+toggle('settings',k,state.settings[k])+'</div>'}
function renderAudit(){
  return head('审计日志','记录高权限操作，包括创建、修改、删除、隐藏、权限变更和文件操作。','<button class="btn" type="button">导出日志</button>')+
  '<section class="card"><div class="toolbar"><input class="control grow" placeholder="搜索动作、对象或成员"><select class="control"><option>全部操作</option><option>内容</option><option>权限</option><option>文件</option><option>系统</option></select></div><div class="table-wrap"><table class="table"><thead><tr><th>时间</th><th>成员</th><th>动作</th><th>对象</th><th>结果</th></tr></thead><tbody><tr><td>2026-09-19</td><td>主管理员</td><td>初始化 Studio</td><td>管理界面</td><td><span class="pill green">成功</span></td></tr></tbody></table></div></section>'
}
function render(){
  renderNav(); const [ey,title]=titles[state.section]; $('#topEyebrow').textContent=ey;$('#topTitle').textContent=title;
  const r={overview:renderOverview,resources:renderResources,experience:renderExperience,announcements:renderAnnouncements,taxonomy:renderTaxonomy,files:renderFiles,account:renderAccount,admins:renderAdmins,settings:renderSettings,audit:renderAudit}[state.section];
  $('#panelHost').innerHTML=r(); bind();
}
function bind(){
  $('[data-pin]').forEach(button=>button.onclick=event=>{event.stopPropagation();const scope=button.dataset.pin,id=button.dataset.id;if(scope==='resource'){const item=state.resources.find(x=>x.id==id);if(item){item.pinned=!item.pinned;savePinnedResources()}}if(scope==='announcement'){const item=state.announcements.find(x=>x.id==id);if(item){item.pinned=!item.pinned;saveAnnouncements()}}render();toast('置顶状态已更新（预览）')});
  $('[data-toggle]').forEach(b=>b.onclick=()=>{const s=b.dataset.toggle,id=b.dataset.id;if(s==='settings')state.settings[id]=!state.settings[id];if(s==='resource'){const x=state.resources.find(x=>x.id==id);x.visible=!x.visible}if(s==='announcement'){const x=state.announcements.find(x=>x.id==id);x.visible=!x.visible;saveAnnouncements()}if(s==='category'){const x=state.categories.find(x=>x.id==id);x.visible=!x.visible}render();toast('状态已更新（预览）')});
  $$('[data-edit-resource]').forEach(b=>b.onclick=()=>openResource(Number(b.dataset.editResource)));
  $('[data-new-resource]')?.addEventListener('click',()=>openResource());
  $$('[data-delete-resource]').forEach(b=>b.onclick=()=>confirmDelete('删除资料','删除后将同时移除版本与渠道。',()=>{state.resources=state.resources.filter(x=>x.id!=b.dataset.deleteResource);render();toast('已删除（预览）')}));
  $('[data-select-announcement]').forEach(b=>b.onchange=()=>{const id=Number(b.dataset.selectAnnouncement);b.checked?state.announcementSelection.add(id):state.announcementSelection.delete(id);render()});
  $('#selectAllAnnouncements')?.addEventListener('change',e=>{state.announcementSelection=new Set(e.target.checked?state.announcements.map(x=>x.id):[]);render()});
  $('[data-announcement-bulk]').forEach(b=>b.onclick=()=>{
    const action=b.dataset.announcementBulk;
    if(action==='delete'){state.announcements=state.announcements.filter(x=>!state.announcementSelection.has(x.id))}
    else state.announcements.forEach(x=>{if(state.announcementSelection.has(x.id)){if(action==='show')x.visible=true;if(action==='hide')x.visible=false;if(action==='publish'){x.status='published';x.visible=true}}});
    state.announcementSelection.clear();saveAnnouncements();render();toast('批量操作已完成（预览）')
  });
  $('[data-edit-announcement]').forEach(b=>b.onclick=()=>openAnnouncement(Number(b.dataset.editAnnouncement)));
  $('[data-preview-announcement]').forEach(b=>b.onclick=()=>previewAnnouncement(Number(b.dataset.previewAnnouncement)));
  $('[data-duplicate-announcement]').forEach(b=>b.onclick=()=>duplicateAnnouncement(Number(b.dataset.duplicateAnnouncement)));
  $('[data-new-announcement]')?.addEventListener('click',()=>openAnnouncement());
  $$('[data-delete-announcement]').forEach(b=>b.onclick=()=>confirmDelete('删除公告','该公告将不再出现在前台。',()=>{state.announcements=state.announcements.filter(x=>x.id!=b.dataset.deleteAnnouncement);saveAnnouncements();render();toast('已删除（预览）')}));
  $('[data-new-admin]')?.addEventListener('click',openAdmin);
  $$('[data-edit-admin]').forEach(b=>b.onclick=()=>openAdmin(Number(b.dataset.editAdmin)));
  $('[data-save-settings]')?.addEventListener('click',()=>{
    const input=$('#errataSubmitUrlInput');
    if(input){
      state.settings.errataSubmitUrl=input.value.trim();
      localStorage.setItem('yanku-errata-submit-url',state.settings.errataSubmitUrl);
    }
    toast('设置已保存（预览）');
  });
  $('[data-new-experience]')?.addEventListener('click',()=>openSimple('新建经验贴','标题、来源、院校、专业、年份、阶段、正文、显示状态'));
  $('[data-new-errata]')?.addEventListener('click',()=>openSimple('新建勘误','关联资源、版本、页码/题号、问题类型、说明、状态、是否公开'));
  $('[data-new-category]')?.addEventListener('click',()=>openSimple('新建科目','科目名称、科目代码、排序、显示状态'));
  $('[data-upload]')?.addEventListener('click',()=>openSimple('上传文件','文件、用途、关联资源、公开状态、替换策略'));
  $('[data-jump-resources]')?.addEventListener('click',()=>{state.section='resources';render()});
  $('[data-jump-announcements]')?.addEventListener('click',()=>{state.section='announcements';render()});
  $('[data-jump-taxonomy]')?.addEventListener('click',()=>{state.section='taxonomy';render()});
  $('[data-jump-settings]')?.addEventListener('click',()=>{state.section='settings';render()});
  $('[data-save-account]')?.addEventListener('click',()=>{state.account.displayName=$('#accountDisplayName')?.value.trim()||state.account.displayName;state.account.username=$('#accountUsername')?.value.trim()||state.account.username;state.account.email=$('#accountEmail')?.value.trim()||state.account.email;render();toast('账号资料已保存（预览）')});
  $('[data-account-password]')?.addEventListener('click',()=>openSimple('修改密码','当前密码、新密码、确认新密码；正式接入身份服务后启用'));
}
function openResource(id){
  const x=state.resources.find(x=>x.id===id)||{title:'',subjectName:'',subjectCode:'',type:'做题本',visible:true,pinned:false,status:'草稿',versions:0,releaseVersion:'v1.0',publishedAt:'2026-09-19',updated:'2026-09-19'};
  const versions=x.versions?(
    '<div class="version-admin-card">'+
      '<div class="version-admin-head"><span class="pill blue">PDF</span><div class="grow"><strong>标准版</strong><small>下载渠道与勘误</small></div><div class="version-head-actions"><button class="btn small" data-add-custom-link>＋ 链接</button><button class="btn small">编辑版本</button><button class="icon-danger">×</button></div></div>'+
      '<div class="version-admin-links">'+
        '<button class="admin-subitem" data-open-channel><span>百度网盘</span><small>链接 / 提取码</small></button>'+
        '<button class="admin-subitem" data-open-channel><span>夸克网盘</span><small>链接 / 提取码</small></button>'+
        '<button class="admin-subitem" data-open-channel><span>直链</span><small>URL</small></button>'+
        '<button class="admin-subitem errata-admin-item" data-open-errata><span>勘误</span><small>0 条 · 待核对 / 已修正</small></button>'+
      '</div>'+
    '</div>'+
    '<div class="version-admin-card">'+
      '<div class="version-admin-head"><span class="pill">PRINT</span><div class="grow"><strong>打印专版</strong><small>A4 · 双面 · 留空白页</small></div><div class="version-head-actions"><button class="btn small" data-add-custom-link>＋ 链接</button><button class="btn small">编辑版本</button><button class="icon-danger">×</button></div></div>'+
      '<div class="version-admin-links">'+
        '<button class="admin-subitem" data-open-channel><span>打印链接</span><small>在线打印 / 下载</small></button>'+
        '<button class="admin-subitem errata-admin-item" data-open-errata><span>勘误</span><small>0 条 · 待核对 / 已修正</small></button>'+
      '</div>'+
    '</div>'
  ):'<div class="empty compact-empty"><strong>还没有版本</strong><p>先添加标准版、打印版或其他版本。</p></div>';

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
      '<label class="field wide"><span>简介</span><textarea placeholder="资源说明"></textarea></label>'+
    '</div></div>'+
    '<div class="resource-tab-panel" data-resource-panel="versions"><div class="subsection-head"><div><h3>版本与获取入口</h3><p>支持任意网盘、下载站、打印店、表单或自定义链接。</p></div><button class="btn small" data-add-version>＋ 添加版本</button></div><div class="inline-list">'+versions+'</div><button class="custom-link-add" type="button" data-add-custom-link>＋ 添加其他自定义链接</button></div>'+
    '<div class="resource-tab-panel" data-resource-panel="publish"><div class="publish-settings">'+
      '<div class="setting-tile"><div><strong>前台显示</strong><small>关闭后资源不会出现在公开列表</small></div>'+toggle('preview-resource-visible','x',x.visible)+'</div>'+
      '<div class="setting-tile"><div><strong>置顶资源</strong><small>在筛选结果和最近资源中优先展示</small></div>'+pinButton('resource',x.id||'new',x.pinned)+'</div>'+
      '<div class="form-grid"><label class="field"><span>发布版本</span><input id="dReleaseVersion" value="'+x.releaseVersion+'" placeholder="如：v1.2"></label><label class="field"><span>发布日期</span><input id="dPublishedAt" type="date" value="'+x.publishedAt+'"></label><label class="field"><span>更新时间</span><input id="dUpdated" type="date" value="'+x.updated+'"></label><label class="field"><span>排序权重</span><input type="number" value="100"></label><label class="field wide"><span>版本说明</span><textarea placeholder="本次发布更新了什么"></textarea></label></div>'+
      '<div class="design-note">发布版本、发布日期、更新时间都可由后台单独维护；以后接数据库后直接保存为正式字段。</div>'+
    '</div></div>';

  const save=()=>{
    x.title=$('#dTitle')?.value.trim()||x.title||'未命名资料';
    x.subjectName=$('#dSubjectName')?.value.trim()||x.subjectName;
    x.subjectCode=$('#dSubjectCode')?.value.trim()||x.subjectCode;
    x.releaseVersion=$('#dReleaseVersion')?.value.trim()||x.releaseVersion;
    x.publishedAt=$('#dPublishedAt')?.value||x.publishedAt;
    x.updated=$('#dUpdated')?.value||x.updated;
    if(!id){x.id=Date.now();x.visible=false;x.versions=0;state.resources.push(x)}
    savePinnedResources();render();toast(id?'资料已保存（预览）':'已创建草稿（预览）')
  };
  openDrawer(id?'编辑资料':'新建资料',body,save);

  $$('[data-resource-tab]').forEach(button=>button.onclick=()=>{
    $$('[data-resource-tab]').forEach(el=>el.classList.toggle('active',el===button));
    $$('[data-resource-panel]').forEach(panel=>panel.classList.toggle('active',panel.dataset.resourcePanel===button.dataset.resourceTab));
  });
  $$('[data-open-channel]').forEach(button=>button.onclick=()=>openCustomLink('编辑获取入口'));
  $$('[data-add-custom-link]').forEach(button=>button.onclick=()=>openCustomLink('新增自定义链接'));
  $$('[data-open-errata]').forEach(button=>button.onclick=()=>openSimple('管理勘误','关联当前资料与版本；题号/页码、问题类型、原内容、修正内容、处理状态、公开/隐藏、删除'));
  $('[data-add-version]')?.addEventListener('click',()=>openSimple('新增版本','版本名称、格式、适用场景、版本说明、默认展开、排序'));
  $('#previewResourceButton')?.addEventListener('click',()=>window.open('../','_blank','noopener'));
}
function openCustomLink(title='新增自定义链接'){
  openDrawer(title,
    '<div class="form-grid"><label class="field"><span>显示名称</span><input placeholder="如：阿里云盘 / 打印店 / 在线阅读"></label><label class="field"><span>链接类型</span><select><option>网盘</option><option>直链下载</option><option>在线阅读</option><option>打印服务</option><option>表单</option><option>其他</option></select></label><label class="field wide"><span>URL</span><input type="url" placeholder="https://..."></label><label class="field"><span>提取码 / 口令</span><input></label><label class="field"><span>排序</span><input type="number" value="100"></label><label class="field wide"><span>说明</span><textarea placeholder="可选说明"></textarea></label></div><div class="setting-tile" style="margin-top:12px"><div><strong>前台显示</strong><small>关闭后仅后台可见</small></div>'+toggle('preview-custom-link','link',true)+'</div>',
    ()=>toast('自定义链接已保存（预览）')
  )
}

function openAnnouncement(id){
  const x=state.announcements.find(x=>x.id===id)||{id:null,title:'',kind:'更新通知',body:'',status:'draft',visible:true,pinned:false,dismissible:true,audience:'所有访客',publishAt:'',expiresAt:'',ctaText:'',ctaUrl:'',updated:'2026-09-19'};
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
    saveAnnouncements();render();toast(id?'公告已保存（预览）':'公告已创建（预览）')
  };
  openDrawer(id?'编辑公告':'新建公告',body,save);
}
function previewAnnouncement(id){
  const x=state.announcements.find(x=>x.id===id);if(!x)return;
  openDrawer('公告预览','<article class="announcement-preview"><div class="announcement-preview-meta"><span class="pill blue">'+x.kind+'</span>'+(x.pinned?'<span class="mini-pin">置顶</span>':'')+'</div><h2>'+x.title+'</h2><p>'+(x.body||'暂无正文')+'</p>'+(x.ctaText?'<button class="btn primary">'+x.ctaText+'</button>':'')+'<small>发布时间：'+(x.publishAt||'立即')+(x.expiresAt?' · 失效：'+x.expiresAt:'')+'</small></article>',null,true)
}
function duplicateAnnouncement(id){
  const source=state.announcements.find(x=>x.id===id);if(!source)return;
  const copy={...source,id:Date.now(),title:source.title+'（副本）',status:'draft',pinned:false,visible:false,updated:'2026-09-19'};
  state.announcements.unshift(copy);saveAnnouncements();render();toast('已复制为草稿（预览）')
}

function openAdmin(id){
  const x=state.admins.find(x=>x.id===id); const owner=x?.locked;
  openDrawer(x?'成员权限':'新增成员','<div class="form-grid"><label class="field wide"><span>显示名称</span><input value="'+(x?.name||'')+'" '+(owner?'disabled':'')+'></label><label class="field wide"><span>账号标识</span><input placeholder="接入身份服务后绑定邮箱或用户 ID" '+(owner?'disabled':'')+'></label><label class="field"><span>角色</span><select '+(owner?'disabled':'')+'><option>'+(owner?'Owner':'管理员')+'</option><option>编辑</option><option>审核</option></select></label><label class="field"><span>状态</span><select '+(owner?'disabled':'')+'><option>启用</option><option>停用</option></select></label></div><div class="subsection"><div class="subsection-head"><h3>细分权限</h3></div><div class="list">'+['资料 / 渠道 / 勘误','经验贴管理','公告管理','文件管理','分类管理','站点设置','审计日志'].map(p=>'<div class="list-row"><strong>'+p+'</strong>'+toggle('preview',p,true)+'</div>').join('')+'</div></div>'+(owner?'<div class="design-note" style="margin-top:14px">主管理员权限由服务端 Owner 角色固定，不允许其他成员删除、停用或降权。</div>':''),()=>toast('成员设置已保存（预览）'),owner)
}
function openSimple(title,fields){openDrawer(title,'<div class="design-note">'+fields+'</div><div class="form-grid" style="margin-top:14px"><label class="field wide"><span>名称 / 标题</span><input></label><label class="field wide"><span>说明</span><textarea></textarea></label></div>',()=>toast('已保存（预览）'))}
function openDrawer(title,body,onSave,readOnly=false){
  $('#drawer').innerHTML='<header class="drawer-head"><h2>'+title+'</h2><button class="icon-btn" data-drawer-close>'+icon('x')+'</button></header><div class="drawer-body">'+body+'</div><footer class="drawer-foot"><button class="btn subtle" data-drawer-close>取消</button><div>'+(readOnly?'':'<button class="btn primary" data-drawer-save>保存</button>')+'</div></footer>';
  $('#drawer').hidden=false;$('#drawerBackdrop').hidden=false;$$('[data-drawer-close]').forEach(b=>b.onclick=closeDrawer);$('[data-drawer-save]')?.addEventListener('click',()=>{onSave?.();closeDrawer()})
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
document.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();$('#globalSearch').focus()}if(e.key==='Escape'){closeDrawer();closeConfirm();closeSide()}});
render();

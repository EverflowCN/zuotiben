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
  plus:'<path d="M12 5v14M5 12h14"/>'
};
function icon(name){return '<svg viewBox="0 0 24 24" aria-hidden="true">'+(ICONS[name]||ICONS.box)+'</svg>'}
$$('[data-icon]').forEach(el=>el.innerHTML=icon(el.dataset.icon));

const state={
  section:'overview',
  resources:[
    {id:1,title:'408 做题本',category:'计算机',subject:'408',type:'做题本',versions:2,visible:true,status:'整理中',updated:'2026-09-19'},
    {id:2,title:'数学二做题本',category:'公共课',subject:'数学二',type:'做题本',versions:2,visible:true,status:'整理中',updated:'2026-09-19'}
  ],
  experiences:[],
  errata:[],
  announcements:[
    {id:1,title:'资源中心持续整理中',kind:'更新通知',visible:true,dismissible:true,updated:'2026-09-19'},
    {id:2,title:'同一资源可能存在多个版本与入口',kind:'使用说明',visible:true,dismissible:false,updated:'2026-09-19'}
  ],
  categories:[
    {id:1,name:'公共课',visible:true,count:1,order:1},{id:2,name:'计算机',visible:true,count:1,order:2}
  ],
  files:[],
  admins:[{id:1,name:'主管理员',role:'owner',status:'active',last:'当前会话',locked:true}],
  settings:{resources:true,experience:true,errata:true,notice:true,siteName:'研库',siteDescription:'考研学习资源索引与分发'}
};
const navGroups=[
  {label:'内容',items:[['overview','概览','home'],['resources','资料','box'],['experience','经验贴','article'],['errata','勘误','errata'],['announcements','公告','bell']]},
  {label:'资源管理',items:[['taxonomy','分类与科目','tag'],['files','文件','folder']]},
  {label:'系统',items:[['admins','成员与权限','users'],['settings','站点设置','settings'],['audit','审计日志','audit']]}
];
const titles={overview:['OVERVIEW','概览'],resources:['RESOURCES','资料'],experience:['EXPERIENCE','经验贴'],errata:['ERRATA','勘误'],announcements:['ANNOUNCEMENTS','公告'],taxonomy:['TAXONOMY','分类与科目'],files:['MEDIA','文件'],admins:['ACCESS','成员与权限'],settings:['SETTINGS','站点设置'],audit:['AUDIT','审计日志']};
function renderNav(){
  $('#nav').innerHTML=navGroups.map(g=>'<div class="nav-group">'+g.label+'</div>'+g.items.map(([id,label,ic])=>'<button class="nav-item '+(state.section===id?'active':'')+'" data-section="'+id+'">'+icon(ic)+'<span>'+label+'</span>'+badge(id)+'</button>').join('')).join('');
  $$('#nav [data-section]').forEach(b=>b.onclick=()=>{state.section=b.dataset.section;render();closeSide()});
}
function badge(id){const n={resources:state.resources.length,experience:state.experiences.length,errata:state.errata.length,announcements:state.announcements.length,admins:state.admins.length}[id];return n?'<b>'+n+'</b>':''}
function head(title,desc,action=''){return '<div class="page-head"><div><div class="eyebrow">'+titles[state.section][0]+'</div><h1>'+title+'</h1><p>'+desc+'</p></div><div class="page-actions">'+action+'</div></div>'}
function metric(label,value,note){return '<article class="metric"><span>'+label+'</span><strong>'+value+'</strong><small>'+note+'</small></article>'}
function renderOverview(){
  return head('概览','资源、勘误、公告与权限状态集中查看。')+
  '<div class="design-note">当前为界面预览：所有操作只在本页内模拟，不会写入服务器或公开站点。</div>'+
  '<div class="metric-grid" style="margin-top:12px">'+metric('公开资料',state.resources.filter(x=>x.visible).length,'共 '+state.resources.length+' 项')+metric('经验贴',state.experiences.length,'已发布')+metric('待处理勘误',state.errata.filter(x=>x.status!=='resolved').length,'需要核对')+metric('成员',state.admins.length,'含主管理员')+'</div>'+
  '<div class="grid two"><section class="card"><div class="card-head"><div><h2>最近内容</h2><p>按更新时间排列</p></div></div><div class="card-body"><div class="list">'+state.resources.map(x=>'<div class="list-row"><div><strong>'+x.title+'</strong><small>'+x.subject+' · '+x.updated+'</small></div><span class="pill '+(x.visible?'green':'')+'">'+(x.visible?'显示':'隐藏')+'</span></div>').join('')+'</div></div></section>'+
  '<section class="card"><div class="card-head"><div><h2>站点模块</h2><p>前台显示状态</p></div></div><div class="card-body"><div class="list">'+['resources','experience','errata','notice'].map(k=>settingRow(k)).join('')+'</div></div></section></div>'
}
function settingRow(k){const labels={resources:'资料',experience:'经验贴',errata:'勘误',notice:'公告'};return '<div class="list-row"><div><strong>'+labels[k]+'</strong><small>前台栏目</small></div>'+toggle('settings',k,state.settings[k])+'</div>'}
function toggle(scope,id,on){return '<button class="switch '+(on?'on':'')+'" data-toggle="'+scope+'" data-id="'+id+'" aria-label="切换显示"><i></i></button>'}
function renderResources(){
  const rows=state.resources.map(x=>'<tr><td><div class="title-cell"><strong>'+x.title+'</strong><small>#'+x.id+'</small></div></td><td>'+x.category+' / '+x.subject+'</td><td><span class="pill">'+x.type+'</span></td><td>'+x.versions+'</td><td>'+toggle('resource',x.id,x.visible)+'</td><td><span class="pill orange">'+x.status+'</span></td><td>'+x.updated+'</td><td><div class="row-actions"><button class="btn small" data-edit-resource="'+x.id+'">编辑</button><button class="btn small danger" data-delete-resource="'+x.id+'">删除</button></div></td></tr>').join('');
  return head('资料','管理书籍、讲义、做题本、真题、版本和获取渠道。','<button class="btn primary" data-new-resource>＋ 新建资料</button>')+
  '<section class="card"><div class="toolbar"><input class="control grow" placeholder="搜索标题、科目或标签"><select class="control"><option>全部类型</option><option>做题本</option><option>书籍</option><option>讲义</option><option>真题</option></select><select class="control"><option>全部状态</option><option>显示</option><option>隐藏</option></select></div><div class="table-wrap"><table class="table"><thead><tr><th>资源</th><th>分类 / 科目</th><th>类型</th><th>版本</th><th>显示</th><th>状态</th><th>更新</th><th></th></tr></thead><tbody>'+rows+'</tbody></table></div></section>'
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
  const rows=state.announcements.map(x=>'<tr><td><div class="title-cell"><strong>'+x.title+'</strong><small>'+x.kind+'</small></div></td><td>'+toggle('announcement',x.id,x.visible)+'</td><td>'+(x.dismissible?'可关闭':'常驻')+'</td><td>'+x.updated+'</td><td><div class="row-actions"><button class="btn small" data-edit-announcement="'+x.id+'">编辑</button><button class="btn small danger" data-delete-announcement="'+x.id+'">删除</button></div></td></tr>').join('');
  return head('公告','控制前台通知、说明、显示范围、顺序和是否允许关闭。','<button class="btn primary" data-new-announcement>＋ 新建公告</button>')+
  '<section class="card"><div class="table-wrap"><table class="table"><thead><tr><th>公告</th><th>显示</th><th>模式</th><th>更新</th><th></th></tr></thead><tbody>'+rows+'</tbody></table></div></section>'
}
function renderTaxonomy(){
  const rows=state.categories.map(x=>'<tr><td><strong>'+x.name+'</strong></td><td>'+x.count+'</td><td>'+x.order+'</td><td>'+toggle('category',x.id,x.visible)+'</td><td><div class="row-actions"><button class="btn small" data-edit-category="'+x.id+'">编辑</button><button class="btn small danger" data-delete-category="'+x.id+'">删除</button></div></td></tr>').join('');
  return head('分类与科目','分类、科目、排序和前台可见性都在这里控制。','<button class="btn primary" data-new-category>＋ 新建分类</button>')+
  '<section class="card"><div class="table-wrap"><table class="table"><thead><tr><th>分类</th><th>资源数</th><th>排序</th><th>显示</th><th></th></tr></thead><tbody>'+rows+'</tbody></table></div></section>'
}
function renderFiles(){
  return head('文件','统一管理封面、PDF、图片和其他附件，可替换、隐藏或删除。','<button class="btn primary" data-upload>＋ 上传文件</button>')+
  '<section class="card"><div class="toolbar"><input class="control grow" placeholder="搜索文件名或资源"><select class="control"><option>全部文件</option><option>PDF</option><option>图片</option></select></div><div class="empty"><strong>尚未接入文件存储</strong><p>后续接 Storage 后可查看大小、引用资源、公开状态、替换与删除。</p></div></section>'
}
function renderAdmins(){
  const rows=state.admins.map(x=>'<tr><td><div class="title-cell"><strong>'+x.name+'</strong><small>'+(x.locked?'当前主管理员':'授权成员')+'</small></div></td><td><span class="pill blue">'+(x.role==='owner'?'Owner':'Admin')+'</span></td><td><span class="pill green">'+(x.status==='active'?'启用':'停用')+'</span></td><td>'+x.last+'</td><td><div class="row-actions"><button class="btn small" data-edit-admin="'+x.id+'">'+(x.locked?'查看权限':'编辑')+'</button><button class="btn small danger" '+(x.locked?'disabled':'')+' data-delete-admin="'+x.id+'">删除</button></div></td></tr>').join('');
  return head('成员与权限','主管理员拥有全部权限，可创建多个管理员并逐项授权。','<button class="btn primary" data-new-admin>＋ 新增成员</button>')+
  '<section class="card"><div class="table-wrap"><table class="table"><thead><tr><th>成员</th><th>角色</th><th>状态</th><th>最近活动</th><th></th></tr></thead><tbody>'+rows+'</tbody></table></div></section>'+
  '<section class="card" style="margin-top:14px"><div class="card-head"><div><h2>权限矩阵</h2><p>Owner 始终拥有全部权限，不允许其他角色修改 Owner。</p></div></div><div class="card-body">'+permissionMatrix()+'</div></section>'
}
function permissionMatrix(){
  const rows=[['资料管理',1,1,1,0],['经验贴管理',1,1,1,0],['勘误处理',1,1,1,1],['公告管理',1,1,0,0],['文件管理',1,1,1,0],['分类管理',1,1,0,0],['成员与权限',1,0,0,0],['站点设置',1,0,0,0],['审计日志',1,1,0,1]];
  let h='<div class="permission-grid"><div class="head">权限</div><div class="head">Owner</div><div class="head">管理员</div><div class="head">编辑</div><div class="head">审核</div>';
  rows.forEach(r=>{h+='<div>'+r[0]+'</div>'+r.slice(1).map(v=>'<div class="'+(v?'yes':'no')+'">'+(v?'✓':'—')+'</div>').join('')});return h+'</div>'
}
function renderSettings(){
  return head('站点设置','控制公开站点的名称、说明、栏目、默认排序和整体显示。','<button class="btn primary" data-save-settings>保存设置</button>')+
  '<div class="grid two"><section class="card"><div class="card-head"><div><h2>基础信息</h2><p>前台公开信息</p></div></div><div class="card-body"><div class="form-grid"><label class="field wide"><span>站点名称</span><input value="'+state.settings.siteName+'"></label><label class="field wide"><span>站点说明</span><textarea>'+state.settings.siteDescription+'</textarea></label></div></div></section>'+
  '<section class="card"><div class="card-head"><div><h2>栏目显示</h2><p>关闭后前台不加载该栏目</p></div></div><div class="card-body"><div class="list">'+['resources','experience','errata','notice'].map(k=>settingRow(k)).join('')+'</div></div></section></div>'+
  '<section class="card" style="margin-top:14px"><div class="card-head"><div><h2>危险操作</h2><p>全站级操作必须由主管理员执行</p></div></div><div class="card-body"><div class="list-row"><div><strong>导出全部配置</strong><small>不包含密钥与身份凭据</small></div><button class="btn small">导出</button></div><div class="list-row"><div><strong>清空演示数据</strong><small>接入服务器后要求二次确认</small></div><button class="btn small danger">清空</button></div></div></section>'
}
function settingRow(k){const labels={resources:'资料栏目',experience:'经验贴栏目',errata:'勘误栏目',notice:'公告区域'};return '<div class="list-row"><div><strong>'+labels[k]+'</strong><small>前台显示</small></div>'+toggle('settings',k,state.settings[k])+'</div>'}
function renderAudit(){
  return head('审计日志','记录高权限操作，包括创建、修改、删除、隐藏、权限变更和文件操作。','<button class="btn" type="button">导出日志</button>')+
  '<section class="card"><div class="toolbar"><input class="control grow" placeholder="搜索动作、对象或成员"><select class="control"><option>全部操作</option><option>内容</option><option>权限</option><option>文件</option><option>系统</option></select></div><div class="table-wrap"><table class="table"><thead><tr><th>时间</th><th>成员</th><th>动作</th><th>对象</th><th>结果</th></tr></thead><tbody><tr><td>2026-09-19</td><td>主管理员</td><td>初始化 Studio</td><td>管理界面</td><td><span class="pill green">成功</span></td></tr></tbody></table></div></section>'
}
function render(){
  renderNav(); const [ey,title]=titles[state.section]; $('#topEyebrow').textContent=ey;$('#topTitle').textContent=title;
  const r={overview:renderOverview,resources:renderResources,experience:renderExperience,errata:renderErrata,announcements:renderAnnouncements,taxonomy:renderTaxonomy,files:renderFiles,admins:renderAdmins,settings:renderSettings,audit:renderAudit}[state.section];
  $('#panelHost').innerHTML=r(); bind();
}
function bind(){
  $$('[data-toggle]').forEach(b=>b.onclick=()=>{const s=b.dataset.toggle,id=b.dataset.id;if(s==='settings')state.settings[id]=!state.settings[id];if(s==='resource'){const x=state.resources.find(x=>x.id==id);x.visible=!x.visible}if(s==='announcement'){const x=state.announcements.find(x=>x.id==id);x.visible=!x.visible}if(s==='category'){const x=state.categories.find(x=>x.id==id);x.visible=!x.visible}render();toast('状态已更新（预览）')});
  $$('[data-edit-resource]').forEach(b=>b.onclick=()=>openResource(Number(b.dataset.editResource)));
  $('[data-new-resource]')?.addEventListener('click',()=>openResource());
  $$('[data-delete-resource]').forEach(b=>b.onclick=()=>confirmDelete('删除资料','删除后将同时移除版本与渠道。',()=>{state.resources=state.resources.filter(x=>x.id!=b.dataset.deleteResource);render();toast('已删除（预览）')}));
  $$('[data-edit-announcement]').forEach(b=>b.onclick=()=>openAnnouncement(Number(b.dataset.editAnnouncement)));
  $('[data-new-announcement]')?.addEventListener('click',()=>openAnnouncement());
  $$('[data-delete-announcement]').forEach(b=>b.onclick=()=>confirmDelete('删除公告','该公告将不再出现在前台。',()=>{state.announcements=state.announcements.filter(x=>x.id!=b.dataset.deleteAnnouncement);render();toast('已删除（预览）')}));
  $('[data-new-admin]')?.addEventListener('click',openAdmin);
  $$('[data-edit-admin]').forEach(b=>b.onclick=()=>openAdmin(Number(b.dataset.editAdmin)));
  $('[data-save-settings]')?.addEventListener('click',()=>toast('设置已保存（预览）'));
  $('[data-new-experience]')?.addEventListener('click',()=>openSimple('新建经验贴','标题、来源、院校、专业、年份、阶段、正文、显示状态'));
  $('[data-new-errata]')?.addEventListener('click',()=>openSimple('新建勘误','关联资源、版本、页码/题号、问题类型、说明、状态、是否公开'));
  $('[data-new-category]')?.addEventListener('click',()=>openSimple('新建分类','分类名称、科目、排序、显示状态'));
  $('[data-upload]')?.addEventListener('click',()=>openSimple('上传文件','文件、用途、关联资源、公开状态、替换策略'));
}
function openResource(id){
  const x=state.resources.find(x=>x.id===id)||{title:'',category:'公共课',subject:'',type:'做题本',visible:true,status:'草稿',versions:0};
  openDrawer((id?'编辑资料':'新建资料'),'<div class="form-grid"><label class="field wide"><span>标题</span><input id="dTitle" value="'+x.title+'"></label><label class="field"><span>分类</span><select><option>'+x.category+'</option><option>公共课</option><option>计算机</option></select></label><label class="field"><span>科目</span><input value="'+x.subject+'"></label><label class="field"><span>资源类型</span><select><option>'+x.type+'</option><option>书籍</option><option>讲义</option><option>真题</option></select></label><label class="field"><span>状态</span><select><option>'+x.status+'</option><option>草稿</option><option>已发布</option></select></label><label class="field wide"><span>简介</span><textarea placeholder="资源说明"></textarea></label></div>'+
  '<div class="subsection"><div class="subsection-head"><h3>版本</h3><button class="btn small">＋ 添加版本</button></div><div class="inline-list">'+(x.versions?'<div class="inline-item"><span class="pill blue">PDF</span><div class="grow"><strong>标准版</strong><small>百度网盘 · 夸克网盘 · 直链</small></div><button class="btn small">编辑</button><button class="btn small danger">删除</button></div><div class="inline-item"><span class="pill">PRINT</span><div class="grow"><strong>打印专版</strong><small>A4 · 双面 · 留空白页</small></div><button class="btn small">编辑</button><button class="btn small danger">删除</button></div>':'<div class="empty"><p>暂无版本</p></div>')+'</div></div>',id?()=>toast('资料已保存（预览）'):()=>{state.resources.push({id:Date.now(),title:$('#dTitle').value||'未命名资料',category:'公共课',subject:'',type:'做题本',versions:0,visible:false,status:'草稿',updated:'2026-09-19'});render();toast('已创建草稿（预览）')})
}
function openAnnouncement(id){
  const x=state.announcements.find(x=>x.id===id)||{title:'',kind:'通知',visible:true,dismissible:true};
  openDrawer(id?'编辑公告':'新建公告','<div class="form-grid"><label class="field wide"><span>标题</span><input value="'+x.title+'"></label><label class="field"><span>类型</span><select><option>'+x.kind+'</option><option>更新通知</option><option>使用说明</option><option>维护</option></select></label><label class="field"><span>显示位置</span><select><option>全站顶部</option><option>资料</option><option>经验贴</option><option>勘误</option></select></label><label class="field wide"><span>正文</span><textarea></textarea></label></div><div class="subsection"><div class="list-row"><div><strong>前台显示</strong><small>关闭后不加载</small></div>'+toggle('preview','a',x.visible)+'</div><div class="list-row"><div><strong>允许关闭</strong><small>用户可隐藏本条</small></div>'+toggle('preview','b',x.dismissible)+'</div></div>',()=>toast('公告已保存（预览）'))
}
function openAdmin(id){
  const x=state.admins.find(x=>x.id===id); const owner=x?.locked;
  openDrawer(x?'成员权限':'新增成员','<div class="form-grid"><label class="field wide"><span>显示名称</span><input value="'+(x?.name||'')+'" '+(owner?'disabled':'')+'></label><label class="field wide"><span>账号标识</span><input placeholder="接入身份服务后绑定邮箱或用户 ID" '+(owner?'disabled':'')+'></label><label class="field"><span>角色</span><select '+(owner?'disabled':'')+'><option>'+(owner?'Owner':'管理员')+'</option><option>编辑</option><option>审核</option></select></label><label class="field"><span>状态</span><select '+(owner?'disabled':'')+'><option>启用</option><option>停用</option></select></label></div><div class="subsection"><div class="subsection-head"><h3>细分权限</h3></div><div class="list">'+['资料管理','经验贴管理','勘误处理','公告管理','文件管理','分类管理','站点设置','审计日志'].map(p=>'<div class="list-row"><strong>'+p+'</strong>'+toggle('preview',p,true)+'</div>').join('')+'</div></div>'+(owner?'<div class="design-note" style="margin-top:14px">主管理员权限由服务端 Owner 角色固定，不允许其他成员删除、停用或降权。</div>':''),()=>toast('成员设置已保存（预览）'),owner)
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
$('#quickCreate').onclick=()=>{state.section='resources';render();setTimeout(()=>openResource(),0)};
document.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();$('#globalSearch').focus()}if(e.key==='Escape'){closeDrawer();closeConfirm();closeSide()}});
const preview=new URLSearchParams(location.search).get('preview')==='1';
if(preview){$('#gate').hidden=true;$('#app').hidden=false;render()}else{$('#verifyButton').onclick=()=>{$('#gateStatus').textContent='身份服务尚未接入；当前不会开放管理数据。'}};

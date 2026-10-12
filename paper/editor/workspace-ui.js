/* Browser-local workspace UI for Everflow Paper Studio.
 * The main editor remains the single editing/pagination engine.
 * All data stays in local IndexedDB and the legacy active localStorage draft.
 */
(function(){
"use strict";
const db=window.EverflowArchive,api=()=>window.EverflowEditor;
if(!db)return;
const $=id=>document.getElementById(id);
const clip=(s,n)=>{s=String(s||"").replace(/\s+/g," ").trim();return s.length>n?s.slice(0,n-1)+"…":s};
const date=s=>{try{return new Date(s).toLocaleString("zh-CN",{hour12:false})}catch(e){return s}};
function make(tag,cls,txt){
 const e=document.createElement(tag);
 if(cls)e.className=cls;
 if(txt!==undefined)e.textContent=txt;
 return e;
}
function button(label,onClick,style){
 const b=make("button",style||"workspace-action",label);
 b.type="button";b.onclick=onClick;return b;
}
function toast(msg){const host=$("toast");if(host){host.textContent=msg;host.classList.add("show");setTimeout(()=>host.classList.remove("show"),2500)}}
function dialog(title){
 const host=$("workspaceDialog");
 $("workspaceDialogTitle").textContent=title;
 $("workspaceDialogContent").replaceChildren();
 host.hidden=false;
 return $("workspaceDialogContent");
}
function close(){$("workspaceDialog").hidden=true;$("workspaceDialogContent").replaceChildren()}
async function saveActive(checkpoint){
 let snapshot=api()?.snapshot();if(!snapshot)return;
 await db.savePaper(snapshot,{checkpoint:!!checkpoint,label:checkpoint?"切换前自动备份":"本地保存"});
}
async function renderFolders(){
 const target=$("localPaperList");if(!target)return;
 const list=await db.list(),active=db.activeId(),frag=document.createDocumentFragment();
 for(const p of list){
  const b=button("","", "workspace-paper"+(p.id===active?" is-active":""));
  b.onclick=async()=>{
   if(p.id===db.activeId())return;
   try{
    await saveActive(true);await db.openPaper(p.id);location.reload();
   }catch(e){toast("切换失败："+e.message)}
  };
  const ico=make("span","workspace-paper-icon","▤");
  const name=make("span","workspace-paper-name",p.title);
  const count=make("small","workspace-paper-count",p.count+"题");
  b.title=p.title+" · "+date(p.modified);
  b.append(ico,name,count);frag.append(b);
 }
 target.replaceChildren(frag);
 if(!list.length)target.textContent="暂无归档试卷";
}
async function historyModal(){
 const box=dialog("本机历史版本");
 box.append(make("p","workspace-description","仅当前浏览器保存，保留最近约20个历史快照；清除网站数据会删除记录。重要项目请导出 .everflow 备份。"));
 try{
  const entries=await db.history(db.activeId());
  for(const entry of entries){
   const row=make("div","workspace-history-row");
   row.append(make("span","",date(entry.at)+" · "+entry.questions+"题 · "+(entry.label||"自动记录")));
   row.append(button("恢复",async()=>{
    if(!confirm("恢复此版本？程序会先备份当前内容。"))return;
    try{await saveActive(true);await db.restore(entry.key);location.reload()}catch(e){toast("恢复失败："+e.message)}
   }));
   box.append(row);
  }
  if(!entries.length)box.append(make("p","","还没有历史记录，编辑后会自动保存。"));
 }catch(e){box.append(make("p","","读取失败："+e.message))}
}
function classify(q){
 const str=(q.section||"")+" "+(q.type||"");
 if(str.includes("选择")||!str.includes("填空")&&Array.isArray(q.options)&&q.options.length>1){
  return {section:"一、选择题",type:"选择题",showOptions:true};
 }
 if(str.includes("填空"))return {section:"二、填空题",type:"填空题",showOptions:false};
 return {section:"三、解答题",type:"解答题",showOptions:false};
}
async function graphModal(){
 const box=dialog("题目图谱 · 跨试卷选题");
 box.append(make("p","workspace-description","从本机保存的所有试卷里勾选题目，自动分类为选择题、填空题或解答题。不会上传内容。"));
 const all=[];
 try{
  const papers=await db.list();
  for(const paper of papers){
   const record=await db.getPaper(paper.id);
   (record?.data?.questions||[]).forEach((q,i)=>all.push({paper,index:i,question:q,key:paper.id+":"+i}));
  }
 }catch(e){box.append(make("p","","读取本机题库失败："+e.message));return}
 const chosen=new Set(),actions=make("div","workspace-graph-actions");
 const search=make("input");search.type="search";search.placeholder="搜索试卷、题干或所属大题…";
 const destination=make("select");
 destination.add(new Option("创建新试卷","new"));destination.add(new Option("添加到当前试卷","current"));
 const count=make("span","workspace-counter","已选 0 题");
 const apply=button("加入所选题目",async()=>{
  let selected=all.filter(e=>chosen.has(e.key));
  if(!selected.length){toast("请先选择题目");return}
  const output=selected.map(e=>{
   let q=JSON.parse(JSON.stringify(e.question));
   return Object.assign(q,classify(q));
  });
  try{
   if(destination.value==="new"){
     await saveActive(true);
     await db.newPaper("跨卷选题集 · "+new Date().toLocaleDateString("zh-CN"),output.map((q,i)=>Object.assign(q,{id:"graph-"+Date.now().toString(36)+"-"+i})));
     location.reload();
   }else{
     api().insertQuestions(output);
     close();toast("已加入 "+output.length+" 题");
   }
  }catch(e){toast("选题失败："+e.message)}
 },"workspace-action primary");
 actions.append(search,destination,count,apply);box.append(actions);
 const list=make("div","workspace-graph-list");box.append(list);
 const draw=()=>{
  const keyword=search.value.trim().toLowerCase(),frag=document.createDocumentFragment();
  for(const e of all){
   if(keyword&&!((e.paper.title||"")+" "+(e.question.section||"")+" "+(e.question.content||"")).toLowerCase().includes(keyword))continue;
   const label=make("label","workspace-graph-row"),input=make("input"),content=make("span","workspace-graph-content");
   input.type="checkbox";input.checked=chosen.has(e.key);
   input.onchange=()=>{
     if(input.checked)chosen.add(e.key);else chosen.delete(e.key);
     count.textContent="已选 "+chosen.size+" 题";
   };
   content.append(make("small","",e.paper.title+" · 第 "+(e.index+1)+" 题 · "+(e.question.section||"待分类")));
   content.append(make("span","",clip(e.question.content,170)||"（空题）"));
   label.append(input,content);frag.append(label);
  }
  list.replaceChildren(frag);
 };
 search.oninput=draw;draw();
 if(!all.length)list.textContent="本机没有题目，请先导入或新建试卷。";
}
async function initialize(){
 if(!api())return;
 $("workspaceDialogClose").onclick=close;
 $("workspaceDialog").onclick=e=>{if(e.target===$("workspaceDialog"))close()};
 document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!$("workspaceDialog").hidden)close()});
 $("newLocalPaper").onclick=async()=>{
  try{
   await saveActive(true);
   await db.newPaper("新试卷 · "+new Date().toLocaleDateString("zh-CN"));
   location.reload();
  }catch(e){toast("新增失败："+e.message)}
 };
 $("openPaperGraph").onclick=graphModal;
 $("openLocalHistory").onclick=historyModal;
 $("showAnswersToggle").onchange=()=>{
   api().showSolutions($("showAnswersToggle").checked,$("showExplanationsToggle").checked);
 };
 $("showExplanationsToggle").onchange=()=>{
   api().showSolutions($("showAnswersToggle").checked,$("showExplanationsToggle").checked);
 };
 $("showAnswersToggle").checked=false;$("showExplanationsToggle").checked=false;
 let current="";
 try{
  await db.ensureActive(api().snapshot());
  await renderFolders();
  current=JSON.stringify(api().snapshot());
 }catch(e){console.error("Workspace initial archive failed",e);toast("本机历史存储不可用，请及时备份")}
 // Auto-archive with a retained active draft every 1.6 seconds; periodic history snapshots.
 let lastCheckpoint=Date.now(),busy=false;
 setInterval(async()=>{
  if(busy)return;
  const currentData=api()?.snapshot();if(!currentData)return;
  let value=JSON.stringify(currentData);
  if(value===current)return;
  current=value;busy=true;
  const checkpoint=Date.now()-lastCheckpoint>=20000;
  if(checkpoint)lastCheckpoint=Date.now();
  try{
   await db.savePaper(currentData,{checkpoint,label:"自动版本"});
   await renderFolders();
  }catch(e){console.warn("Everflow local autosave failed",e)}
  finally{busy=false}
 },1600);
 // Save another safe version before closing if possible. localStorage draft stays primary.
 document.addEventListener("visibilitychange",()=>{
  if(document.visibilityState==="hidden"&&api())db.queuedSave(api().snapshot(),{checkpoint:true,label:"离开页面备份"});
 });
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initialize);else initialize();
})();
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
 const host=$("workspaceDialog");host.querySelector(".workspace-dialog").classList.remove("is-graph-dialog");
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
function treeIcon(name){
 const svg=document.createElementNS("http://www.w3.org/2000/svg","svg");
 for(const [k,v] of Object.entries({viewBox:"0 0 24 24",fill:"none",stroke:"currentColor","stroke-width":"1.7","stroke-linecap":"round","stroke-linejoin":"round","aria-hidden":"true"}))svg.setAttribute(k,v);
 svg.classList.add("workspace-tree-icon");
 const paths=name==="folder"?["M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"]:["M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z","M14 2v6h6","M8 13h8","M8 17h6"];
 for(const d of paths){const path=document.createElementNS("http://www.w3.org/2000/svg","path");path.setAttribute("d",d);svg.appendChild(path)}
 return svg;
}
let chosenFolder="";
let collapsedFolders=new Set();
try{chosenFolder=localStorage.getItem("everflow-workspace-folder-v2")||"";collapsedFolders=new Set(JSON.parse(localStorage.getItem("everflow-workspace-collapsed-v2")||"[]"))}catch(e){}
async function renderFolders(){
 const target=$("localPaperList");if(!target)return;
 const [papers,folders]=await Promise.all([db.list(),db.listFolders()]);
 if(chosenFolder&&!folders.some(f=>f.id===chosenFolder))chosenFolder="";
 const active=db.activeId(),frag=document.createDocumentFragment();
 const keyword=($("workspaceSearchInput")?.value||"").trim().toLowerCase();
 function choose(id){
   chosenFolder=id||"";
   try{localStorage.setItem("everflow-workspace-folder-v2",chosenFolder)}catch(e){}
   renderFolders();
 }
 function paperRow(p){
   const row=make("div","workspace-file-row"+(p.id===active?" is-active":""));
   const open=button("","", "workspace-paper"+(p.id===active?" is-active":""));
   const ico=make("span","workspace-paper-icon");ico.appendChild(treeIcon("file"));
   const name=make("span","workspace-paper-name",p.title);
   const count=make("small","workspace-paper-count",p.count+"题");
   open.title=p.title+" · "+date(p.modified);
   open.append(ico,name,count);
   open.onclick=async()=>{
     if(p.id===db.activeId())return;
     try{await saveActive(true);await db.openPaper(p.id);location.reload()}
     catch(e){toast("切换失败："+e.message)}
   };
   const actions=button("⋯",()=>{
     const box=dialog("移动试卷 · "+p.title);
     box.append(make("p","workspace-description","选择目标文件夹。移动后题目与历史版本保持不变。"));
     const move=make("select","workspace-file-move workspace-input");
     move.setAttribute("aria-label","移动 "+p.title+" 到文件夹");
     move.add(new Option("根目录",""));folders.forEach(f=>move.add(new Option(f.name,f.id)));
     move.value=p.folderId||"";box.append(move);
     const bar=make("div","workspace-dialog-actions");
     bar.append(button("取消",close),button("移动试卷",async()=>{
       try{await db.movePaper(p.id,move.value);await renderFolders();close();toast("试卷已移动")}
       catch(e){toast("移动失败："+e.message)}
     },"workspace-action primary"));box.append(bar);
   },"workspace-file-menu");
   actions.title="移动试卷";actions.setAttribute("aria-label","管理试卷 "+p.title);
   row.append(open,actions);return row;
 }
 function folderBlock(f,own){
   const box=make("div","workspace-folder-block");
   const head=make("div","workspace-folder-head");
   const collapsed=!keyword&&collapsedFolders.has(f.id);
   const arrow=button(collapsed?"▸":"▾",()=>{
      if(collapsedFolders.has(f.id))collapsedFolders.delete(f.id);else collapsedFolders.add(f.id);
      try{localStorage.setItem("everflow-workspace-collapsed-v2",JSON.stringify([...collapsedFolders]))}catch(e){}
      renderFolders();
   },"workspace-folder-exp");
   arrow.setAttribute("aria-label",collapsed?"展开文件夹 "+f.name:"折叠文件夹 "+f.name);
   const folderButton=button("","", "workspace-folder-name"+(chosenFolder===f.id?" is-selected":""));
   const folderIcon=make("span","workspace-folder-icon");folderIcon.appendChild(treeIcon("folder"));
   folderButton.append(folderIcon,make("span","workspace-folder-label",f.name),make("small","workspace-folder-count",own.length+"份"));
   folderButton.onclick=()=>choose(f.id);
   const actions=button("⋯",()=>{
      const modal=dialog("文件夹 · "+f.name);
      modal.append(make("p","workspace-description","重命名或删除文件夹不会删除里面的试卷。删除后试卷回到根目录。"));
      const name=make("input","workspace-input");name.value=f.name;name.maxLength=60;modal.append(name);
      const bar=make("div","workspace-dialog-actions");
      bar.append(button("保存名称",async()=>{
        try{await db.renameFolder(f.id,name.value);await renderFolders();close()}catch(e){toast(e.message)}
      }),button("删除文件夹",async()=>{
        if(!confirm("删除文件夹「"+f.name+"」？其中试卷会移到根目录。"))return;
        try{await db.deleteFolder(f.id);if(chosenFolder===f.id)choose("");await renderFolders();close()}catch(e){toast(e.message)}
      },"workspace-action danger"));
      modal.append(bar);
   },"workspace-folder-menu");
   actions.setAttribute("aria-label","管理文件夹 "+f.name);
   head.append(arrow,folderButton,actions);box.append(head);
   if(collapsed)return box;
   const children=make("div","workspace-folder-children");
   own.forEach(p=>children.append(paperRow(p)));
   if(!own.length)children.append(make("span","workspace-folder-empty","空文件夹 · 新建试卷或移动到这里"));
   box.append(children);return box;
 }
 const root=papers.filter(p=>!p.folderId||!folders.some(f=>f.id===p.folderId));
 const rootHead=button("","", "workspace-folder-root"+(!chosenFolder?" is-selected":""));
 rootHead.append(make("span","workspace-root-chevron","⌄"),make("span","workspace-folder-label","文件目录"),make("small","workspace-folder-count",papers.length+"份"));
 rootHead.onclick=()=>choose("");
 frag.append(rootHead);
 folders.forEach(f=>{
   const own=papers.filter(p=>p.folderId===f.id&&(!keyword||f.name.toLowerCase().includes(keyword)||p.title.toLowerCase().includes(keyword)));
   if(!keyword||own.length||f.name.toLowerCase().includes(keyword))frag.append(folderBlock(f,own));
 });
 root.filter(p=>!keyword||p.title.toLowerCase().includes(keyword)).forEach(p=>frag.append(paperRow(p)));
 target.replaceChildren(frag);
 if(!papers.length)target.append(make("p","workspace-description","还没有试卷，点击新建或导入 ZIP。"));
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
 $("workspaceDialog").querySelector(".workspace-dialog").classList.add("is-graph-dialog");
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
     await db.newPaper("跨卷选题集 · "+new Date().toLocaleDateString("zh-CN"),output.map((q,i)=>Object.assign(q,{id:"graph-"+Date.now().toString(36)+"-"+i})),chosenFolder);
     location.reload();
   }else{
     api().insertQuestions(output);
     close();toast("已加入 "+output.length+" 题");
   }
  }catch(e){toast("选题失败："+e.message)}
 },"workspace-action primary");
 actions.append(search,destination,count,apply);box.append(actions);
 const switcher=make("div","workspace-graph-view-switch");switcher.setAttribute("role","group");switcher.setAttribute("aria-label","图谱显示方式");
 let view="list";try{view=localStorage.getItem("everflow-graph-view")||"list"}catch(e){}
 const listButton=button("列表",()=>setView("list")),matrixButton=button("矩阵图谱",()=>setView("matrix"));
 listButton.dataset.graphView="list";matrixButton.dataset.graphView="matrix";switcher.append(listButton,matrixButton);box.insertBefore(switcher,actions);
 const list=make("div","workspace-graph-list"),matrix=make("div","workspace-matrix");box.append(list,matrix);
 const legend=make("div","workspace-matrix-legend","选：选择题　填：填空题　解：解答题　✓：已选 · 点击格子选题，方向键移动");box.append(legend);
 const detail=make("section","workspace-matrix-detail");detail.hidden=true;box.append(detail);
 function showDetail(e){
   detail.replaceChildren(make("strong","",e.paper.title+" · 第 "+(e.index+1)+" 题 · "+(e.question.type||"题目")));
   const content=make("div","workspace-graph-math",e.question.content||"（空题）");if(window.EverflowSafeMath)window.EverflowSafeMath.render(content);detail.append(content);detail.hidden=false;
 }
 function toggle(e){if(chosen.has(e.key))chosen.delete(e.key);else chosen.add(e.key);count.textContent="已选 "+chosen.size+" 题"}
 function setView(value){view=value;try{localStorage.setItem("everflow-graph-view",value)}catch(e){}draw()}
 const draw=()=>{
   listButton.setAttribute("aria-pressed",String(view==="list"));matrixButton.setAttribute("aria-pressed",String(view==="matrix"));
   list.hidden=view!=="list";matrix.hidden=view!=="matrix";legend.hidden=view!=="matrix";detail.hidden=true;
   const keyword=search.value.trim().toLowerCase();
   const filtered=all.filter(e=>!keyword||((e.paper.title||"")+" "+(e.question.section||"")+" "+(e.question.content||"")).toLowerCase().includes(keyword));
   list.replaceChildren();matrix.replaceChildren();
   if(view==="list"){
     const frag=document.createDocumentFragment();
     for(const e of filtered){
       const label=make("label","workspace-graph-row"),input=make("input"),content=make("span","workspace-graph-content");
       input.type="checkbox";input.checked=chosen.has(e.key);input.setAttribute("aria-label",e.paper.title+" 第 "+(e.index+1)+" 题");
       input.onchange=()=>toggle(e);
       content.append(make("small","",e.paper.title+" · 第 "+(e.index+1)+" 题 · "+(e.question.section||"待分类")));
       const formula=make("span","workspace-graph-math",clip(e.question.content,170)||"（空题）");
       if(window.EverflowSafeMath)window.EverflowSafeMath.render(formula);content.append(formula);label.append(input,content);frag.append(label);
     }
     list.append(frag);
   }else{
     const papers=new Map();for(const e of filtered){if(!papers.has(e.paper.id))papers.set(e.paper.id,{paper:e.paper,entries:[]});papers.get(e.paper.id).entries.push(e)}
     const cols=filtered.reduce((max,e)=>Math.max(max,e.index+1),0);
     const sheet=make("div","workspace-matrix-sheet");sheet.style.setProperty("--matrix-columns",String(cols));
     const header=make("div","workspace-matrix-header");header.append(make("strong","workspace-matrix-label","试卷 / 题号"));
     for(let i=1;i<=cols;i++)header.append(make("span","workspace-matrix-number",i));sheet.append(header);
     for(const {paper,entries} of papers.values()){
       const row=make("div","workspace-matrix-row"),label=make("span","workspace-matrix-label",paper.title);label.title=paper.title;row.append(label);
       const positions=new Map(entries.map(e=>[e.index,e]));
       for(let i=0;i<cols;i++){
         const e=positions.get(i);if(!e){row.append(make("span","workspace-matrix-empty"));continue}
         const kind=classify(e.question).type;const short=kind==="选择题"?"选":kind==="填空题"?"填":"解";
         const cell=button(chosen.has(e.key)?"✓":short,()=>{toggle(e);cell.textContent=chosen.has(e.key)?"✓":short;cell.setAttribute("aria-checked",String(chosen.has(e.key)));showDetail(e)},"workspace-matrix-cell");
         cell.dataset.kind=short;cell.dataset.index=i;cell.dataset.paper=paper.id;cell.setAttribute("role","checkbox");cell.setAttribute("aria-checked",String(chosen.has(e.key)));cell.setAttribute("aria-label",paper.title+" · 第 "+(i+1)+" 题 · "+kind);cell.title=paper.title+" · 第 "+(i+1)+" 题 · "+kind+"\n"+clip(e.question.content,130);
         cell.onfocus=()=>showDetail(e);
         cell.onkeydown=event=>{
           if(event.key===" "||event.key==="Enter"){event.preventDefault();cell.click();return}
           const rowNodes=[...sheet.querySelectorAll(".workspace-matrix-row")],r=rowNodes.indexOf(row),cells=[...row.querySelectorAll(".workspace-matrix-cell")],c=cells.indexOf(cell);let target;
           if(event.key==="ArrowLeft")target=cells[c-1];if(event.key==="ArrowRight")target=cells[c+1];
           if(event.key==="ArrowUp"||event.key==="ArrowDown"){const dest=rowNodes[r+(event.key==="ArrowUp"?-1:1)];if(dest)target=dest.querySelector('[data-index="'+i+'"]')||dest.querySelector(".workspace-matrix-cell")}
           if(target){event.preventDefault();target.focus()}
         };row.append(cell);
       }sheet.append(row);
     }matrix.append(sheet);
   }
   if(!filtered.length)(view==="list"?list:matrix).append(make("p","workspace-description",all.length?"没有匹配的题目":"本机没有题目，请先导入或新建试卷。"));
 };
 search.oninput=draw;draw();
}
async function initialize(){
 if(!api())return;
 const searchButton=$("workspaceSearchButton"),searchInput=$("workspaceSearchInput");
 if(searchButton&&searchInput){
   searchButton.onclick=()=>{searchInput.hidden=!searchInput.hidden;searchButton.setAttribute("aria-expanded",String(!searchInput.hidden));if(!searchInput.hidden)searchInput.focus();else{searchInput.value="";renderFolders()}};
   searchInput.oninput=()=>renderFolders();
 }
 $("workspaceDialogClose").onclick=close;
 $("workspaceDialog").onclick=e=>{if(e.target===$("workspaceDialog"))close()};
 document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!$("workspaceDialog").hidden)close()});
 $("newLocalFolder").onclick=async()=>{
   const box=dialog("新建项目文件夹");
   box.append(make("p","workspace-description","一个文件夹可以收纳多套试卷；不同试卷仍可独立编辑、导出和跨卷选题。"));
   const input=make("input","workspace-input");input.placeholder="例如：2027 数学二模拟卷";input.maxLength=60;
   const action=button("创建文件夹",async()=>{
     try{
       const folder=await db.createFolder(input.value);
       chosenFolder=folder.id;localStorage.setItem("everflow-workspace-folder-v2",chosenFolder);
       await renderFolders();close();toast("已创建文件夹");
     }catch(e){toast(e.message)}
   },"workspace-action primary");
   box.append(input,action);input.onkeydown=e=>{if(e.key==="Enter")action.click()};input.focus();
 };
 $("newLocalPaper").onclick=async()=>{
  try{
   await saveActive(true);
   await db.newPaper("新试卷 · "+new Date().toLocaleDateString("zh-CN"),null,chosenFolder);
   location.reload();
  }catch(e){toast("新增失败："+e.message)}
 };
 document.addEventListener("everflow:archive-changed",()=>{
   try{chosenFolder=localStorage.getItem("everflow-workspace-folder-v2")||""}catch(e){}
   renderFolders().catch(e=>toast("刷新文件夹失败："+e.message));
 });
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
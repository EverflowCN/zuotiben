/* ZIP batch importer for the local Everflow file tree.
 * Only processes a file explicitly chosen by the user; never sends contents
 * to a server. Supports .everflow, JSON and Markdown in one ZIP.
 * Legacy bbkaoyan_data/raw/papers/<id>.json is also supported as a JSON file.
 */
(function(){
"use strict";
const db=window.EverflowArchive,$=id=>document.getElementById(id);
if(!db||!$("workspaceZipInput"))return;
const maxZip=25*1024*1024,maxText=40*1024*1024,maxPaper=3*1024*1024;
const text=v=>String(v==null?"":v).replace(/\r\n?/g,"\n").trim();
const make=(tag,cls,value)=>{const x=document.createElement(tag);if(cls)x.className=cls;if(value!==undefined)x.textContent=value;return x};
function notice(value){
 const t=$("toast");t.textContent=value;t.classList.add("show");
 setTimeout(()=>t.classList.remove("show"),3600);
}
function safeFilename(name){return name.split("/").pop().replace(/\.[^.]+$/,"").slice(0,100)}
function parseMarkdown(source,filename){
 const parts=[],lines=text(source).split("\n");let title=filename,section="",q=null,mode="body";
 function done(){
  if(!q)return;
  const result={
   id:"import-"+Date.now().toString(36)+"-"+parts.length,
   content:q.body.join("\n").trim(),options:q.options,answer:q.answer.join("\n").trim(),
   explanation:q.explanation.join("\n").trim(),section:section,
   type:section.includes("选择")||(!section.includes("填空")&&q.options.length>1)?"选择题":section.includes("填空")?"填空题":"解答题",
   showOptions:section.includes("选择")||(!section.includes("填空")&&q.options.length>1)
  };
  if(result.content||result.options.length)parts.push(result);q=null;
 }
 for(const raw of lines){
  const v=raw.trim();
  const name=v.match(/^#\s+(.+)$/);
  if(name&&!parts.length&&!q){title=name[1].trim();continue}
  const sec=v.match(/^##\s+((?:[一二三四五六七八九十]+[、.．]|第[一二三四五六七八九十]+部分).+)$/);
  if(sec){done();section=sec[1];continue}
  const head=v.match(/^#{2,3}\s*(?:第\s*)?(\d+)(?:\s*题)?(?:[、.．:：-]\s*(.*))?$/);
  const numbered=!q?v.match(/^(\d+)[、.．]\s+(.+)$/):null;
  if(head||numbered){
    done();q={body:[],options:[],answer:[],explanation:[]};mode="body";
    const stem=head?head[2]:numbered[2];if(stem)q.body.push(stem);continue;
  }
  if(!q)continue;
  const answer=v.match(/^(?:答案|参考答案|正确答案)\s*[:：]\s*(.*)$/);
  const explain=v.match(/^(?:解析|答案解析|解题过程)\s*[:：]\s*(.*)$/);
  if(answer){mode="answer";if(answer[1])q.answer.push(answer[1]);continue}
  if(explain){mode="explanation";if(explain[1])q.explanation.push(explain[1]);continue}
  const option=mode==="body"?v.match(/^[(（]?([A-Ha-h])[)）.、．:：]\s*(.*)$/):null;
  if(option){q.options.push(option[2]);continue}
  q[mode].push(raw);
 }
 done();
 return {title,coverTitle:title,template:"exam",layout:"a4",sourceName:filename,questions:parts};
}
function parseJSON(value,file){
 if(Array.isArray(value))value={questions:value};
 if(value?.data?.questions)value=value.data;
 if(!value||!Array.isArray(value.questions))return null;
 const title=text(value.title||value.name||file)||file;
 const questions=value.questions.map((q,i)=>{
  const options=Array.isArray(q.options)?q.options.map(opt=>typeof opt==="string"?opt:text(opt.text||opt.content||opt.label||"")):
    q.options&&typeof q.options==="object"?Object.keys(q.options).sort().map(k=>text(q.options[k])):[];
  const section=text(q.section||q.section_title||"");
  return {...q,id:String(q.id||q.localId||"import-"+Date.now().toString(36)+"-"+i),
   section,content:text(q.content||q.stem||q.question||q.question_latex||q.text||""),
   options,answer:text(q.answer||q.correct_answer||""),explanation:text(q.explanation||q.analysis||q.answer_explanation||""),
   type:q.type|| (section.includes("选择")?"选择题":section.includes("填空")?"填空题":"解答题"),
   showOptions:q.showOptions===undefined?section.includes("选择")||options.length>1:!!q.showOptions
  };
 }).filter(q=>q.content||q.options.length);
 return {version:2,type:"everflow-local-paper",title,coverTitle:value.coverTitle||title,
  template:value.template==="book"?"book":"exam",layout:value.layout||"a4",header:value.header||"",
  tocEnabled:value.tocEnabled===true,sourceName:file,questions};
}
function showImportDialog(items,filename,invalid){
 $("workspaceDialogTitle").textContent="ZIP 题库 · 批量导入";
 const box=$("workspaceDialogContent");box.replaceChildren();
 box.append(make("p","workspace-description","本次识别 "+items.length+" 份试卷，题目保存在当前浏览器。导入不会覆盖已有试卷或历史记录。"));
 const preview=make("div","workspace-import-preview");
 items.slice(0,15).forEach(item=>preview.append(make("div","workspace-import-preview-item",item.title+" · "+item.questions.length+" 题")));
 if(items.length>15)preview.append(make("small","","另有 "+(items.length-15)+" 份…"));
 if(invalid)preview.append(make("small","workspace-import-warning","另外跳过 "+invalid+" 个无法识别的文件。"));
 box.append(preview);
 const choose=make("label","workspace-import-label","存放位置");
 const folder=make("select","workspace-input");
 folder.add(new Option("为 ZIP 新建文件夹","_new"));folder.add(new Option("放入根目录",""));
 const custom=make("input","workspace-input");custom.maxLength=60;custom.value=filename.slice(0,60);
 folder.onchange=()=>custom.hidden=folder.value!=="_new";
 choose.append(folder,custom);box.append(choose);
 db.listFolders().then(folders=>folders.forEach(f=>folder.add(new Option("已有 · "+f.name,f.id)))).catch(()=>{});
 const action=make("button","workspace-action primary","导入全部 "+items.length+" 份试卷");
 action.type="button";
 action.onclick=async()=>{
  action.disabled=true;
  try{
   let location=folder.value;
   if(location==="_new")location=(await db.createFolder(custom.value)).id;
   const saved=await db.saveBatch(items,location);
   localStorage.setItem("everflow-workspace-folder-v2",location);
   // Refresh the local file-tree via the event interface, not a hard reload:
   // current unsaved question editing remains intact.
   document.dispatchEvent(new CustomEvent("everflow:archive-changed"));
   $("workspaceDialog").hidden=true;
   notice("成功导入 "+saved.length+" 份试卷，已保存到文件夹");
  }catch(e){notice("导入失败："+e.message)}
  finally{action.disabled=false}
 };
 box.append(action);$("workspaceDialog").hidden=false;
}
async function handleZip(file){
 if(!file)return;
 const trigger=$("importWorkspaceZip");
 if(file.size>maxZip){notice("ZIP 最大支持 25 MB，请拆分后重试");return}
 if(!window.JSZip){notice("ZIP 解包组件不可用，请刷新后检查网络连接");return}
 trigger.disabled=true;const original=trigger.textContent;trigger.textContent="正在解包…";
 try{
  const zip=await JSZip.loadAsync(file);
  const files=Object.values(zip.files).filter(x=>!x.dir&&!x.name.startsWith("__MACOSX/"));
  if(files.length>500)throw Error("ZIP 中文件超过 500 个，为避免卡顿已停止解析");
  const candidates=files.filter(x=>/\.(md|markdown|json|everflow)$/i.test(x.name)&&!/(?:^|\/)papers\.json$/i.test(x.name));
  if(!candidates.length)throw Error("ZIP 内需要 .md、.json 或 .everflow 试卷文件");
  if(candidates.length>120)throw Error("每次最多导入 120 份文件");
  let total=0,invalid=0;const papers=[];
  for(const entry of candidates){
   const source=await entry.async("string");total+=source.length;
   if(total>maxText)throw Error("解压文本累计超过 40 MB，已终止解析");
   if(source.length>maxPaper){invalid++;continue}
   let parsed;
   try{
    parsed=/\.(md|markdown)$/i.test(entry.name)?parseMarkdown(source,safeFilename(entry.name)):
      parseJSON(JSON.parse(source),safeFilename(entry.name));
   }catch(e){invalid++;continue}
   if(parsed&&parsed.questions.length)papers.push(parsed);else invalid++;
  }
  if(!papers.length)throw Error("文件中没有能够转换的试题。请确保是 Everflow Markdown、JSON 或 .everflow 工程格式");
  showImportDialog(papers,file.name.replace(/\.zip$/i,""),invalid);
 }catch(e){notice("ZIP 无法导入："+e.message)}
 finally{trigger.disabled=false;trigger.textContent=original;$("workspaceZipInput").value=""}
}
function initialize(){
 $("importWorkspaceZip").onclick=()=>$("workspaceZipInput").click();
 $("workspaceZipInput").onchange=e=>handleZip(e.target.files?.[0]);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initialize);else initialize();
})();
(function(){
"use strict";
var STORAGE_KEY="zuotiben-local-paper-v1";
var ARCHIVE=window.EverflowArchive;
var THEME_KEY="zuotiben-paper-theme-v1";
var els={};

function byId(id){return document.getElementById(id)}
function $(id){return byId(id)}
function cleanText(v){return String(v==null?"":v).replace(/\r\n?/g,"\n").trim()}
function uid(){return "local-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,8)}
function toast(msg){els.toast.textContent=msg;els.toast.classList.add("show");clearTimeout(toast.t);toast.t=setTimeout(function(){els.toast.classList.remove("show")},2000)}
function normalizeOption(v){return cleanText(typeof v==="object"&&v?(v.text||v.content||v.label||""):v)}
function normalizeQuestion(raw,index){
  raw=raw||{};
  var options=[];
  if(Array.isArray(raw.options))options=raw.options.map(normalizeOption);
  else if(raw.options&&typeof raw.options==="object")Object.keys(raw.options).sort().forEach(function(k){options.push(normalizeOption(raw.options[k]))});
  return {
    id:String(raw.localId||raw.id||uid()),
    importedIndex:index,
    content:cleanText(raw.content||raw.stem||raw.question||raw.text||raw.title||""),
    options:options,
    source:"local",latexEnabled:false,type:raw.type,section:raw.section,gap:raw.gap,showOptions:raw.showOptions,breakBefore:raw.breakBefore===true,
    answer:cleanText(raw.answer||raw.correct_answer||""),explanation:cleanText(raw.explanation||raw.analysis||"")
  };
}
function parseMarkdown(text,fileName){
 var title=(fileName||"").replace(/\.(md|markdown)$/i,"")||"本地试卷",
     section="",questions=[],current=null,mode="stem";
 function finish(){
   if(!current)return;
   current.content=cleanText(current.body.join("\n"));
   current.answer=cleanText(current.answerLines.join("\n"));
   current.explanation=cleanText(current.explanationLines.join("\n"));
   delete current.body;delete current.answerLines;delete current.explanationLines;
   if(current.content||current.options.length){
     current.importedIndex=questions.length;
     current.type=(current.section.includes("选择")?"选择题":current.section.includes("填空")?"填空题":current.options.length?"选择题":"解答题");
     current.showOptions=current.section?current.section.includes("选择"):current.options.length>0;
     questions.push(current);
   }current=null;
 }
 cleanText(text).split("\n").forEach(function(raw){
   const line=raw.trim(),top=line.match(/^#\s+(.+)$/);
   if(top&&!questions.length&&!current){title=cleanText(top[1]);return}
   const sectionHead=line.match(/^##\s+((?:[一二三四五六七八九十]+[、．.]|第[一二三四五六七八九十]+部分).+)$/);
   if(sectionHead){finish();section=cleanText(sectionHead[1]);return}
   const qHead=line.match(/^#{2,3}\s*(?:第\s*)?(\d+)(?:\s*题)?(?:\s*[、.．:\-]\s*(.+))?$/);
   const num=line.match(/^\s*(\d+)[.、．]\s+(.+)$/);
   if(qHead||(!current&&num)){
     finish();
     current={id:uid(),body:[],options:[],answerLines:[],explanationLines:[],section:section,source:"local",latexEnabled:false};
     let tail=cleanText(qHead?(qHead[2]||""):num[2]);if(tail)current.body.push(tail);
     mode="stem";return;
   }
   if(!current)return;
   const answer=line.match(/^(?:答案|参考答案|正确答案)\s*[：:]\s*(.*)$/);
   const explanation=line.match(/^(?:解析|答案解析|解题过程)\s*[：:]\s*(.*)$/);
   if(answer){mode="answer";if(answer[1])current.answerLines.push(answer[1]);return}
   if(explanation){mode="explanation";if(explanation[1])current.explanationLines.push(explanation[1]);return}
   const option=line.match(/^[(（]?([A-Ha-h])[)）.、．:：]\s*(.*)$/);
   if(mode==="stem"&&option){current.options.push(cleanText(option[2]));return}
   if(mode==="answer")current.answerLines.push(raw);
   else if(mode==="explanation")current.explanationLines.push(raw);
   else current.body.push(raw);
 });
 finish();
 if(!questions.length){
   cleanText(text).split(/\n{2,}/).filter(Boolean).forEach((b,i)=>questions.push(normalizeQuestion({content:b},i)));
 }
 return {title,questions};
}
function parseJson(text,fileName){
  var data=JSON.parse(text),title=(fileName||"").replace(/\.(json|everflow)$/i,"")||"本地试卷",list=[];
  if(Array.isArray(data))list=data;
  else if(data&&Array.isArray(data.questions)){list=data.questions;title=cleanText(data.title||data.name||title)}
  else throw new Error("JSON 中没有 questions 数组");
  return {title:title,coverTitle:data.coverTitle||title,template:data.template,layout:data.layout||data.mode,header:data.header,originalIds:data.originalIds,questions:list.map(normalizeQuestion).filter(function(q){return q.content||q.options.length})};
}
function parseFile(file,text){
  var lower=file.name.toLowerCase();
  return lower.endsWith(".json")||lower.endsWith(".everflow")?parseJson(text,file.name):parseMarkdown(text,file.name);
}
async function saveAndOpen(parsed,fileName){
  var payload={
    template:parsed.template,layout:parsed.layout,header:parsed.header,coverTitle:parsed.coverTitle||parsed.title,version:2,type:"everflow-local-paper",title:parsed.title||"本地试卷",sourceName:fileName||"本地文件",
    savedAt:new Date().toISOString(),
    questions:parsed.questions.map(function(q){return Object.assign({},q,{localId:q.id,source:"local",latexEnabled:false})}),
    originalIds:parsed.originalIds||parsed.questions.map(function(q){return q.id})
  };
  // Save the previous active paper before replacing the compatibility draft.
  if(ARCHIVE){
    try{
      let current=JSON.parse(localStorage.getItem(STORAGE_KEY)||"null");
      if(current&&Array.isArray(current.questions)&&current.questions.length)
        await ARCHIVE.savePaper(current,{checkpoint:true,label:"导入前备份"});
      await ARCHIVE.savePaper(payload,{id:"import-"+uid(),checkpoint:true,label:"新导入试卷"});
    }catch(e){console.warn("IndexedDB archive unavailable, keeping local draft",e)}
  }
  localStorage.setItem(STORAGE_KEY,JSON.stringify(payload));
  location.href="./editor/";
}
async function importFile(file){
  if(!file)return;
  if(file.size>8*1024*1024){toast("文件过大：当前限制 8 MB");return}
  try{
    var parsed=parseFile(file,await file.text());
    if(!parsed.questions.length)throw new Error("没有识别到题目");
    saveAndOpen(parsed,file.name);
  }catch(e){toast("导入失败："+(e.message||"格式无法识别"))}
  finally{els.fileInput.value=""}
}
function hasDraft(){
  try{
    var d=JSON.parse(localStorage.getItem(STORAGE_KEY)||"null");
    return !!(d&&Array.isArray(d.questions)&&d.questions.length);
  }catch(e){return false}
}
function aiPrompt(){
  return [
    "请完整转录我接下来提供的试卷/PDF/图片内容，并严格转换为 Everflow Markdown 导入格式。",
    "",
    "必须遵守：",
    "1. 不修改题意，不总结，不润色，不自行补题；",
    "2. 按原文保留全部题目、选项、小问和符号；",
    "3. 数学公式统一使用 LaTeX：行内公式使用 $...$，独立公式使用 $$...$$；",
    "4. 每道题必须以“## 1”“## 2”这种二级标题开始；",
    "5. 选择题选项统一为“A. …”“B. …”“C. …”“D. …”；",
    "6. (1)(2)(3)、I/II/III、①②③必须保留并分行；",
    "7. 不输出答案、解析或额外说明，除非原文中本来就有；",
    "8. 无法确认的字符使用【待核对：原位置】标记；",
    "9. 输出前核对积分上下限、根号、分式、矩阵、上下标、正负号、≤/≥。"
  ].join("\n");
}
async function copyPrompt(){
  try{await navigator.clipboard.writeText(aiPrompt());toast("AI 转录提示词已复制")}
  catch(e){var t=document.createElement("textarea");t.value=aiPrompt();document.body.appendChild(t);t.select();document.execCommand("copy");t.remove();toast("AI 转录提示词已复制")}
}
function downloadTemplate(){
  var text=["# 2026 数学模拟卷","","## 1","设函数 $f(x)=x^2$，则 $f'(x)=$","","A. $x$","B. $2x$","C. $x^2$","D. $2$","","## 2","设矩阵 $A=\\begin{bmatrix}1&2\\\\3&4\\end{bmatrix}$，求：","","(1) 求 $\\det A$；","(2) 求 $A^{-1}$。"].join("\n");
  var blob=new Blob([text],{type:"text/markdown;charset=utf-8"}),a=document.createElement("a");
  a.href=URL.createObjectURL(blob);a.download="Everflow-本地题目导入模板.md";a.click();setTimeout(function(){URL.revokeObjectURL(a.href)},500);
}
function showModal(v){els.formatModal.hidden=!v;document.body.style.overflow=v?"hidden":""}
function initTheme(){
  if(localStorage.getItem(THEME_KEY)==="dark")document.body.classList.add("dark");
  els.themeToggle.onclick=function(){document.body.classList.toggle("dark");localStorage.setItem(THEME_KEY,document.body.classList.contains("dark")?"dark":"light")};
}
function init(){
  ["toast","themeToggle","fileInput","importButton","openProjectButton","copyPromptButton","downloadTemplateButton","continueButton","howButton","formatModal","startBlankButton","dropZone"].forEach(function(id){els[id]=byId(id)});
  initTheme();
  els.startBlankButton.onclick=function(){
    // Previous drafts are now backed up to the local project archive before creating a new paper.
    var questions=[
      normalizeQuestion({content:"设函数 $f(x)=x^2+2x$，则 $f'(1)=$（　）。",options:["$2$","$3$","$4$","$5$"],section:"选择题（共 10 小题，每题 5 分）"},0),
      normalizeQuestion({content:"设矩阵 $A=\\begin{bmatrix}1&2\\\\3&4\\end{bmatrix}$，求 $\\det A$。",section:"解答题"},1)
    ];
    saveAndOpen({title:"未命名试卷",coverTitle:"未命名试卷",questions:questions},"新建示例工程");
  };
  var dropZone=els.dropZone;
  ["dragenter","dragover"].forEach(function(type){
    dropZone.addEventListener(type,function(e){e.preventDefault();e.stopPropagation();dropZone.classList.add("drag-over")});
  });
  ["dragleave","dragend"].forEach(function(type){
    dropZone.addEventListener(type,function(e){e.preventDefault();e.stopPropagation();dropZone.classList.remove("drag-over")});
  });
  dropZone.addEventListener("drop",function(e){
    e.preventDefault();e.stopPropagation();dropZone.classList.remove("drag-over");
    var file=e.dataTransfer&&e.dataTransfer.files&&e.dataTransfer.files[0];
    if(file){
      if(!/\.(md|markdown|json|everflow)$/i.test(file.name)){toast("暂不支持此格式，请使用 .md、.json 或 .everflow");return}
      importFile(file);
    }
  });
  document.addEventListener("dragover",function(e){if(e.dataTransfer&&e.dataTransfer.types.includes("Files"))e.preventDefault()});
  document.addEventListener("drop",function(e){if(e.dataTransfer&&e.dataTransfer.files.length)e.preventDefault()});
  els.importButton.onclick=function(){els.fileInput.click()};
  els.openProjectButton.onclick=function(){els.fileInput.click()};
  els.fileInput.onchange=function(){importFile(els.fileInput.files&&els.fileInput.files[0])};
  els.copyPromptButton.onclick=function(){$("aiPromptModal").hidden=false};
  $("aiPromptClose").onclick=function(){$("aiPromptModal").hidden=true};
  $("aiPromptModal").onclick=function(e){if(e.target===$("aiPromptModal"))$("aiPromptModal").hidden=true};
  document.querySelectorAll(".ai-copy").forEach(function(btn){
    btn.onclick=async function(){
      var platform=btn.dataset.ai||"AI";
      var prompt="请作为"+platform+"题目转录助手，严格遵守以下要求：\n\n"+aiPrompt()+"\n\n按原卷标题、所属大题输出 Markdown；选择题选项 A. B. C. D.，如有答案与解析可分别以『答案：』『解析：』开头保留。";
      try{await navigator.clipboard.writeText(prompt)}catch(e){
        var ta=document.createElement("textarea");ta.value=prompt;document.body.appendChild(ta);ta.select();document.execCommand("copy");ta.remove();
      }
      $("aiPromptModal").hidden=true;toast(platform+" 提示词已复制");
    };
  });
  $("pasteImportButton").onclick=function(){
    var markdown=$("pasteMarkdown").value;
    if(!markdown.trim()){toast("先粘贴 Markdown 内容");return}
    var parsed=parseMarkdown(markdown,"粘贴的题目.md");
    if(!parsed.questions.length){toast("未找到可导入的题目，请核对标题格式");return}
    saveAndOpen(parsed,"网页粘贴 Markdown").catch(e=>toast("转换失败："+e.message));
  };
  els.downloadTemplateButton.onclick=downloadTemplate;
  els.howButton.onclick=function(){showModal(true)};
  document.querySelectorAll("[data-modal-close]").forEach(function(x){x.onclick=function(){showModal(false)}});
  document.addEventListener("keydown",function(e){if(e.key==="Escape")showModal(false)});
  if(hasDraft()){els.continueButton.hidden=false;els.continueButton.onclick=function(){location.href="./editor/"}}
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();

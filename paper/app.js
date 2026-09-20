(function(){
"use strict";
var STORAGE_KEY="zuotiben-local-paper-v1";
var THEME_KEY="zuotiben-paper-theme-v1";
var els={};

function byId(id){return document.getElementById(id)}
function cleanText(v){return String(v==null?"":v).replace(/\r\n?/g,"\n").trim()}
function uid(){return "local-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,8)}
function toast(msg){els.toast.textContent=msg;els.toast.classList.add("show");clearTimeout(toast.t);toast.t=setTimeout(function(){els.toast.classList.remove("show")},2000)}
function normalizeOption(v){return cleanText(typeof v==="object"&&v?(v.text||v.content||v.label||""):v)}
function normalizeQuestion(raw,index){
  raw=raw||{};
  var options=[];
  if(Array.isArray(raw.options))options=raw.options.map(normalizeOption).filter(Boolean);
  else if(raw.options&&typeof raw.options==="object")Object.keys(raw.options).sort().forEach(function(k){options.push(normalizeOption(raw.options[k]))});
  return {
    id:String(raw.localId||raw.id||uid()),
    importedIndex:index,
    content:cleanText(raw.content||raw.stem||raw.question||raw.text||raw.title||""),
    options:options,
    source:"local",latexEnabled:false
  };
}
function parseMarkdown(text,fileName){
  var lines=cleanText(text).split("\n");
  var title=(fileName||"").replace(/\.(md|markdown)$/i,"")||"本地试卷";
  var questions=[],current=null;
  function finish(){
    if(!current)return;
    current.content=cleanText(current.body.join("\n"));delete current.body;
    if(current.content||current.options.length){current.importedIndex=questions.length;questions.push(current)}
    current=null;
  }
  lines.forEach(function(line){
    var titleMatch=line.match(/^#\s+(.+?)\s*$/);
    if(titleMatch&&!questions.length&&!current){title=cleanText(titleMatch[1]);return}
    var qHead=line.match(/^##\s*(?:第\s*)?(\d+)(?:\s*题)?(?:[.、．:\s-]+(.*))?$/i);
    var numbered=line.match(/^\s*(\d+)[.、．]\s+(.+)$/);
    if(qHead||(!current&&numbered)){
      finish();
      var tail=qHead?cleanText(qHead[2]||""):cleanText(numbered[2]||"");
      current={id:uid(),body:tail?[tail]:[],options:[],source:"local",latexEnabled:false};return;
    }
    if(!current)return;
    var option=line.match(/^\s*([A-Ha-h])[.、．:：]\s*(.+)$/);
    if(option){current.options.push(cleanText(option[2]));return}
    current.body.push(line);
  });
  finish();
  if(!questions.length){
    cleanText(text).split(/\n{2,}/).filter(Boolean).forEach(function(block,i){questions.push(normalizeQuestion({content:block},i))});
  }
  return {title:title,questions:questions};
}
function parseJson(text,fileName){
  var data=JSON.parse(text),title=(fileName||"").replace(/\.(json|everflow)$/i,"")||"本地试卷",list=[];
  if(Array.isArray(data))list=data;
  else if(data&&Array.isArray(data.questions)){list=data.questions;title=cleanText(data.title||data.name||title)}
  else throw new Error("JSON 中没有 questions 数组");
  return {title:title,questions:list.map(normalizeQuestion).filter(function(q){return q.content||q.options.length})};
}
function parseFile(file,text){
  var lower=file.name.toLowerCase();
  return lower.endsWith(".json")||lower.endsWith(".everflow")?parseJson(text,file.name):parseMarkdown(text,file.name);
}
function saveAndOpen(parsed,fileName){
  var payload={
    version:1,type:"everflow-local-paper",title:parsed.title||"本地试卷",sourceName:fileName||"本地文件",
    savedAt:new Date().toISOString(),
    questions:parsed.questions.map(function(q){return {localId:q.id,content:q.content,options:q.options,source:"local",latexEnabled:false}}),
    originalIds:parsed.questions.map(function(q){return q.id})
  };
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
  ["toast","themeToggle","fileInput","importButton","openProjectButton","copyPromptButton","downloadTemplateButton","continueButton","howButton","formatModal"].forEach(function(id){els[id]=byId(id)});
  initTheme();
  els.importButton.onclick=function(){els.fileInput.click()};
  els.openProjectButton.onclick=function(){els.fileInput.click()};
  els.fileInput.onchange=function(){importFile(els.fileInput.files&&els.fileInput.files[0])};
  els.copyPromptButton.onclick=copyPrompt;els.downloadTemplateButton.onclick=downloadTemplate;
  els.howButton.onclick=function(){showModal(true)};
  document.querySelectorAll("[data-modal-close]").forEach(function(x){x.onclick=function(){showModal(false)}});
  document.addEventListener("keydown",function(e){if(e.key==="Escape")showModal(false)});
  if(hasDraft()){els.continueButton.hidden=false;els.continueButton.onclick=function(){location.href="./editor/"}}
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
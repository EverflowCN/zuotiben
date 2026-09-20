(function(){
"use strict";
var STORAGE_KEY="zuotiben-local-paper-v1";
var state={title:"未命名试卷",sourceName:"本地文件",questions:[],originalIds:[]};
var compileMode=false, questionMoveEnabled=true;
var els={};

function byId(id){return document.getElementById(id)}
function cleanText(v){return String(v==null?"":v).replace(/\r\n?/g,"\n").trim()}
function clip(v,n){var s=String(v||"").replace(/\s+/g," ").trim();return s.length>n?s.slice(0,n-1)+"…":s}
function toast(msg){els.toast.textContent=msg;els.toast.classList.add("show");clearTimeout(toast.t);toast.t=setTimeout(function(){els.toast.classList.remove("show")},1800)}
function normalizeOption(v){return cleanText(typeof v==="object"&&v?(v.text||v.content||v.label||""):v)}
function normalizeQuestion(raw,index){
  raw=raw||{};
  var options=Array.isArray(raw.options)?raw.options.map(normalizeOption).filter(Boolean):[];
  return {
    id:String(raw.localId||raw.id||("local-"+index)),
    content:cleanText(raw.content||raw.stem||raw.question||raw.text||raw.title||""),
    options:options,
    source:"local",latexEnabled:false
  };
}
function load(){
  try{
    var raw=localStorage.getItem(STORAGE_KEY);
    if(!raw)return false;
    var d=JSON.parse(raw);
    if(!d||!Array.isArray(d.questions)||!d.questions.length)return false;
    state.title=cleanText(d.title||"本地试卷");
    state.sourceName=cleanText(d.sourceName||"浏览器本地草稿");
    state.questions=d.questions.map(normalizeQuestion);
    state.originalIds=Array.isArray(d.originalIds)&&d.originalIds.length?d.originalIds.map(String):state.questions.map(function(q){return q.id});
    return true;
  }catch(e){return false}
}
function save(){
  localStorage.setItem(STORAGE_KEY,JSON.stringify({
    version:1,type:"everflow-local-paper",title:state.title,sourceName:state.sourceName,
    savedAt:new Date().toISOString(),
    questions:state.questions.map(function(q){return {localId:q.id,content:q.content,options:q.options,source:"local",latexEnabled:false}}),
    originalIds:state.originalIds
  }));
}
function renderMath(root){
  if(!(window.temml&&typeof window.temml.renderMathInElement==="function"))return;
  try{
    window.temml.renderMathInElement(root,{
      delimiters:[
        {left:"$$",right:"$$",display:true},
        {left:"\\[",right:"\\]",display:true},
        {left:"\\(",right:"\\)",display:false},
        {left:"$",right:"$",display:false}
      ],
      throwOnError:false,strict:false,trust:false,maxExpand:1000,maxSize:50
    });
  }catch(e){}
}
function textWithBreaks(root,text){
  String(text||"").split(/\n+/).forEach(function(line){
    if(!line.trim())return;
    var p=document.createElement("p");p.textContent=line.trim();root.appendChild(p);
  });
}
function move(from,to){
  if(to<0||to>=state.questions.length||from===to)return;
  var q=state.questions.splice(from,1)[0];state.questions.splice(to,0,q);save();render();
}
function renderOrder(){
  els.orderList.innerHTML="";
  state.questions.forEach(function(q,i){
    var row=document.createElement("div");row.className="order-item";row.draggable=true;row.dataset.index=i;
    var h=document.createElement("span");h.className="drag-handle";h.textContent="⋮⋮";
    var n=document.createElement("span");n.className="order-num";n.textContent=i+1;
    var c=document.createElement("span");c.className="order-copy";
    var b=document.createElement("b");b.textContent=clip(q.content,42)||"未命名题目";
    var s=document.createElement("small");s.textContent=q.options.length?("选择题 · "+q.options.length+" 个选项"):"题目";
    c.appendChild(b);c.appendChild(s);
    var ctr=document.createElement("span");ctr.className="order-controls";
    var up=document.createElement("button");up.type="button";up.textContent="↑";up.disabled=i===0;up.onclick=function(){move(i,i-1)};
    var dn=document.createElement("button");dn.type="button";dn.textContent="↓";dn.disabled=i===state.questions.length-1;dn.onclick=function(){move(i,i+1)};
    ctr.appendChild(up);ctr.appendChild(dn);
    row.appendChild(h);row.appendChild(n);row.appendChild(c);row.appendChild(ctr);els.orderList.appendChild(row);
  });
}
function renderPaper(){
  els.paperQuestions.innerHTML="";
  els.previewTitle.textContent=state.title;
  els.previewMeta.textContent="本地排版 · "+state.questions.length+" 题";
  state.questions.forEach(function(q,i){
    var sec=document.createElement("section");sec.className="question";sec.dataset.index=i;sec.draggable=compileMode&&questionMoveEnabled;
    var tools=document.createElement("div");tools.className="question-move-tools";
    var grip=document.createElement("span");grip.className="move-grip";grip.textContent="⋮⋮";
    var up=document.createElement("button");up.type="button";up.textContent="↑";up.disabled=i===0;up.onclick=function(e){e.stopPropagation();move(i,i-1)};
    var dn=document.createElement("button");dn.type="button";dn.textContent="↓";dn.disabled=i===state.questions.length-1;dn.onclick=function(e){e.stopPropagation();move(i,i+1)};
    tools.appendChild(grip);tools.appendChild(up);tools.appendChild(dn);sec.appendChild(tools);

    var line=document.createElement("div");line.className="question-line";
    var num=document.createElement("div");num.className="question-number";num.textContent=(i+1)+".";
    var body=document.createElement("div");body.className="question-body";textWithBreaks(body,q.content);
    line.appendChild(num);line.appendChild(body);sec.appendChild(line);
    if(q.options.length){
      var opts=document.createElement("div");opts.className="options";
      var max=q.options.reduce(function(m,o){return Math.max(m,String(o).replace(/\s+/g,"").length)},0);
      opts.classList.add(max<=14?"cols-4":max<=34?"cols-2":"cols-1");
      q.options.forEach(function(o,j){var d=document.createElement("div");d.className="option";d.textContent=String.fromCharCode(65+j)+". "+o;opts.appendChild(d)});
      sec.appendChild(opts);
    }
    els.paperQuestions.appendChild(sec);renderMath(sec);
  });
  updatePages();
}
function render(){
  els.paperName.textContent=state.title;els.questionCount.textContent=state.questions.length;els.sourceName.textContent=state.sourceName;
  renderOrder();renderPaper();
}
function updatePages(){
  requestAnimationFrame(function(){
    var pages=Math.max(1,Math.ceil(els.paperSheet.scrollHeight/1122.52));
    els.previewPageCurrent.textContent="1";els.previewPageTotal.textContent=String(pages);
  });
}
function bindDrag(container,selector,dropClass){
  var from=null;
  container.addEventListener("dragstart",function(e){
    var row=e.target.closest(selector);if(!row)return;
    if(selector===".question"&&(!compileMode||!questionMoveEnabled)){e.preventDefault();return}
    from=Number(row.dataset.index);row.classList.add(selector===".question"?"paper-dragging":"dragging");
  });
  container.addEventListener("dragover",function(e){
    var row=e.target.closest(selector);if(!row)return;e.preventDefault();
    container.querySelectorAll(selector).forEach(function(x){x.classList.remove(dropClass)});row.classList.add(dropClass);
  });
  container.addEventListener("drop",function(e){
    var row=e.target.closest(selector);if(!row||from==null)return;e.preventDefault();var to=Number(row.dataset.index);move(from,to);from=null;
  });
  container.addEventListener("dragend",function(){from=null;container.querySelectorAll(selector).forEach(function(x){x.classList.remove("dragging","paper-dragging",dropClass)})});
}
function setCompile(v){
  compileMode=!!v;document.body.classList.toggle("compile-mode",compileMode);document.body.classList.toggle("question-move-on",compileMode&&questionMoveEnabled);
  els.compileBar.hidden=!compileMode;els.compileModeButton.textContent=compileMode?"退出编译模式":"进入编译模式";renderPaper();window.scrollTo({top:0,behavior:"smooth"});
}
async function printPaper(){
  try{if(document.fonts&&document.fonts.ready)await document.fonts.ready}catch(e){}
  renderPaper();requestAnimationFrame(function(){window.print()});
}
function exportProject(){
  var data={version:1,type:"everflow-local-paper",title:state.title,localOnly:true,latexEnabled:false,questions:state.questions.map(function(q){return {localId:q.id,content:q.content,options:q.options}})};
  var blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
  var a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=(state.title||"everflow-paper").replace(/[\\/:*?"<>|]+/g,"-")+".everflow";a.click();setTimeout(function(){URL.revokeObjectURL(a.href)},500);
}
function init(){
  ["toast","paperName","questionCount","sourceName","orderList","paperSheet","paperQuestions","previewTitle","previewMeta","previewPageCurrent","previewPageTotal","compileBar","compileModeButton","compileOrderButton","compileExitButton","compilePrintButton","printButton","saveProjectButton","resetOrderButton","clearButton"].forEach(function(id){els[id]=byId(id)});
  if(!load()){location.replace("../");return}
  bindDrag(els.orderList,".order-item","drop-before");
  bindDrag(els.paperQuestions,".question","paper-drop-before");
  els.compileModeButton.onclick=function(){setCompile(!compileMode)};
  els.compileExitButton.onclick=function(){setCompile(false)};
  els.compileOrderButton.onclick=function(){questionMoveEnabled=!questionMoveEnabled;document.body.classList.toggle("question-move-on",questionMoveEnabled);els.compileOrderButton.textContent="题目移动："+(questionMoveEnabled?"开启":"关闭");renderPaper()};
  els.compilePrintButton.onclick=printPaper;els.printButton.onclick=printPaper;els.saveProjectButton.onclick=exportProject;
  els.resetOrderButton.onclick=function(){var rank={};state.originalIds.forEach(function(id,i){rank[id]=i});state.questions.sort(function(a,b){return (rank[a.id]??9999)-(rank[b.id]??9999)});save();render();toast("已恢复导入顺序")};
  els.clearButton.onclick=function(){if(confirm("清空当前本地试卷？")){localStorage.removeItem(STORAGE_KEY);location.replace("../")}};
  window.addEventListener("resize",updatePages);
  render();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
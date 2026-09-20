(function(){
"use strict";
var STORAGE_KEY="zuotiben-local-paper-v1";
var state={title:"未命名试卷",sourceName:"本地文件",questions:[],originalIds:[]};
var compileMode=false, questionMoveEnabled=false, pdfExporting=false;
var selectedId=null, previewMode=false, revision=0, pdfRevision=-1, pdfBlob=null, pdfUrl=null;
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
    type:raw.type|| (options.length?"选择题":"解答题"),section:cleanText(raw.section||""),gap:Math.max(0,Math.min(100,Number(raw.gap)||0)),showOptions:raw.showOptions!==false,
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
    state.template=d.template==="book"?"book":"exam";state.header=cleanText(d.header||"");
    state.sourceName=cleanText(d.sourceName||"浏览器本地草稿");
    state.questions=d.questions.map(normalizeQuestion);
    state.originalIds=Array.isArray(d.originalIds)&&d.originalIds.length?d.originalIds.map(String):state.questions.map(function(q){return q.id});
    return true;
  }catch(e){return false}
}
function save(){
  revision++;
  els.pdfPreview.hidden=true;document.querySelector(".paper-stage").hidden=false;
  if(pdfBlob)els.pdfStatus.textContent="内容已修改，编译预览后查看最新 PDF。";
  try{localStorage.setItem(STORAGE_KEY,JSON.stringify({
    version:1,type:"everflow-local-paper",title:state.title,sourceName:state.sourceName,template:state.template,header:state.header,
    savedAt:new Date().toISOString(),
    questions:state.questions.map(function(q){return Object.assign({},q,{localId:q.id})}),
    originalIds:state.originalIds
  }));}catch(e){toast("本机存储已满，请保存 .everflow 文件，避免修改丢失") }
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
    var row=document.createElement("div");row.className="order-item"+(q.id===selectedId?" is-selected":"");row.draggable=true;row.dataset.index=i;
    var h=document.createElement("span");h.className="drag-handle";h.textContent="⋮⋮";
    var n=document.createElement("span");n.className="order-num";n.textContent=i+1;
    var c=document.createElement("span");c.className="order-copy";
    var b=document.createElement("b");b.textContent=clip(q.content,42)||"未命名题目";
    var s=document.createElement("small");s.textContent=q.options.length?("选择题 · "+q.options.length+" 个选项"):"题目";
    c.appendChild(b);c.appendChild(s);c.tabIndex=0;c.setAttribute("role","button");c.setAttribute("aria-label","编辑第 "+(i+1)+" 题");c.onclick=function(){selectedId=q.id;renderOrder();renderQuestionEditor()};c.onkeydown=function(e){if(e.key==="Enter"||e.key===" "){e.preventDefault();c.click()}};
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
  var head=document.querySelector(".paper-running-head");head.classList.toggle("book-head",state.template==="book");head.replaceChildren();
  (state.template==="book"?["彼时流年若水",state.header,"https://zuotiben.top"]:["Everflow·彼时流年若水"]).forEach(function(t){var n=document.createElement("span");n.textContent=t;head.appendChild(n)});
  state.questions.forEach(function(q,i){
    if(q.section&&(i===0||state.questions[i-1].section!==q.section)){var heading=document.createElement("h2");heading.textContent=q.section;heading.style.fontSize="inherit";els.paperQuestions.appendChild(heading)}
    var sec=document.createElement("section");sec.className="question";sec.dataset.index=i;if(q.gap)sec.style.marginBottom=q.gap+"mm";sec.draggable=compileMode&&questionMoveEnabled;
    var tools=document.createElement("div");tools.className="question-move-tools";
    var grip=document.createElement("span");grip.className="move-grip";grip.textContent="⋮⋮";
    var up=document.createElement("button");up.type="button";up.textContent="↑";up.disabled=i===0;up.onclick=function(e){e.stopPropagation();move(i,i-1)};
    var dn=document.createElement("button");dn.type="button";dn.textContent="↓";dn.disabled=i===state.questions.length-1;dn.onclick=function(e){e.stopPropagation();move(i,i+1)};
    tools.appendChild(grip);tools.appendChild(up);tools.appendChild(dn);sec.appendChild(tools);

    var line=document.createElement("div");line.className="question-line";
    var num=document.createElement("div");num.className="question-number";num.textContent=(i+1)+".";
    var body=document.createElement("div");body.className="question-body";textWithBreaks(body,q.content);
    line.appendChild(num);line.appendChild(body);sec.appendChild(line);
    if(q.showOptions&&q.options.length){
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
  renderOrder();renderPaper();renderQuestionEditor();
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
function setMode(preview){
  previewMode=!!preview;document.body.classList.toggle("preview-mode",previewMode);
  els.editModeButton.setAttribute("aria-pressed",String(!previewMode));els.previewModeButton.setAttribute("aria-pressed",String(previewMode));
  els.pdfPreview.hidden=!(previewMode&&pdfBlob&&pdfRevision===revision);
  document.querySelector(".paper-stage").hidden=!els.pdfPreview.hidden;
}
function renderQuestionEditor(){
  var root=els.questionEditor;root.replaceChildren();
  var q=state.questions.find(function(q){return q.id===selectedId});if(!q)return;
  var h=document.createElement("h3");h.textContent="编辑第 "+(state.questions.indexOf(q)+1)+" 题";root.appendChild(h);
  function update(){save();renderPaper();renderOrder()}
  function field(label,key,kind){var l=document.createElement("label");l.textContent=label;var input=document.createElement(kind||"input");input.value=q[key];l.appendChild(input);root.appendChild(l);input.oninput=function(){q[key]=key==="gap"?Math.max(0,Math.min(100,Number(input.value)||0)):input.value;update()};return input}
  field("大题标题（相邻同标题合并）","section");field("题型","type");field("题干（支持 LaTeX 公式）","content","textarea");
  var gap=field("题后留白（毫米，0 使用模板间距）","gap");gap.type="number";gap.min="0";gap.max="100";
  var label=document.createElement("label"),check=document.createElement("input");check.type="checkbox";check.checked=q.showOptions;check.style.width="auto";check.style.display="inline";label.append(check,document.createTextNode(" 显示选项"));root.appendChild(label);check.onchange=function(){q.showOptions=check.checked;update()};
  q.options.forEach(function(option,i){var row=document.createElement("div");row.className="option-editor";var input=document.createElement("input");input.setAttribute("aria-label","选项 "+String.fromCharCode(65+i));input.value=option;input.oninput=function(){q.options[i]=input.value;update()};var remove=document.createElement("button");remove.type="button";remove.className="text-btn";remove.textContent="删除";remove.onclick=function(){q.options.splice(i,1);update();renderQuestionEditor()};row.append(document.createTextNode(String.fromCharCode(65+i)),input,remove);root.appendChild(row)});
  var add=document.createElement("button");add.type="button";add.className="text-btn";add.textContent="添加选项";add.disabled=q.options.length>=8;add.onclick=function(){q.options.push("");q.showOptions=true;update();renderQuestionEditor()};root.appendChild(add);
}
async function compilePdf(download){
  if(pdfExporting)return;
  pdfExporting=true;var buttons=[els.printButton,els.compileButton];buttons.forEach(function(b){b.disabled=true;b.setAttribute("aria-busy","true")});
  try{
    if(!pdfBlob||pdfRevision!==revision){
      var current=revision,snapshot=JSON.parse(JSON.stringify(state));
      els.pdfStatus.textContent="正在加载 PDF 排版组件…";
      var exporter=await import("./pdf-export.js?v=20260921-unified2");
      var blob=await exporter.createPdf(snapshot,{onStatus:function(status){els.pdfStatus.textContent=status}});
      if(current!==revision){els.pdfStatus.textContent="编译期间内容已修改，请重新编译。";return}
      if(pdfUrl)URL.revokeObjectURL(pdfUrl);pdfBlob=blob;pdfRevision=current;pdfUrl=URL.createObjectURL(blob);els.pdfPreview.src=pdfUrl;
    }
    els.pdfStatus.textContent="PDF 已生成，预览与下载使用同一份文件。";
    if(download){var a=document.createElement("a");a.href=pdfUrl;a.download=(state.title||"试卷").replace(/[\\/:*?"<>|]+/g,"-")+".pdf";document.body.appendChild(a);a.click();a.remove();toast("PDF 已开始下载")}else setMode(true);
  }catch(err){console.error(err);els.pdfStatus.textContent="PDF 生成失败："+(err.message||"请检查网络连接后重试");}
  finally{pdfExporting=false;buttons.forEach(function(b){b.disabled=false;b.removeAttribute("aria-busy")})}
}
function exportProject(){
  var data={template:state.template,header:state.header,originalIds:state.originalIds,version:1,type:"everflow-local-paper",title:state.title,localOnly:true,latexEnabled:false,questions:state.questions.map(function(q){return Object.assign({},q,{localId:q.id})})};
  var blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
  var a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=(state.title||"everflow-paper").replace(/[\\/:*?"<>|]+/g,"-")+".everflow";a.click();setTimeout(function(){URL.revokeObjectURL(a.href)},500);
}
function init(){
  ["toast","paperName","questionCount","sourceName","orderList","paperSheet","paperQuestions","previewTitle","previewMeta","previewPageCurrent","previewPageTotal","editModeButton","previewModeButton","compileButton","pdfPreview","pdfStatus","questionEditor","titleInput","headerInput","templateButton","bookHeaderLabel","printButton","saveProjectButton","resetOrderButton","clearButton"].forEach(function(id){els[id]=byId(id)});
  if(!load()){location.replace("../");return}
  bindDrag(els.orderList,".order-item","drop-before");
  bindDrag(els.paperQuestions,".question","paper-drop-before");
  selectedId=state.questions[0].id;
  els.editModeButton.onclick=function(){setMode(false)};els.previewModeButton.onclick=function(){setMode(true)};
  els.compileButton.onclick=function(){compilePdf(false)};els.printButton.onclick=function(){compilePdf(true)};els.saveProjectButton.onclick=exportProject;
  els.titleInput.value=state.title;els.headerInput.value=state.header;
  els.titleInput.oninput=function(){state.title=els.titleInput.value;save();els.paperName.textContent=state.title;renderPaper()};
  els.headerInput.oninput=function(){state.header=els.headerInput.value;save();renderPaper()};
  function templateLabel(){els.templateButton.textContent="模板："+(state.template==="book"?"Book":"Exam");els.bookHeaderLabel.hidden=state.template!=="book"}
  els.templateButton.onclick=function(){state.template=state.template==="book"?"exam":"book";templateLabel();save();renderPaper()};templateLabel();
  els.resetOrderButton.onclick=function(){var rank={};state.originalIds.forEach(function(id,i){rank[id]=i});state.questions.sort(function(a,b){return (rank[a.id]??9999)-(rank[b.id]??9999)});save();render();toast("已恢复导入顺序")};
  els.clearButton.onclick=function(){if(confirm("清空当前本地试卷？")){localStorage.removeItem(STORAGE_KEY);location.replace("../")}};
  window.addEventListener("resize",updatePages);
  render();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();

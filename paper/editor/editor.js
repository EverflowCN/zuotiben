(function(){
"use strict";

var STORAGE_KEY="zuotiben-local-paper-v1";
var MODES=window.EverflowTemplateModes;
var SAVE=window.EverflowSaveManager;
var QUESTION_TYPES=["选择题","填空题","判断题","简答题","计算题","证明题","解答题","综合题","自定义"];
var state={
  title:"未命名试卷",
  coverTitle:"未命名试卷",
  sourceName:"本地文件",
  template:"exam",
  layout:"a4",
  header:"",
  questions:[],
  originalIds:[]
};
var selectedId=null,previewMode=false,pdfExporting=false,revision=0,pdfRevision=-1,pdfBlob=null,pdfUrl=null;
var undoStack=[],redoStack=[],historyTimer=null,els={};

function byId(id){return document.getElementById(id)}
function cleanText(v){return String(v==null?"":v).replace(/\r\n?/g,"\n").trim()}
function clip(v,n){var s=String(v||"").replace(/\s+/g," ").trim();return s.length>n?s.slice(0,n-1)+"…":s}
function deepClone(v){return JSON.parse(JSON.stringify(v))}
function toast(msg){els.toast.textContent=msg;els.toast.classList.add("show");clearTimeout(toast.t);toast.t=setTimeout(function(){els.toast.classList.remove("show")},1800)}
function localDate(){
  var d=new Date();
  return d.getFullYear()+" 年 "+(d.getMonth()+1)+" 月 "+d.getDate()+" 日";
}
function modeInfo(){return MODES.mode(state.template,state.layout)}
function modeLabel(){return MODES.label(state.template,state.layout)}
function normalizeOption(v){return cleanText(typeof v==="object"&&v?(v.text||v.content||v.label||""):v)}
function normalizeQuestion(raw,index){
  raw=raw||{};
  var options=Array.isArray(raw.options)?raw.options.map(normalizeOption):[];
  return {
    id:String(raw.localId||raw.id||("local-"+index+"-"+Date.now().toString(36))),
    content:cleanText(raw.content||raw.stem||raw.question||raw.text||raw.title||""),
    options:options,
    type:raw.type|| (options.length?"选择题":"解答题"),
    section:cleanText(raw.section||""),
    gap:Math.max(0,Math.min(100,Number(raw.gap)||0)),
    showOptions:raw.showOptions!==false,
    breakBefore:raw.breakBefore===true,
    source:"local",
    latexEnabled:false
  };
}
function snapshot(){return deepClone({
  title:state.title,coverTitle:state.coverTitle,sourceName:state.sourceName,template:state.template,layout:state.layout,
  header:state.header,questions:state.questions,originalIds:state.originalIds
})}
function applySnapshot(s){
  state=s;selectedId=state.questions.some(function(q){return q.id===selectedId})?selectedId:(state.questions[0]&&state.questions[0].id);
  syncInputs();save(false);render();
}
function checkpoint(){
  clearTimeout(historyTimer);
  historyTimer=setTimeout(function(){
    var s=JSON.stringify(snapshot());
    var last=undoStack.length?JSON.stringify(undoStack[undoStack.length-1]):"";
    if(s!==last){undoStack.push(deepClone(state));if(undoStack.length>60)undoStack.shift()}
    redoStack.length=0;updateHistoryButtons();
  },300);
}
function undo(){
  if(undoStack.length<=1)return;
  var current=undoStack.pop();redoStack.push(current);
  applySnapshot(deepClone(undoStack[undoStack.length-1]));updateHistoryButtons();
}
function redo(){
  if(!redoStack.length)return;
  var next=redoStack.pop();undoStack.push(deepClone(next));
  applySnapshot(deepClone(next));updateHistoryButtons();
}
function updateHistoryButtons(){
  els.undoButton.disabled=undoStack.length<=1;
  els.redoButton.disabled=!redoStack.length;
}
function load(){
  try{
    var raw=localStorage.getItem(STORAGE_KEY);if(!raw)return false;
    var d=JSON.parse(raw);if(!d||!Array.isArray(d.questions)||!d.questions.length)return false;
    state.title=cleanText(d.title||"本地试卷");
    state.coverTitle=cleanText(d.coverTitle||d.title||"本地试卷");
    state.template=d.template==="book"?"book":"exam";
    var normalized=MODES.normalize(state.template,d.layout||d.mode);
    state.template=normalized.group;state.layout=normalized.mode;
    state.header=cleanText(d.header||"");
    state.sourceName=cleanText(d.sourceName||"浏览器本地草稿");
    state.questions=d.questions.map(normalizeQuestion);
    state.originalIds=Array.isArray(d.originalIds)&&d.originalIds.length?d.originalIds.map(String):state.questions.map(function(q){return q.id});
    return true;
  }catch(e){return false}
}
function save(markDirty){
  if(markDirty!==false){revision++;checkpoint()}
  if(pdfBlob&&pdfRevision!==revision)els.pdfStatus.textContent="内容已修改；下载时会使用最新排版。";
  try{
    localStorage.setItem(STORAGE_KEY,JSON.stringify({
      version:2,type:"everflow-local-paper",localOnly:true,
      title:state.title,coverTitle:state.coverTitle,sourceName:state.sourceName,
      template:state.template,layout:state.layout,header:state.header,
      savedAt:new Date().toISOString(),
      questions:state.questions.map(function(q){return Object.assign({},q,{localId:q.id})}),
      originalIds:state.originalIds
    }));
    els.saveState.innerHTML="<i></i> 已保存到本机";
  }catch(e){
    els.saveState.textContent="本机存储空间不足";
    toast("本机存储已满，请先保存项目文件");
  }
}
function semanticLines(text){
  var src=String(text||"").replace(/\r\n?/g,"\n");
  src=src.replace(/([^\n])\s+(?=(?:①|②|③|④|⑤|⑥|⑦|⑧|⑨|⑩))/g,"$1\n");
  src=src.replace(/([^\n])\s+(?=(?:\([1-9]\d*\)|（[1-9]\d*）)\s*)/g,"$1\n");
  src=src.replace(/([^\nA-Za-z0-9/])\s+(?=(?:I{1,3}|IV|V|VI{0,3})[.、．]\s*)/g,"$1\n");
  return src.split(/\n+/).map(function(x){return x.trim()}).filter(Boolean);
}
function renderMath(root){
  if(!(window.temml&&typeof window.temml.renderMathInElement==="function"))return;
  try{
    window.temml.renderMathInElement(root,{
      delimiters:[
        {left:"$$",right:"$$",display:true},{left:"\\[",right:"\\]",display:true},
        {left:"\\(",right:"\\)",display:false},{left:"$",right:"$",display:false}
      ],
      throwOnError:false,strict:false,trust:false,maxExpand:1000,maxSize:50
    });
  }catch(e){}
}
function textWithBreaks(root,text){
  semanticLines(text).forEach(function(line){var p=document.createElement("p");p.textContent=line;root.appendChild(p)});
}
function move(from,to){
  if(to<0||to>=state.questions.length||from===to)return;
  undoStack.push(snapshot());redoStack.length=0;
  var q=state.questions.splice(from,1)[0];state.questions.splice(to,0,q);
  save(false);render();updateHistoryButtons();
}
function syncInputs(){
  els.titleInput.value=state.title;
  els.coverTitleInput.value=state.coverTitle;
  els.headerInput.value=state.header;
}
function renderTemplateMenu(){
  els.templateMenu.replaceChildren();
  MODES.groups.forEach(function(group){
    var section=document.createElement("section"),h=document.createElement("h4");h.textContent=group.label;section.appendChild(h);
    group.modes.forEach(function(m){
      var b=document.createElement("button");b.type="button";b.className="template-option";
      if(state.template===group.id&&state.layout===m.id)b.classList.add("is-active");
      var strong=document.createElement("strong");strong.textContent=m.label;
      var small=document.createElement("small");
      small.textContent=m.onePerPage?"一题一页 · 固定模板":(m.columns===2?"横向双栏 · 固定模板":"固定模板");
      b.append(strong,small);
      b.onclick=function(){
        undoStack.push(snapshot());redoStack.length=0;
        state.template=group.id;state.layout=m.id;
        els.templatePopover.hidden=true;els.templateButton.setAttribute("aria-expanded","false");
        save(false);render();updateHistoryButtons();
      };
      section.appendChild(b);
    });
    els.templateMenu.appendChild(section);
  });
}
function renderTemplateState(){
  var info=modeInfo(),label=modeLabel();
  els.templateButtonLabel.textContent=label;
  els.templateSummary.textContent=label;
  els.pageSizeChip.textContent=info.widthMm+"×"+info.heightMm+" mm";
  els.bookHeaderLabel.hidden=state.template!=="book";
  document.body.dataset.template=state.template;
  document.body.dataset.layout=state.layout;
  els.paperSheet.style.setProperty("--paper-w",info.widthMm+"mm");
  els.paperSheet.style.setProperty("--paper-h",info.heightMm+"mm");
  renderTemplateMenu();
}
function renderOrder(){
  els.orderList.replaceChildren();
  state.questions.forEach(function(q,i){
    var row=document.createElement("div");row.className="order-item"+(q.id===selectedId?" is-selected":"");row.draggable=true;row.dataset.index=i;
    var h=document.createElement("span");h.className="drag-handle";h.textContent="⋮⋮";
    var n=document.createElement("span");n.className="order-num";n.textContent=i+1;
    var c=document.createElement("span");c.className="order-copy";c.tabIndex=0;c.setAttribute("role","button");
    var b=document.createElement("b");b.textContent=clip(q.content,42)||"未命名题目";
    var s=document.createElement("small");s.textContent=(q.section?q.section+" · ":"")+q.type+(q.showOptions&&q.options.length?" · "+q.options.length+" 个选项":"");
    c.append(b,s);c.onclick=function(){selectedId=q.id;renderOrder();renderQuestionEditor()};
    c.onkeydown=function(e){if(e.key==="Enter"||e.key===" "){e.preventDefault();c.click()}};
    var ctr=document.createElement("span");ctr.className="order-controls";
    var up=document.createElement("button");up.type="button";up.textContent="↑";up.disabled=i===0;up.onclick=function(){move(i,i-1)};
    var dn=document.createElement("button");dn.type="button";dn.textContent="↓";dn.disabled=i===state.questions.length-1;dn.onclick=function(){move(i,i+1)};
    ctr.append(up,dn);row.append(h,n,c,ctr);els.orderList.appendChild(row);
  });
}
function choiceClass(options){
  var max=options.reduce(function(m,o){return Math.max(m,String(o).replace(/\s+/g,"").length)},0),n=options.length;
  if(n===3)return max<=14?"cols-3":max<=34?"cols-2":"cols-1";
  if(n===4)return max<=14?"cols-4":max<=34?"cols-2":"cols-1";
  if(n===5)return max<=34?"cols-2":"cols-1";
  if(n===6)return max<=14?"cols-3":max<=34?"cols-2":"cols-1";
  return max<=34&&n>1?"cols-2":"cols-1";
}
function renderPaper(){
  renderTemplateState();
  els.paperQuestions.replaceChildren();
  els.previewTitle.textContent=state.title;
  els.coverPreviewTitle.textContent=state.coverTitle||state.title;
  els.coverPreviewDate.textContent="> > > 更新时间："+localDate();
  els.previewMeta.textContent=modeLabel()+" · "+state.questions.length+" 题";
  var head=document.querySelector(".paper-running-head");
  head.hidden=state.template!=="book";head.classList.toggle("book-head",state.template==="book");head.replaceChildren();
  if(state.template==="book")["彼时流年若水",state.header||"","https://zuotiben.top"].forEach(function(t){var n=document.createElement("span");n.textContent=t;head.appendChild(n)});
  state.questions.forEach(function(q,i){
    if(q.section&&(i===0||state.questions[i-1].section!==q.section)){
      var heading=document.createElement("h2");heading.className="paper-section-heading";heading.textContent=q.section;els.paperQuestions.appendChild(heading);
    }
    var sec=document.createElement("section");sec.className="question";sec.dataset.index=i;sec.dataset.questionId=q.id;
    if(q.gap)sec.style.marginBottom=q.gap+"mm";if(q.breakBefore)sec.classList.add("force-break-before");
    sec.onclick=function(){selectedId=q.id;renderOrder();renderQuestionEditor()};
    var line=document.createElement("div");line.className="question-line";
    var num=document.createElement("div");num.className="question-number";num.textContent=(i+1)+".";
    var body=document.createElement("div");body.className="question-body";textWithBreaks(body,q.content);
    line.append(num,body);sec.appendChild(line);
    if(q.showOptions&&q.options.length){
      var opts=document.createElement("div");opts.className="options "+choiceClass(q.options);
      q.options.forEach(function(o,j){var d=document.createElement("div");d.className="option";var l=document.createElement("span");l.className="option-label";l.textContent="("+String.fromCharCode(65+j)+")";var b=document.createElement("span");b.className="option-body";b.textContent=o;d.append(l,b);opts.appendChild(d)});
      sec.appendChild(opts);
    }
    els.paperQuestions.appendChild(sec);renderMath(sec);
  });
  updatePages();
}
function render(){
  els.paperName.textContent=state.title;els.questionCount.textContent=state.questions.length;els.sourceName.textContent=state.sourceName;
  renderOrder();renderPaper();renderQuestionEditor();updateHistoryButtons();
}
function updatePages(){
  requestAnimationFrame(function(){
    var stage=els.paperStage,info=modeInfo();
    var scale=Math.min(1,Math.max(.2,(stage.clientWidth-28)/(info.widthMm*3.7795275591)));
    els.paperSheet.style.setProperty("--preview-scale",String(scale));
    els.coverSheet.style.setProperty("--preview-scale",String(Math.min(1,Math.max(.2,(stage.clientWidth-28)/(210*3.7795275591)))));
    var total;
    if(info.onePerPage)total=Math.max(1,state.questions.length);
    else{
      var h=els.paperQuestions.scrollHeight||1;
      var usablePx=(info.heightMm-(state.template==="book"?42:34))*3.7795275591;
      var columns=info.columns||1;
      total=Math.max(1,Math.ceil(h/(usablePx*columns)));
    }
    els.previewPageCurrent.textContent="1";els.previewPageTotal.textContent=String(total);
  });
}
function bindDrag(container){
  var from=null;
  container.addEventListener("dragstart",function(e){var row=e.target.closest(".order-item");if(!row)return;from=Number(row.dataset.index);row.classList.add("dragging")});
  container.addEventListener("dragover",function(e){var row=e.target.closest(".order-item");if(!row)return;e.preventDefault();container.querySelectorAll(".order-item").forEach(function(x){x.classList.remove("drop-before")});row.classList.add("drop-before")});
  container.addEventListener("drop",function(e){var row=e.target.closest(".order-item");if(!row||from==null)return;e.preventDefault();move(from,Number(row.dataset.index));from=null});
  container.addEventListener("dragend",function(){from=null;container.querySelectorAll(".order-item").forEach(function(x){x.classList.remove("dragging","drop-before")})});
}
function setMode(preview){
  previewMode=!!preview;document.body.classList.toggle("preview-mode",previewMode);
  els.editModeButton.setAttribute("aria-pressed",String(!previewMode));els.previewModeButton.setAttribute("aria-pressed",String(previewMode));
}
function renderQuestionEditor(){
  var root=els.questionEditor;root.replaceChildren();
  var q=state.questions.find(function(x){return x.id===selectedId});if(!q)return;
  var idx=state.questions.indexOf(q),h=document.createElement("div");h.className="question-editor-head";
  var title=document.createElement("h3");title.textContent="第 "+(idx+1)+" 题";
  var actions=document.createElement("div");
  var duplicate=document.createElement("button");duplicate.type="button";duplicate.className="text-btn";duplicate.textContent="复制";
  duplicate.onclick=function(){undoStack.push(snapshot());var copy=deepClone(q);copy.id="local-copy-"+Date.now().toString(36);state.questions.splice(idx+1,0,copy);selectedId=copy.id;save(false);render()};
  var removeQ=document.createElement("button");removeQ.type="button";removeQ.className="text-btn danger";removeQ.textContent="删除";
  removeQ.onclick=function(){if(!confirm("删除第 "+(idx+1)+" 题？"))return;undoStack.push(snapshot());state.questions.splice(idx,1);selectedId=(state.questions[idx]||state.questions[idx-1]||{}).id||null;save(false);render()};
  actions.append(duplicate,removeQ);h.append(title,actions);root.appendChild(h);

  function touch(){save();renderPaper();renderOrder()}
  function inputField(label,key,kind){
    var l=document.createElement("label");l.textContent=label;var input=document.createElement(kind||"input");input.value=q[key]||"";l.appendChild(input);root.appendChild(l);
    input.oninput=function(){q[key]=key==="gap"?Math.max(0,Math.min(100,Number(input.value)||0)):input.value;touch()};return input;
  }
  inputField("所属大题","section");
  var typeLabel=document.createElement("label");typeLabel.textContent="题型";var select=document.createElement("select");
  QUESTION_TYPES.forEach(function(t){var o=document.createElement("option");o.value=t;o.textContent=t;if(q.type===t)o.selected=true;select.appendChild(o)});
  select.onchange=function(){q.type=select.value;touch()};typeLabel.appendChild(select);root.appendChild(typeLabel);
  inputField("题干（支持 LaTeX 公式）","content","textarea");
  var gap=inputField("题后留白（毫米，0 = 模板默认）","gap");gap.type="number";gap.min="0";gap.max="100";
  var breakLabel=document.createElement("label");breakLabel.className="check-row";var breakCheck=document.createElement("input");breakCheck.type="checkbox";breakCheck.checked=q.breakBefore;
  breakCheck.onchange=function(){q.breakBefore=breakCheck.checked;touch()};breakLabel.append(breakCheck,document.createTextNode(" 本题前强制分页"));root.appendChild(breakLabel);
  var showLabel=document.createElement("label");showLabel.className="check-row";var showCheck=document.createElement("input");showCheck.type="checkbox";showCheck.checked=q.showOptions;
  showCheck.onchange=function(){q.showOptions=showCheck.checked;touch()};showLabel.append(showCheck,document.createTextNode(" 显示选项"));root.appendChild(showLabel);

  q.options.forEach(function(option,i){
    var row=document.createElement("div");row.className="option-editor";
    var badge=document.createElement("b");badge.textContent=String.fromCharCode(65+i);
    var input=document.createElement("input");input.value=option;input.oninput=function(){q.options[i]=input.value;touch()};
    var remove=document.createElement("button");remove.type="button";remove.className="text-btn";remove.textContent="删除";
    remove.onclick=function(){q.options.splice(i,1);touch();renderQuestionEditor()};
    row.append(badge,input,remove);root.appendChild(row);
  });
  var add=document.createElement("button");add.type="button";add.className="text-btn add-option";add.textContent="＋ 添加选项";add.disabled=q.options.length>=8;
  add.onclick=function(){q.options.push("");q.showOptions=true;touch();renderQuestionEditor()};root.appendChild(add);
}
async function createLatestPdf(){
  if(pdfExporting)return null;pdfExporting=true;els.printButton.disabled=true;els.printButton.setAttribute("aria-busy","true");
  try{
    var current=revision,snapshotState=deepClone(state);snapshotState.exportDate=localDate();
    els.pdfStatus.textContent="正在本机生成最新 PDF…";
    var exporter=await import("./pdf-export.js?v=20260921-masterparity1");
    var blob=await exporter.createPdf(snapshotState,{onStatus:function(s){els.pdfStatus.textContent=s}});
    if(current!==revision){els.pdfStatus.textContent="内容刚刚发生变化，正在使用最新内容重新生成…";pdfExporting=false;els.printButton.disabled=false;els.printButton.removeAttribute("aria-busy");return createLatestPdf()}
    if(pdfUrl)URL.revokeObjectURL(pdfUrl);pdfBlob=blob;pdfRevision=current;pdfUrl=URL.createObjectURL(blob);
    els.pdfPreview.src=pdfUrl;els.pdfStatus.textContent="PDF 已在本机生成。";
    return blob;
  }finally{
    pdfExporting=false;els.printButton.disabled=false;els.printButton.removeAttribute("aria-busy");
  }
}
async function downloadPdf(){
  try{
    var blob=(pdfBlob&&pdfRevision===revision)?pdfBlob:await createLatestPdf();if(!blob)return;
    var name=(state.coverTitle||state.title||"Everflow")+"";
    var result=await SAVE.saveBlob(blob,{fileName:name+".pdf",mime:"application/pdf",extension:".pdf"});
    if(result.method!=="cancelled")toast("PDF 已交给浏览器保存");
  }catch(err){console.error(err);els.pdfStatus.textContent="PDF 生成或保存失败："+(err.message||"未知错误")}
}
async function exportProject(){
  var data={
    version:2,type:"everflow-local-paper",localOnly:true,latexEnabled:false,
    template:state.template,layout:state.layout,header:state.header,originalIds:state.originalIds,
    title:state.title,coverTitle:state.coverTitle,
    questions:state.questions.map(function(q){return Object.assign({},q,{localId:q.id})})
  };
  var blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
  try{await SAVE.saveBlob(blob,{fileName:(state.title||"Everflow-项目")+".everflow",mime:"application/json",extension:".everflow"})}catch(e){toast("保存项目失败："+e.message)}
}
function init(){
  ["toast","paperName","questionCount","sourceName","orderList","paperSheet","coverSheet","paperStage","paperQuestions","previewTitle","previewMeta",
   "previewPageCurrent","previewPageTotal","editModeButton","previewModeButton","pdfPreview","pdfStatus","questionEditor","titleInput","coverTitleInput",
   "headerInput","templateButton","templateButtonLabel","templatePopover","templateMenu","templateSummary","pageSizeChip","bookHeaderLabel","printButton",
   "saveProjectButton","resetOrderButton","clearButton","undoButton","redoButton","saveState","exportDateDisplay","coverPreviewTitle","coverPreviewDate"
  ].forEach(function(id){els[id]=byId(id)});
  if(!load()){location.replace("../");return}
  selectedId=state.questions[0].id;syncInputs();bindDrag(els.orderList);

  els.editModeButton.onclick=function(){setMode(false)};els.previewModeButton.onclick=function(){setMode(true)};
  els.printButton.onclick=downloadPdf;els.saveProjectButton.onclick=exportProject;
  els.undoButton.onclick=undo;els.redoButton.onclick=redo;
  els.titleInput.oninput=function(){state.title=els.titleInput.value;save();els.paperName.textContent=state.title;renderPaper()};
  els.coverTitleInput.oninput=function(){state.coverTitle=els.coverTitleInput.value;save();renderPaper()};
  els.headerInput.oninput=function(){state.header=els.headerInput.value;save();renderPaper()};
  els.exportDateDisplay.textContent="导出时读取本机日期";

  els.templateButton.onclick=function(e){e.stopPropagation();var next=els.templatePopover.hidden;els.templatePopover.hidden=!next;els.templateButton.setAttribute("aria-expanded",String(next))};
  els.templatePopover.onclick=function(e){e.stopPropagation()};
  document.addEventListener("click",function(){els.templatePopover.hidden=true;els.templateButton.setAttribute("aria-expanded","false")});

  els.resetOrderButton.onclick=function(){
    undoStack.push(snapshot());var rank={};state.originalIds.forEach(function(id,i){rank[id]=i});
    state.questions.sort(function(a,b){return (rank[a.id]??9999)-(rank[b.id]??9999)});save(false);render();toast("已恢复导入顺序")
  };
  els.clearButton.onclick=function(){if(confirm("清空当前本地项目？")){localStorage.removeItem(STORAGE_KEY);location.replace("../")}};

  document.addEventListener("keydown",function(e){
    if(!(e.ctrlKey||e.metaKey))return;
    var key=e.key.toLowerCase();
    if(key==="z"&&!e.shiftKey){if(!/INPUT|TEXTAREA/.test(document.activeElement.tagName)){e.preventDefault();undo()}}
    if((key==="z"&&e.shiftKey)||key==="y"){if(!/INPUT|TEXTAREA/.test(document.activeElement.tagName)){e.preventDefault();redo()}}
  });
  window.addEventListener("resize",updatePages);
  undoStack.push(snapshot());render();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();

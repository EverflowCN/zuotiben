(function(){
"use strict";

var STORAGE_KEY="zuotiben-local-paper-v1";
var answerMode={answers:false,explanations:false};
var UI_STORAGE_KEY="zuotiben-editor-ui-v2";
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
  tocEnabled:false,
  testVisualConfig:null,
  questions:[],
  originalIds:[]
};
var selectedId=null,selectedIds=new Set(),previewMode=false,pdfExporting=false,typstPreviewing=false,suspendTypstPreview=false,previewCompileTimer=null,revision=0,pdfRevision=-1,pdfExportDate="",pdfBlob=null,svgRevision=-1,svgExportDate="";
var previewZoom=1,previewFit=true,currentPreviewPage=1,previewPageCount=0,previewObserver=null;
var browserLayoutController=null,browserLayoutResult=null,browserPrintBusy=false;
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
function modeInfoFor(subject){
  var base=MODES.mode(subject.template,subject.layout),c=subject.testVisualConfig;
  if(!c)return base;
  var custom=Object.assign({},base);
  if(Number.isFinite(Number(c.fontPt))&&Number(c.fontPt)>=9&&Number(c.fontPt)<=12)
    custom.fontPt=Number(c.fontPt);
  return custom;
}
function modeInfo(){return modeInfoFor(state)}
function testDefaultGap(subject){
  var c=subject.testVisualConfig;
  return c&&Number.isFinite(Number(c.gapPx))&&Number(c.gapPx)>=0?
    Math.max(0,Math.min(25,Number(c.gapPx)*25.4/96)):
    MODES.questionGapMm(subject.template,subject.layout);
}
function modeLabel(){return MODES.label(state.template,state.layout)}
function normalizeOption(v){return cleanText(typeof v==="object"&&v?(v.text||v.content||v.label||""):v)}
// A named section has priority over an inferred question type.
function isChoiceSection(section,type){var group=cleanText(section);return group?group.includes("选择"):cleanText(type).includes("选择")}
function assignDefaultOptions(question){question.showOptions=isChoiceSection(question.section,question.type);return question}
function normalizeQuestion(raw,index){
  raw=raw||{};
  var options=Array.isArray(raw.options)?raw.options.map(normalizeOption):[];
  return {
    id:String(raw.localId||raw.id||("local-"+index+"-"+Date.now().toString(36))),
    content:cleanText(raw.content||raw.stem||raw.question||raw.text||raw.title||""),
    options:options,
    images:Array.isArray(raw.images)?raw.images.filter(function(im){return im&&/^data:image\/(?:png|jpeg|webp|gif|svg\+xml);base64,/i.test(String(im.src||""))}).map(function(im){return {src:String(im.src),alt:String(im.alt||"试题配图").slice(0,120)}}):[],
    type:raw.type|| (options.length?"选择题":"解答题"),
    section:cleanText(raw.section||""),
    gap:Math.max(0,Math.min(100,Number(raw.gap)||0)),
    showOptions:typeof raw.showOptions==="boolean"?raw.showOptions:isChoiceSection(raw.section||"",raw.type||(options.length?"选择题":"解答题")),
    breakBefore:raw.breakBefore===true,
    source:"local",
    answer:cleanText(raw.answer||raw.correct_answer||raw.correctAnswer||""),
    explanation:cleanText(raw.explanation||raw.answer_explanation||raw.analysis||""),
    latexEnabled:false
  };
}
function snapshot(){return deepClone({
  title:state.title,coverTitle:state.coverTitle,sourceName:state.sourceName,template:state.template,layout:state.layout,
  header:state.header,tocEnabled:state.tocEnabled,testVisualConfig:state.testVisualConfig,questions:state.questions,originalIds:state.originalIds
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
    state.tocEnabled=d.tocEnabled===true;
    state.testVisualConfig=d.testVisualConfig&&typeof d.testVisualConfig==="object"?Object.assign({},d.testVisualConfig):null;
    state.sourceName=cleanText(d.sourceName||"浏览器本地草稿");
    state.questions=d.questions.map(normalizeQuestion);
    state.originalIds=Array.isArray(d.originalIds)&&d.originalIds.length?d.originalIds.map(String):state.questions.map(function(q){return q.id});
    return true;
  }catch(e){return false}
}
function save(markDirty){
  revision++;
  if(markDirty!==false)checkpoint();
  if(pdfBlob&&pdfRevision!==revision)els.pdfStatus.textContent="内容已修改；PDF 将在下载时按最新内容重新生成。";
  if(wantsLiveTypst())scheduleTypstPreview();
  try{
    localStorage.setItem(STORAGE_KEY,JSON.stringify({
      version:2,type:"everflow-local-paper",localOnly:true,
      title:state.title,coverTitle:state.coverTitle,sourceName:state.sourceName,
      template:state.template,layout:state.layout,header:state.header,tocEnabled:state.tocEnabled,testVisualConfig:state.testVisualConfig,
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
function normalizeTemplateMacros(text){
  return String(text||"")
    .replace(/\\par\b/g,"\n")
    .replace(/\\blankbox\b/g,"（\u2002\u2002\u2002）")
    .replace(/（\s*\\hspace\{1\.5em\}\s*）/g,"（\u2002\u2002\u2002）")
    .replace(/\\blankline\b/g,"＿＿＿")
    .replace(/\\quad\b/g,"\u2003");
}
function semanticLines(text){
  return window.EverflowQuestionText.semanticLines(text);
}
function renderMath(root){
  // One defensive math renderer for both editor and the physical-page paginator.
  // The archived source stays unmodified, including its original LaTeX.
  // In particular, do not let Temml auto-render output "ParseError" into the PDF.
  if(window.EverflowSafeMath){
    window.EverflowSafeMath.render(root);
    return;
  }
  // Fail closed until the local formula renderer is loaded; never print parser errors.
  if(!window.temml)return;
}
function classifySemanticLine(line){
  var m=String(line||"").match(/^([①②③④⑤⑥⑦⑧⑨⑩])\s*(.*)$/);
  if(m)return {kind:"circled",label:m[1],body:m[2]};
  m=String(line||"").match(/^((?:VIII|VII|VI|IV|IX|III|II|I|V|X)[.、．])\s*([\s\S]*)$/);
  if(m)return {kind:"roman",label:m[1],body:m[2]};
  m=String(line||"").match(/^((?:\([1-9]\d*\)|（[1-9]\d*）|\([ivxlcdm]+\)))\s*(.*)$/i);
  if(m)return {kind:"subq",label:m[1],body:m[2]};
  return {kind:"plain",label:"",body:String(line||"")};
}
function textWithBreaks(root,text){
  var previous="plain";
  semanticLines(text).forEach(function(line){
    var meta=classifySemanticLine(line);
    if(meta.kind==="plain"){
      var p=document.createElement("p");p.textContent=meta.body;root.appendChild(p);previous="plain";return;
    }
    var row=document.createElement("div");row.className="semantic-row "+meta.kind+(previous!==meta.kind?" is-group-start":"");
    var label=document.createElement("span");label.className="semantic-label";label.textContent=meta.label;
    var body=document.createElement("span");body.className="semantic-content";body.textContent=meta.body;
    row.append(label,body);root.appendChild(row);previous=meta.kind;
  });
}
function chineseSectionNumber(n){
  var d=["零","一","二","三","四","五","六","七","八","九"];
  if(n<10)return d[n]||String(n);
  if(n===10)return "十";
  if(n<20)return "十"+d[n%10];
  if(n<100)return d[Math.floor(n/10)]+"十"+(n%10?d[n%10]:"");
  return String(n);
}
function bareSectionName(name){
  return String(name||"")
    .replace(/^\s*[一二三四五六七八九十百]+[、.．]\s*/,"")
    .replace(/^\s*\d+[.．、]\s*/,"")
    .trim();
}
function sectionDisplayName(name,ordinal){
  var bare=bareSectionName(name);
  return state.template==="book"?(ordinal+". "+bare):(chineseSectionNumber(ordinal)+"、"+bare);
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
  els.paperSheet.style.setProperty("--master-top",info.topMm+"mm");
  els.paperSheet.style.setProperty("--master-bottom",info.bottomMm+"mm");
  els.paperSheet.style.setProperty("--master-left",info.leftMm+"mm");
  els.paperSheet.style.setProperty("--master-right",info.rightMm+"mm");
  els.paperSheet.style.setProperty("--master-font",info.fontPt+"pt");
  els.paperSheet.style.setProperty("--master-leading",String(info.lineHeight));
  els.paperSheet.style.setProperty("--master-question-gap",testDefaultGap(state)+"mm");
  els.paperSheet.style.setProperty("--master-choice-before",MODES.choiceBeforeSkipMm(state.template,state.layout)+"mm");
  els.paperSheet.style.setProperty("--master-column-gap",(info.columnGapMm||0)+"mm");
  els.paperSheet.style.setProperty("--master-footer-skip",info.footSkipMm+"mm");
  if(els.testFontPt)els.testFontPt.value=String(info.fontPt);
  if(els.testGapMm)els.testGapMm.value=String(Math.round(testDefaultGap(state)*10)/10);
  if(els.formalCoverToggle)els.formalCoverToggle.checked=state.testVisualConfig?.withCover!==false;
  renderTemplateMenu();
}
function newQuestion(section){
  return {
    id:"local-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,7),
    content:"",options:isChoiceSection(section,"")?["","","",""]:[],type:isChoiceSection(section,"")?"选择题":"解答题",section:section||"",gap:0,showOptions:isChoiceSection(section,""),breakBefore:false,source:"local",latexEnabled:false
  };
}
function uniqueSections(){
  var out=[];
  state.questions.forEach(function(q){var n=cleanText(q.section||"");if(n&&!out.includes(n))out.push(n)});
  return out;
}
function mutateState(fn,msg){
  undoStack.push(snapshot());if(undoStack.length>60)undoStack.shift();redoStack.length=0;
  fn();save(false);render();if(msg)toast(msg);
}
function renderSectionManager(){
  if(!els.sectionList)return;
  var sections=uniqueSections();els.sectionList.replaceChildren();
  sections.forEach(function(name,i){
    var row=document.createElement("div");row.className="section-manage-row";
    var label=document.createElement("strong");label.textContent=name;
    var count=document.createElement("span");count.textContent=state.questions.filter(function(q){return q.section===name}).length+" 题";
    var rename=document.createElement("button");rename.type="button";rename.className="text-btn";rename.textContent="重命名";
    rename.onclick=function(){
      var next=prompt("大纲章节名称",name);next=cleanText(next||"");if(!next||next===name)return;
      mutateState(function(){state.questions.forEach(function(q){if(q.section===name){q.section=next;assignDefaultOptions(q)}})},"已重命名大纲章节");
    };
    var up=document.createElement("button");up.type="button";up.className="text-btn";up.textContent="↑";up.disabled=i===0;
    var down=document.createElement("button");down.type="button";down.className="text-btn";down.textContent="↓";down.disabled=i===sections.length-1;
    function moveSection(delta){
      var order=uniqueSections(),to=i+delta;if(to<0||to>=order.length)return;
      var tmp=order[i];order[i]=order[to];order[to]=tmp;
      mutateState(function(){
        var grouped={},unsectioned=[];
        state.questions.forEach(function(q){
          if(q.section){(grouped[q.section]||(grouped[q.section]=[])).push(q)}
          else unsectioned.push(q);
        });
        state.questions=order.flatMap(function(n){return grouped[n]||[]}).concat(unsectioned);
      },"已调整大纲顺序");
    }
    up.onclick=function(){moveSection(-1)};down.onclick=function(){moveSection(1)};
    row.append(label,count,rename,up,down);els.sectionList.appendChild(row);
  });
  if(!sections.length){
    var empty=document.createElement("p");empty.className="section-empty";empty.textContent="还没有大纲章节。";els.sectionList.appendChild(empty);
  }
  if(els.batchSectionSelect){
    els.batchSectionSelect.replaceChildren();
    var keep=document.createElement("option");keep.value="";keep.textContent="移动到章节…";els.batchSectionSelect.appendChild(keep);
    sections.forEach(function(name){var o=document.createElement("option");o.value=name;o.textContent=name;els.batchSectionSelect.appendChild(o)});
  }
}
function updateBatchBar(){
  if(!els.batchBar)return;
  els.batchCount.textContent=String(selectedIds.size);
  els.batchBar.hidden=selectedIds.size===0;
  renderSectionManager();
}

function renderOutlineNav(){
  if(!els.outlineNav)return;
  els.outlineNav.replaceChildren();
  var sections=uniqueSections();
  if(!sections.length){
    var message=document.createElement("span");message.className="outline-empty";
    message.textContent="尚无大纲章节，点击「目录结构」添加";
    els.outlineNav.appendChild(message);return;
  }
  sections.forEach(function(name,index){
    var count=state.questions.filter(function(q){return q.section===name}).length;
    var item=document.createElement("button");item.type="button";item.className="outline-section-chip";
    var nameSpan=document.createElement("span");nameSpan.textContent=sectionDisplayName(name,index+1);
    var countSpan=document.createElement("small");countSpan.textContent=count+" 题";
    item.append(nameSpan,countSpan);
    item.title="跳转到「"+name+"」对应的第一道题";
    item.onclick=function(){
      var q=state.questions.find(function(v){return v.section===name});
      if(!q)return;
      selectedId=q.id;renderOrder();renderQuestionEditor();
      var row=Array.from(els.orderList.children).find(function(row){return state.questions[Number(row.dataset.index)]?.id===q.id});
      if(row)row.scrollIntoView({behavior:"smooth",block:"nearest"});
    };
    els.outlineNav.appendChild(item);
  });
}
var lastBatchCheckboxIndex=-1;
function navigateQuestion(index,scroll){
  if(!state.questions.length)return;
  var idx=Math.max(0,Math.min(state.questions.length-1,index));
  selectedId=state.questions[idx].id;
  renderOrder();renderQuestionEditor();
  if(scroll!==false){
    var item=els.orderList.querySelector('.order-item[data-index="'+idx+'"]');
    if(item)item.scrollIntoView({block:"nearest",behavior:"auto"});
  }
}
function renderQuestionNav(){
  var idx=state.questions.findIndex(function(q){return q.id===selectedId});
  if(els.questionNavCounter)els.questionNavCounter.textContent=(Math.max(idx,0)+1)+" / "+state.questions.length;
  if(els.prevQuestionButton)els.prevQuestionButton.disabled=idx<=0;
  if(els.nextQuestionButton)els.nextQuestionButton.disabled=idx<0||idx>=state.questions.length-1;
}
function renderOrder(){
  var oldScroll=els.orderList.scrollTop;
  renderOutlineNav();
  els.orderList.replaceChildren();
  state.questions.forEach(function(q,i){
    var row=document.createElement("div");row.className="order-item"+(q.id===selectedId?" is-selected":"")+(selectedIds.has(q.id)?" is-multi-selected":"");row.draggable=false;row.dataset.index=i;
    row.setAttribute("role","option");row.setAttribute("aria-selected",String(selectedIds.has(q.id)));
    var check=document.createElement("input");check.type="checkbox";check.className="order-check";check.checked=selectedIds.has(q.id);check.setAttribute("aria-label","选择第 "+(i+1)+" 题");check.onclick=function(e){
      e.stopPropagation();
      if(e.shiftKey&&lastBatchCheckboxIndex>=0){
        var left=Math.min(lastBatchCheckboxIndex,i),right=Math.max(lastBatchCheckboxIndex,i);
        for(var j=left;j<=right;j++){
          if(check.checked)selectedIds.add(state.questions[j].id);
          else selectedIds.delete(state.questions[j].id);
        }
      }else{
        if(check.checked)selectedIds.add(q.id);else selectedIds.delete(q.id);
      }
      lastBatchCheckboxIndex=i;
      renderOrder();updateBatchBar();
    };
    var h=document.createElement("span");h.className="drag-handle";h.textContent="⋮⋮";h.draggable=true;
    h.title="拖动此处调整题目顺序";h.setAttribute("aria-label","拖动第 "+(i+1)+" 题排序");
    var n=document.createElement("span");n.className="order-num";n.textContent=i+1;
    var c=document.createElement("span");c.className="order-copy";c.tabIndex=0;c.setAttribute("role","button");
    var b=document.createElement("b");
    b.textContent=clip(q.content,140)||"未命名题目";
    // The source stays untouched: sidebar and graph display a readable formula
    // rather than raw backslash commands where Temml can render it safely.
    if(window.EverflowSafeMath)window.EverflowSafeMath.render(b);
    var s=document.createElement("small");s.textContent=(q.section?q.section+" · ":"")+q.type+(q.showOptions&&q.options.length?" · "+q.options.length+" 个选项":"");
    c.append(b,s);c.onclick=function(e){e.stopPropagation();navigateQuestion(i,false)};
    row.onclick=function(ev){if(ev.target.closest("button,input,select,.drag-handle"))return;navigateQuestion(i,false)};
    c.onkeydown=function(e){if(e.key==="Enter"||e.key===" "){e.preventDefault();c.click()}};
    var ctr=document.createElement("span");ctr.className="order-controls";
    var up=document.createElement("button");up.type="button";up.textContent="↑";up.disabled=i===0;up.onclick=function(){move(i,i-1)};
    var dn=document.createElement("button");dn.type="button";dn.textContent="↓";dn.disabled=i===state.questions.length-1;dn.onclick=function(){move(i,i+1)};
    ctr.append(up,dn);row.append(check,h,n,c,ctr);els.orderList.appendChild(row);
  });
  els.orderList.scrollTop=oldScroll;
  renderQuestionNav();
  if(els.outlineSelectionSummary)els.outlineSelectionSummary.textContent=selectedIds.size?
    "已选 "+selectedIds.size+" / "+state.questions.length+" 题":"点击题干查看 · 方框勾选";
}
function measureChoiceWidth(text,fontPt){
  try{
    var canvas=measureChoiceWidth.canvas||(measureChoiceWidth.canvas=document.createElement("canvas"));
    var ctx=canvas.getContext("2d");
    ctx.font=(fontPt*96/72)+'px "Everflow Termes","Everflow Song",serif';
    return ctx.measureText(String(text||"")).width*72/96;
  }catch(e){
    return Array.from(String(text||"")).reduce(function(sum,ch){
      return sum+(/[^\x00-\xff]/.test(ch)?fontPt:fontPt*.55);
    },0);
  }
}
function choiceClass(options){
  var info=modeInfo(),n=options.length;
  var textWidthMm=info.widthMm-info.leftMm-info.rightMm-((info.columns||1)===2?(info.columnGapMm||0):0);
  var columnWidthPt=((info.columns||1)===2?(textWidthMm/2):textWidthMm)*72/25.4;
  var lineWidth=columnWidthPt-(info.questionLabelWidthEm+info.questionLabelSepEm)*info.fontPt;
  var max=0;
  options.forEach(function(o,i){
    max=Math.max(max,measureChoiceWidth("(" + String.fromCharCode(65+i) + ") " + String(o||""),info.fontPt));
  });
  var short=max<=info.choiceFourColumnThreshold*lineWidth;
  var medium=max<=info.choiceTwoColumnThreshold*lineWidth;
  if(n===3)return short?"cols-3":medium?"cols-2":"cols-1";
  if(n===4)return short?"cols-4":medium?"cols-2":"cols-1";
  if(n===5)return medium?"cols-2":"cols-1";
  if(n===6)return short?"cols-3":medium?"cols-2":"cols-1";
  return medium&&n>1?"cols-2":"cols-1";
}
function layoutRecords(snapshotState){
  var records=[],previousSection="",sectionOrdinal=0,info=modeInfoFor(snapshotState);
  snapshotState.questions.forEach(function(q,index){
    var sectionHeading="",sectionChanged=!!(q.section&&q.section!==previousSection);
    if(sectionChanged){
      sectionOrdinal++;previousSection=q.section;
      var bare=bareSectionName(q.section);
      sectionHeading=snapshotState.template==="book"?(sectionOrdinal+". "+bare):(chineseSectionNumber(sectionOrdinal)+"、"+bare);
    }
    records.push(Object.assign({},q,{
      id:q.id,number:index+1,sectionHeading:sectionHeading,
      printAnswer:answerMode.answers,printExplanation:answerMode.explanations,
      gapMm:info.onePerPage?0:(q.gap>0?q.gap:testDefaultGap(snapshotState)),
      breakBefore:q.breakBefore===true||(snapshotState.template==="book"&&info.sectionForceNewPage&&sectionChanged&&index>0)
    }));
  });
  return records;
}
function appendQuestionImages(parent,images){
  if(!Array.isArray(images))return;
  images.forEach(function(im){
    if(!im||!/^data:image\/(?:png|jpeg|webp|gif|svg\+xml);base64,/i.test(String(im.src||"")))return;
    var frame=document.createElement("figure");frame.className="everflow-question-image";
    var img=document.createElement("img");img.src=im.src;img.alt=im.alt||"试题配图";
    img.loading="eager";img.decoding="async";frame.appendChild(img);parent.appendChild(frame);
  });
}
function createLayoutItem(record){
  var item=document.createElement("article");item.className="paper-layout-item";item.dataset.questionId=record.id;
  if(record.sectionHeading){
    var heading=document.createElement("h2");heading.className="paper-section-heading";heading.textContent=record.sectionHeading;item.appendChild(heading);
  }
  var question=document.createElement("section");question.className="question";question.dataset.questionId=record.id;
  var line=document.createElement("div");line.className="question-line";
  var num=document.createElement("div");num.className="question-number";num.textContent=record.number+".";
  var body=document.createElement("div");body.className="question-body";textWithBreaks(body,record.content);
  line.append(num,body);question.appendChild(line);
  appendQuestionImages(question,record.images);
  if(record.showOptions&&record.options&&record.options.length){
    var opts=document.createElement("div");opts.className="options "+choiceClass(record.options);
    record.options.forEach(function(option,index){
      var row=document.createElement("div");row.className="option";
      var label=document.createElement("span");label.className="option-label";label.textContent="("+String.fromCharCode(65+index)+")";
      var optionBody=document.createElement("span");optionBody.className="option-body";optionBody.textContent=option;
      row.append(label,optionBody);opts.appendChild(row);
    });
    question.appendChild(opts);
  }
  item.appendChild(question);
  if((record.printAnswer&&record.answer)||(record.printExplanation&&record.explanation)){
    var solution=document.createElement("div");solution.className="paper-inline-solution";
    if(record.printAnswer&&record.answer){var a=document.createElement("div");a.textContent="【答案】";textWithBreaks(a,record.answer);solution.appendChild(a)}
    if(record.printExplanation&&record.explanation){var b=document.createElement("div");b.textContent="【解析】";textWithBreaks(b,record.explanation);solution.appendChild(b)}
    item.appendChild(solution);
  }
  var answerSpace=document.createElement("div");answerSpace.className="question-answer-space";answerSpace.style.height=Math.max(0,Number(record.gapMm)||0)+"mm";
  var handle=document.createElement("button");handle.type="button";handle.className="browser-gap-handle";handle.dataset.gapHandle=record.id;handle.dataset.gapMm=String(record.gapMm||0);handle.setAttribute("aria-label","调整第 "+record.number+" 题题后留白");
  var handleText=document.createElement("span");handleText.textContent=roundGapLabel(record.gapMm);handle.appendChild(handleText);answerSpace.appendChild(handle);item.appendChild(answerSpace);
  return item;
}
function roundGapLabel(value){return (Math.round((Number(value)||0)*10)/10)+" mm"}
function createBrowserToc(entries,number,total){
  var page=document.createElement("section");
  page.className="typst-page browser-paper-page browser-toc-page";
  page.dataset.page=String(number);
  page.style.setProperty("--paper-width","210mm");
  page.style.setProperty("--paper-height","297mm");
  var label=document.createElement("div");label.className="browser-toc-brand";
  label.textContent="Everflow · 彼时流年若水";
  var title=document.createElement("h1");title.textContent="目　录";
  var subtitle=document.createElement("p");subtitle.textContent="CONTENTS  /  "+(state.title||"试卷");
  var content=document.createElement("div");content.className="browser-toc-lines";
  entries.forEach(function(e){
    var row=document.createElement("div");row.className="browser-toc-line";
    var name=document.createElement("span");name.textContent=e.heading;
    var dots=document.createElement("span");dots.className="browser-toc-dots";
    var num=document.createElement("b");num.textContent=String(e.page);
    row.append(name,dots,num);content.appendChild(row);
  });
  var footer=document.createElement("footer");footer.className="browser-toc-footer";
  footer.textContent="· "+number+" / "+total+" ·";
  page.append(label,title,subtitle,content,footer);return page;
}
function createBrowserCover(snapshotState){
  var cover=document.createElement("section");cover.className="typst-page browser-paper-page browser-cover-page everflow-refined-cover";cover.dataset.page="1";
  cover.style.setProperty("--paper-width","210mm");cover.style.setProperty("--paper-height","297mm");
  var title=document.createElement("div");title.className="browser-cover-title";title.textContent=snapshotState.coverTitle||snapshotState.title;
  var signature=document.createElement("div");signature.className="browser-cover-signature";signature.textContent="·彼时流年若水·";
  var line=document.createElement("div");line.className="browser-cover-line";
  var brand=document.createElement("div");brand.className="browser-cover-brand";brand.textContent="彼时流年若水 · 做题本";
  var kicker=document.createElement("div");kicker.className="everflow-cover-kicker";kicker.textContent="EVERFLOW  ·  PAPER STUDIO";
  var sub=document.createElement("div");sub.className="everflow-cover-sub";
  sub.textContent=snapshotState.template==="book"?"做题本 · 错题本 · 自由组卷":"考研自编试卷 · 本地排版";
  var note=document.createElement("div");note.className="everflow-cover-note";
  note.textContent="免费、开放的本地试卷排版工具";
  var date=document.createElement("div");date.className="browser-cover-date";date.textContent="> > > 更新时间："+localDate();
  cover.append(kicker,sub,title,signature,line,note,brand,date);return cover;
}
function renderPaper(){
  renderTemplateState();
  els.paperQuestions.replaceChildren();
  if(els.tocEnabledToggle)els.tocEnabledToggle.checked=!!state.tocEnabled;
  if(els.tocEnabledSettings)els.tocEnabledSettings.checked=!!state.tocEnabled;
  els.previewTitle.textContent=state.title;
  els.coverPreviewTitle.textContent=state.coverTitle||state.title;
  els.coverPreviewDate.textContent="> > > 更新时间："+localDate();
  if(els.coverSheet)els.coverSheet.hidden=state.testVisualConfig?.withCover===false;
  els.previewMeta.textContent=modeLabel()+" · "+state.questions.length+" 题";
  var head=document.querySelector(".paper-running-head");
  head.hidden=state.template!=="book";head.classList.toggle("book-head",state.template==="book");head.replaceChildren();
  if(state.template==="book")["彼时流年若水",state.header||"","https://zuotiben.top"].forEach(function(t){var n=document.createElement("span");n.textContent=t;head.appendChild(n)});
  var sectionOrdinal=0,previousSection="";
  state.questions.forEach(function(q,i){
    if(q.section&&q.section!==previousSection){
      sectionOrdinal++;previousSection=q.section;
      var heading=document.createElement("h2");heading.className="paper-section-heading";heading.textContent=sectionDisplayName(q.section,sectionOrdinal);els.paperQuestions.appendChild(heading);
    }
    var sec=document.createElement("section");sec.className="question";sec.dataset.index=i;sec.dataset.questionId=q.id;
    if(q.gap)sec.style.setProperty("--question-gap",q.gap+"mm");if(q.breakBefore)sec.classList.add("force-break-before");
    sec.onclick=function(){selectedId=q.id;renderOrder();renderQuestionEditor()};
    var line=document.createElement("div");line.className="question-line";
    var num=document.createElement("div");num.className="question-number";num.textContent=(i+1)+".";
    var body=document.createElement("div");body.className="question-body";textWithBreaks(body,q.content);
    line.append(num,body);sec.appendChild(line);
    appendQuestionImages(sec,q.images);
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
  renderOrder();renderPaper();renderQuestionEditor();renderSectionManager();updateBatchBar();updateHistoryButtons();
}
function previewAvailableWidth(){
  var stage=els.paperStage;
  if(!stage)return Math.max(280,window.innerWidth-24);
  var style=getComputedStyle(stage);
  var left=parseFloat(style.paddingLeft)||0,right=parseFloat(style.paddingRight)||0;
  return Math.max(160,stage.clientWidth-left-right-16);
}
function updatePages(){
  requestAnimationFrame(function(){
    var info=modeInfo(),available=previewAvailableWidth(),pxPerMm=96/25.4;
    var scale=Math.min(1,Math.max(.10,available/(info.widthMm*pxPerMm)));
    var coverScale=Math.min(1,Math.max(.10,available/(210*pxPerMm)));
    els.paperSheet.style.setProperty("--preview-scale",String(scale));
    els.coverSheet.style.setProperty("--preview-scale",String(coverScale));
    document.documentElement.style.setProperty("--paper-preview-scale",String(scale));
    document.documentElement.style.setProperty("--cover-preview-scale",String(coverScale));
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
function loadUiState(){
  try{
    var d=JSON.parse(localStorage.getItem(UI_STORAGE_KEY)||"{}");
    if(d.navigatorWidth)document.documentElement.style.setProperty("--navigator-w",Math.max(210,Math.min(470,Number(d.navigatorWidth)))+"px");
    if(d.projectHeight)document.documentElement.style.setProperty("--workspace-h",Math.max(135,Math.min(520,Number(d.projectHeight)))+"px");
    if(d.editorWidth)document.documentElement.style.setProperty("--editor-w",Math.max(280,Math.min(900,Number(d.editorWidth)))+"px");
    if(d.navigatorCollapsed&&window.matchMedia("(min-width:1180px)").matches)document.body.classList.add("navigator-collapsed");
  }catch(e){}
}
function persistUiState(extra){
  try{
    var current={};
    try{current=JSON.parse(localStorage.getItem(UI_STORAGE_KEY)||"{}")}catch(e){}
    localStorage.setItem(UI_STORAGE_KEY,JSON.stringify(Object.assign(current,extra||{})));
  }catch(e){}
}
function setNavigatorTab(name){
  var settings=name==="settings";
  if(els.outlineTabButton)els.outlineTabButton.setAttribute("aria-selected",String(!settings));
  if(els.settingsTabButton)els.settingsTabButton.setAttribute("aria-selected",String(settings));
  if(els.outlinePanel)els.outlinePanel.hidden=settings;
  if(els.settingsPanel)els.settingsPanel.hidden=!settings;
}
function closeNavigatorDrawer(){
  document.body.classList.remove("navigator-open");
  if(els.workbenchBackdrop)els.workbenchBackdrop.hidden=true;
  updateNavigatorToggleState();
}
function updateNavigatorToggleState(){
  var btn=els.navigatorToggleButton;
  if(!btn)return;
  var compact=window.matchMedia("(max-width:1179px)").matches;
  var open=compact?document.body.classList.contains("navigator-open"):!document.body.classList.contains("navigator-collapsed");
  btn.setAttribute("aria-expanded",String(open));
  btn.title=open?"收起工作区与大纲":"展开工作区与大纲";
}
function toggleNavigator(){
  if(window.matchMedia("(max-width:1179px)").matches){
    var open=!document.body.classList.contains("navigator-open");
    document.body.classList.toggle("navigator-open",open);
    if(els.workbenchBackdrop)els.workbenchBackdrop.hidden=!open;
    updateNavigatorToggleState();return;
  }
  var collapsed=!document.body.classList.contains("navigator-collapsed");
  document.body.classList.toggle("navigator-collapsed",collapsed);
  persistUiState({navigatorCollapsed:collapsed});
  updateNavigatorToggleState();
  requestAnimationFrame(applyPreviewZoom);
}
function clampPaneSize(value,min,max){return Math.max(min,Math.min(max,Number(value)||min))}
function workbenchWidths(){
  var w=els.workbench.getBoundingClientRect().width||window.innerWidth;
  var tablet=window.matchMedia("(min-width:768px) and (max-width:1179px)").matches;
  var nav=tablet?0:(document.body.classList.contains("navigator-collapsed")?0:els.navigatorPanel.getBoundingClientRect().width);
  return {total:w,navigator:nav,tablet:tablet,gutter:tablet?10:20};
}
function resizePane(kind,pixels,store){
  var dims=workbenchWidths(),value=Math.round(Number(pixels));
  if(kind==="navigator"){
    if(dims.tablet)return;
    value=clampPaneSize(value,210,Math.min(470,dims.total-14-280-350));
    document.documentElement.style.setProperty("--navigator-w",value+"px");
    document.body.style.setProperty("--navigator-w",value+"px");
    if(store!==false)persistUiState({navigatorWidth:value});
  }else{
    var available=dims.total-dims.gutter-dims.navigator-(dims.tablet?360:350);
    value=clampPaneSize(value,dims.tablet?320:280,Math.max(dims.tablet?320:280,available));
    document.documentElement.style.setProperty("--editor-w",value+"px");
    document.body.style.setProperty("--editor-w",value+"px");
    if(store!==false)persistUiState({editorWidth:value});
  }
  requestAnimationFrame(applyPreviewZoom);
}
function normalizeWorkspaces(){
  if(window.matchMedia("(max-width:767px)").matches)return;
  var root=document.documentElement,settings={};
  try{settings=JSON.parse(localStorage.getItem(UI_STORAGE_KEY)||"{}")}catch(e){}
  if(window.innerWidth>=1180)resizePane("navigator",settings.navigatorWidth||260,false);
  resizePane("preview",settings.editorWidth||(window.innerWidth<1180?Math.round(window.innerWidth*.46):440),false);
}
function bindPaneResizer(el,kind){
  if(!el)return;
  var named=kind==="navigator"?"工作区 / 编辑":"编辑 / 预览";
  el.title="拖动调整「"+named+"」比例；方向键微调；双击恢复默认";
  el.setAttribute("aria-valuemin",kind==="navigator"?"210":"280");
  el.setAttribute("aria-valuemax",kind==="navigator"?"470":"900");
  el.addEventListener("dblclick",function(){
    resizePane(kind,kind==="navigator"?260:Math.min(440,window.innerWidth*.44));
  });
  el.addEventListener("keydown",function(e){
    if(e.key!=="ArrowLeft"&&e.key!=="ArrowRight")return;
    e.preventDefault();
    var rect=(kind==="navigator"?els.navigatorPanel:els.editPane).getBoundingClientRect();
    resizePane(kind,rect.width+(e.key==="ArrowRight"?24:-24));
  });
  el.addEventListener("pointerdown",function(e){
    if(e.button!==0||window.matchMedia("(max-width:767px)").matches)return;
    if(kind==="navigator"&&window.matchMedia("(max-width:1179px)").matches)return;
    e.preventDefault();e.stopPropagation();
    var initial=e.clientX,width=(kind==="navigator"?els.navigatorPanel:els.editPane).getBoundingClientRect().width;
    var active=true;
    el.classList.add("is-dragging");
    document.body.classList.add("is-resizing-panes");
    try{el.setPointerCapture(e.pointerId)}catch(error){}
    function move(ev){
      if(!active)return;
      resizePane(kind,width+ev.clientX-initial,false);
      el.setAttribute("aria-valuenow",String(Math.round((kind==="navigator"?els.navigatorPanel:els.editPane).getBoundingClientRect().width)));
    }
    function stop(ev){
      if(!active)return;active=false;
      move(ev||e);
      var final=(kind==="navigator"?els.navigatorPanel:els.editPane).getBoundingClientRect().width;
      resizePane(kind,final,true);
      el.classList.remove("is-dragging");
      document.body.classList.remove("is-resizing-panes");
      document.removeEventListener("pointermove",move);
      document.removeEventListener("pointerup",stop);
      document.removeEventListener("pointercancel",stop);
      try{el.releasePointerCapture(e.pointerId)}catch(error){}
    }
    document.addEventListener("pointermove",move);
    document.addEventListener("pointerup",stop);
    document.addEventListener("pointercancel",stop);
  });
}
function bindWorkspaceHeightResizer(){
  var handle=els.workspaceHeightResizer;
  if(!handle||!els.workspaceProjects)return;
  function setHeight(h){
    h=Math.max(135,Math.min(520,Math.round(h)));
    document.documentElement.style.setProperty("--workspace-h",h+"px");
    handle.setAttribute("aria-valuenow",String(h));persistUiState({projectHeight:h});
  }
  handle.addEventListener("pointerdown",function(e){
    if(e.button!==0)return;e.preventDefault();
    var top=els.workspaceProjects.getBoundingClientRect().top;
    handle.setPointerCapture(e.pointerId);
    handle.classList.add("is-dragging");
    function move(ev){setHeight(ev.clientY-top)}
    function end(){
      handle.classList.remove("is-dragging");
      handle.removeEventListener("pointermove",move);
      handle.removeEventListener("pointerup",end);
      handle.removeEventListener("pointercancel",end);
    }
    handle.addEventListener("pointermove",move);
    handle.addEventListener("pointerup",end);
    handle.addEventListener("pointercancel",end);
  });
  handle.addEventListener("keydown",function(e){
    if(!["ArrowUp","ArrowDown","Home","End"].includes(e.key))return;
    e.preventDefault();
    var cur=els.workspaceProjects.getBoundingClientRect().height;
    setHeight(e.key==="Home"?135:e.key==="End"?520:cur+(e.key==="ArrowDown"?24:-24));
  });
  handle.addEventListener("dblclick",function(){setHeight(260)});
}
function previewBaseWidth(){
  var info=modeInfo();
  return Math.max(560,Math.round(Number(info.widthMm||210)*3.45));
}
function applyPreviewZoom(){
  if(!els.typstPreview)return;
  var width;
  if(window.matchMedia("(max-width:767px)").matches){
    width=Math.max(260,els.typstPreview.clientWidth-12);
  }else if(previewFit){
    width=Math.max(320,els.typstPreview.clientWidth-40);
  }else{
    width=Math.round(previewBaseWidth()*previewZoom);
  }
  els.typstPreview.style.setProperty("--preview-page-width",width+"px");
  var physicalWidth=(Number(modeInfo().widthMm)||210)*(96/25.4);
  els.typstPreview.style.setProperty("--browser-preview-scale",String(Math.max(.08,Math.min(2.2,width/physicalWidth))));
  if(els.previewZoomLabel)els.previewZoomLabel.textContent=previewFit?"适宽":Math.round(previewZoom*100)+"%";
}
function setPreviewZoom(next){
  previewFit=false;
  previewZoom=Math.max(.45,Math.min(2.2,Number(next)||1));
  applyPreviewZoom();
}
function updatePreviewPageIndicator(page){
  currentPreviewPage=Math.max(1,Math.min(previewPageCount||1,Number(page)||1));
  if(els.previewPageIndicator)els.previewPageIndicator.textContent=previewPageCount?currentPreviewPage+" / "+previewPageCount:"— / —";
  if(els.previewPrevPageButton)els.previewPrevPageButton.disabled=currentPreviewPage<=1;
  if(els.previewNextPageButton)els.previewNextPageButton.disabled=!previewPageCount||currentPreviewPage>=previewPageCount;
}
function observePreviewPages(){
  if(previewObserver){previewObserver.disconnect();previewObserver=null}
  var pages=Array.from(els.typstPreview?els.typstPreview.querySelectorAll(":scope > section.typst-page"):[]);
  previewPageCount=pages.length;
  updatePreviewPageIndicator(Math.min(currentPreviewPage,Math.max(1,previewPageCount)));
  if(!pages.length||typeof IntersectionObserver!=="function")return;
  previewObserver=new IntersectionObserver(function(entries){
    var best=null;
    entries.forEach(function(entry){
      if(entry.isIntersecting&&(!best||entry.intersectionRatio>best.intersectionRatio))best=entry;
    });
    if(best)updatePreviewPageIndicator(Number(best.target.dataset.page)||1);
  },{root:els.typstPreview,threshold:[.2,.4,.6,.8]});
  pages.forEach(function(page){previewObserver.observe(page)});
}
function scrollPreviewPage(page){
  if(!els.typstPreview)return;
  var target=els.typstPreview.querySelector(':scope > section.typst-page[data-page="'+page+'"]');
  if(target)target.scrollIntoView({behavior:"smooth",block:"start"});
}
function bindDrag(container){
  var from=null;
  container.addEventListener("dragstart",function(e){var row=e.target.closest(".order-item");if(!row)return;from=Number(row.dataset.index);row.classList.add("dragging")});
  container.addEventListener("dragover",function(e){var row=e.target.closest(".order-item");if(!row)return;e.preventDefault();container.querySelectorAll(".order-item").forEach(function(x){x.classList.remove("drop-before")});row.classList.add("drop-before")});
  container.addEventListener("drop",function(e){var row=e.target.closest(".order-item");if(!row||from==null)return;e.preventDefault();move(from,Number(row.dataset.index));from=null});
  container.addEventListener("dragend",function(){from=null;container.querySelectorAll(".order-item").forEach(function(x){x.classList.remove("dragging","drop-before")})});
}
function wantsLiveTypst(){
  return previewMode || window.matchMedia("(min-width:768px)").matches;
}
function scheduleTypstPreview(){
  clearTimeout(previewCompileTimer);
  if(suspendTypstPreview||!wantsLiveTypst()||!els.typstPreview)return;
  els.pdfStatus.textContent="正在测量题目、公式和图片…";
  previewCompileTimer=setTimeout(function(){refreshTypstPreview()},220);
}
async function refreshTypstPreview(){
  if(suspendTypstPreview||typstPreviewing)return;
  if(!window.EverflowBrowserLayout)throw new Error("浏览器分页引擎未加载");
  typstPreviewing=true;
  if(browserLayoutController)browserLayoutController.abort();
  browserLayoutController=new AbortController();
  try{
    var current=revision,snapshotState=deepClone(state);snapshotState.exportDate=localDate();
    var records=layoutRecords(snapshotState),info=modeInfoFor(snapshotState);
    var result=await window.EverflowBrowserLayout.render({
      host:els.typstPreview,records:records,info:info,template:snapshotState.template,
      title:snapshotState.title,header:snapshotState.header,layoutVersion:"browser-r"+current,signal:browserLayoutController.signal,
      createItem:function(record){return createLayoutItem(record)},
      createCover:snapshotState.testVisualConfig?.withCover===false?null:function(){return createBrowserCover(snapshotState)},
      createToc:snapshotState.tocEnabled?function(entries,n,t){return createBrowserToc(entries,n,t)}:null,renderMath:renderMath,
      onProgress:function(progress){
        if(progress.phase==="measuring")els.pdfStatus.textContent="正在测量题目、公式和图片…";
        else if(progress.phase==="repairing")els.pdfStatus.textContent="正在自动调整分页 · 第 "+progress.pass+"/3 轮";
      }
    });
    if(current!==revision){typstPreviewing=false;scheduleTypstPreview();return}
    browserLayoutResult=result;svgRevision=current;svgExportDate=snapshotState.exportDate;
    els.typstPreview.classList.remove("is-stale-preview");
    observePreviewPages();requestAnimationFrame(applyPreviewZoom);
    if(wantsLiveTypst()){
      els.typstPreview.hidden=false;els.paperStage.hidden=true;
    }
    els.typstPreview.dataset.layoutReady="true";
    els.typstPreview.dataset.revision=String(current);
    var adjusted=Object.keys(result.scales||{}).length;
    els.pdfStatus.textContent="分页已完成 · "+result.pageCount+" 页正文"+(result.tocPageCount?" · "+result.tocPageCount+" 页目录":"")+(adjusted?" · 自动缩放 "+adjusted+" 题":"")+"；预览、下载及打印使用同一分页结果。";
  }catch(e){
    if(!suspendTypstPreview&&!(e&&e.name==="AbortError")){
      console.error(e);
      browserLayoutResult=null;svgRevision=-1;els.typstPreview.dataset.layoutReady="false";
      els.typstPreview.removeAttribute("data-revision");
      var failedId=e&&e.questionId||(e&&e.questionIds&&e.questionIds[0]);
      if(failedId&&state.questions.some(function(q){return q.id===failedId})){
        selectedId=failedId;renderOrder();renderQuestionEditor();
      }
      var previewPages=els.typstPreview.querySelectorAll("section.browser-paper-page");
      if(previewPages.length){
        // Do not destroy the last valid visual reference. Disable export and label it stale.
        els.typstPreview.classList.add("is-stale-preview");
      }else{
        var warning=document.createElement("div");warning.className="layout-error-card";
        var h=document.createElement("strong");h.textContent="预览未生成，已定位需要修改的题目";
        var p=document.createElement("p");p.textContent=e.message||"请检查公式、图片和题干长度。";
        var b=document.createElement("button");b.type="button";b.textContent="打开问题题目进行编辑";
        b.onclick=function(){if(window.matchMedia("(max-width:767px)").matches)setMode(false);els.questionEditor.scrollIntoView({behavior:"smooth",block:"start"})};
        warning.append(h,p,b);els.typstPreview.replaceChildren(warning);
      }
      observePreviewPages();
      var badNum=failedId?state.questions.findIndex(function(q){return q.id===failedId})+1:0;
      els.pdfStatus.textContent="浏览器分页失败"+(badNum?" · 已定位第 "+badNum+" 题":"")+": "+(e.message||"未知错误")+"；保留上次预览作为参考，但禁止导出不完整 PDF。";
    }
  }finally{
    typstPreviewing=false;
  }
}
function syncViewportMode(){
  var desktopLike=window.matchMedia("(min-width:768px)").matches;
  if(previewMode||desktopLike){
    els.paperStage.hidden=true;
    els.typstPreview.hidden=false;
    if(svgRevision!==revision||svgExportDate!==localDate())scheduleTypstPreview();
  }else{
    els.typstPreview.hidden=true;
    els.paperStage.hidden=true;
    clearTimeout(previewCompileTimer);
  }
}
async function setMode(preview){
  previewMode=!!preview;
  document.body.classList.toggle("preview-mode",previewMode);
  els.editModeButton.setAttribute("aria-pressed",String(!previewMode));
  els.previewModeButton.setAttribute("aria-pressed",String(previewMode));
  syncViewportMode();
  // Mobile editing hides the preview; its old zoom may belong to tablet width.
  // Recalculate immediately after making the physical paper host visible.
  if(previewMode)applyPreviewZoom();
  if(wantsLiveTypst()){
    var today=localDate();
    if(svgRevision!==revision||svgExportDate!==today)await refreshTypstPreview();
    else els.pdfStatus.textContent="分页已完成 · 预览已是最新；打印复用当前页面布局。";
  }else{
    els.pdfStatus.textContent="手机编辑模式：切到“预览”查看 ExamA4 浏览器分页。";
  }
}
function renderQuestionEditor(){
  var root=els.questionEditor;root.replaceChildren();
  var q=state.questions.find(function(x){return x.id===selectedId});if(!q)return;
  var idx=state.questions.indexOf(q),h=document.createElement("div");h.className="question-editor-head";
  if(els.activeQuestionLabel)els.activeQuestionLabel.textContent="第 "+(idx+1)+" 题 · "+(q.type||"题目");
  renderQuestionNav();
  var title=document.createElement("h3");title.textContent="第 "+(idx+1)+" 题";
  var actions=document.createElement("div");
  var insert=document.createElement("button");insert.type="button";insert.className="text-btn";insert.textContent="后插题";insert.onclick=function(){mutateState(function(){var nq=newQuestion(q.section);state.questions.splice(idx+1,0,nq);selectedId=nq.id},"已插入新题")};
  var duplicate=document.createElement("button");duplicate.type="button";duplicate.className="text-btn";duplicate.textContent="复制";
  duplicate.onclick=function(){undoStack.push(snapshot());var copy=deepClone(q);copy.id="local-copy-"+Date.now().toString(36);state.questions.splice(idx+1,0,copy);selectedId=copy.id;save(false);render()};
  var removeQ=document.createElement("button");removeQ.type="button";removeQ.className="text-btn danger";removeQ.textContent="删除";
  removeQ.onclick=function(){if(!confirm("删除第 "+(idx+1)+" 题？"))return;mutateState(function(){selectedIds.delete(q.id);state.questions.splice(idx,1);selectedId=(state.questions[idx]||state.questions[idx-1]||{}).id||null},"已删除题目")};
  actions.append(insert,duplicate,removeQ);h.append(title,actions);root.appendChild(h);

  function touch(){save();renderPaper();renderOrder()}
  function inputField(label,key,kind){
    var l=document.createElement("label");l.textContent=label;var input=document.createElement(kind||"input");input.value=q[key]||"";l.appendChild(input);root.appendChild(l);
    input.oninput=function(){q[key]=key==="gap"?Math.max(0,Math.min(100,Number(input.value)||0)):input.value;touch()};return input;
  }
  var sectionInput=inputField("所属大纲章节","section");
  sectionInput.title="名称包含「选择」时默认显示选项，其他大题默认不显示";
  sectionInput.addEventListener("input",function(){
    assignDefaultOptions(q);
    var checks=root.querySelectorAll(".check-row input[type=checkbox]");
    if(checks[1])checks[1].checked=q.showOptions;
    save();renderOrder();renderPaper();
  });
  var typeLabel=document.createElement("label");typeLabel.textContent="题型";var select=document.createElement("select");
  QUESTION_TYPES.forEach(function(t){var o=document.createElement("option");o.value=t;o.textContent=t;if(q.type===t)o.selected=true;select.appendChild(o)});
  select.onchange=function(){q.type=select.value;assignDefaultOptions(q);touch();renderQuestionEditor()};typeLabel.appendChild(select);root.appendChild(typeLabel);
  inputField("题干（支持 LaTeX 公式）","content","textarea");
  inputField("答案（默认隐藏）","answer","textarea");
  inputField("解析（默认隐藏）","explanation","textarea");
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
function bindBrowserPreviewInteractions(){
  if(!els.typstPreview)return;
  els.typstPreview.addEventListener("click",function(event){
    if(event.target.closest(".browser-gap-handle"))return;
    var item=event.target.closest("[data-question-id]");if(!item)return;
    var id=item.dataset.questionId;if(!state.questions.some(function(q){return q.id===id}))return;
    selectedId=id;renderOrder();renderQuestionEditor();
  });
  els.typstPreview.addEventListener("pointerdown",function(event){
    var handle=event.target.closest(".browser-gap-handle");if(!handle)return;
    event.preventDefault();event.stopPropagation();
    var id=handle.dataset.gapHandle,q=state.questions.find(function(item){return item.id===id});if(!q)return;
    var startY=event.clientY,startGap=Number(handle.dataset.gapMm)||0;
    var scale=Number(getComputedStyle(els.typstPreview).getPropertyValue("--browser-preview-scale"))||1;
    var activeSpaces=Array.from(els.typstPreview.querySelectorAll('[data-question-id="'+CSS.escape(id)+'"] .question-answer-space'));
    document.body.classList.add("is-adjusting-paper-gap");
    function moveGap(pointer){
      var next=Math.max(0,Math.min(100,Math.round((startGap+(pointer.clientY-startY)/(96/25.4)/scale)*10)/10));
      activeSpaces.forEach(function(space){space.style.height=next+"mm";var label=space.querySelector(".browser-gap-handle span");if(label)label.textContent=roundGapLabel(next)});
      handle.dataset.pendingGap=String(next);
    }
    function finish(){
      window.removeEventListener("pointermove",moveGap);window.removeEventListener("pointerup",finish);window.removeEventListener("pointercancel",cancel);
      document.body.classList.remove("is-adjusting-paper-gap");
      var next=Number(handle.dataset.pendingGap);if(!Number.isFinite(next))return;
      mutateState(function(){var current=state.questions.find(function(item){return item.id===id});if(current)current.gap=next},"已调整第 "+(state.questions.indexOf(q)+1)+" 题留白");
    }
    function cancel(){
      window.removeEventListener("pointermove",moveGap);window.removeEventListener("pointerup",finish);window.removeEventListener("pointercancel",cancel);
      document.body.classList.remove("is-adjusting-paper-gap");scheduleTypstPreview();
    }
    window.addEventListener("pointermove",moveGap);window.addEventListener("pointerup",finish,{once:true});window.addEventListener("pointercancel",cancel,{once:true});
  });
}
async function createLatestPdf(){
  if(pdfExporting)return null;
  pdfExporting=true;
  suspendTypstPreview=true;
  clearTimeout(previewCompileTimer);
  els.printButton.disabled=true;els.printButton.setAttribute("aria-busy","true");
  if(els.mobileDownloadButton){els.mobileDownloadButton.disabled=true;els.mobileDownloadButton.setAttribute("aria-busy","true")}
  try{
    var current=revision,snapshotState=deepClone(state);snapshotState.exportDate=localDate();
    els.pdfStatus.textContent="正在本机用 Typst WASM 优先生成 PDF…";
    var engine=await import("./typst-engine.js?v=20261012-layout4");
    // Exact PDF compilation uses a clean Typst worker and stays independent from
    // the browser-measured preview/print layout.
    engine.disposeTypstWorker();
    typstPreviewing=false;
    var blob=await engine.compileTypstPdf(snapshotState,modeInfo(),"pdf-r"+current);
    if(current!==revision){
      pdfBlob=null;pdfRevision=-1;
      els.pdfStatus.textContent="内容刚刚发生变化，重新按最新内容生成 PDF…";
      pdfExporting=false;suspendTypstPreview=false;
      els.printButton.disabled=false;els.printButton.removeAttribute("aria-busy");
      if(els.mobileDownloadButton){els.mobileDownloadButton.disabled=false;els.mobileDownloadButton.removeAttribute("aria-busy")}
      return createLatestPdf();
    }
    pdfBlob=blob;pdfRevision=current;pdfExportDate=snapshotState.exportDate;
    els.pdfStatus.textContent=(browserLayoutResult&&svgRevision===revision?"分页已完成 · ":"")+"精确 PDF 已在本机生成；未使用服务器编译。";
    return blob;
  }finally{
    pdfExporting=false;suspendTypstPreview=false;
    els.printButton.disabled=false;els.printButton.removeAttribute("aria-busy");
    if(els.mobileDownloadButton){els.mobileDownloadButton.disabled=false;els.mobileDownloadButton.removeAttribute("aria-busy")}
    if(wantsLiveTypst()&&(svgRevision!==revision||svgExportDate!==localDate()))scheduleTypstPreview();
  }
}
async function downloadPdf(){
  if(pdfExporting)return;
  pdfExporting=true;
  var button=els.printButton,mobileButton=els.mobileDownloadButton;
  if(button){button.disabled=true;button.setAttribute("aria-busy","true")}
  if(mobileButton){mobileButton.disabled=true;mobileButton.setAttribute("aria-busy","true")}
  try{
    // Never trigger window.print for direct PDF download.
    // Screen zoom and device viewport are NOT part of the PDF page geometry.
    if(!wantsLiveTypst())await setMode(true);
    var current=revision;
    if(svgRevision!==revision||!browserLayoutResult||browserLayoutResult.status!=="ready"){
      if(!typstPreviewing)await refreshTypstPreview();
      if(svgRevision!==revision||!browserLayoutResult||browserLayoutResult.status!=="ready")await waitForBrowserLayoutRevision(revision,20000);
    }
    if(svgRevision!==revision||!browserLayoutResult||browserLayoutResult.status!=="ready"||
      els.typstPreview.dataset.revision!==String(revision)||
      els.typstPreview.dataset.layoutReady!=="true"){
      throw new Error("当前预览没有通过分页校验，请先处理错误，不能下载 PDF");
    }
    if(!window.EverflowPreviewPdf)throw new Error("直接下载模块未加载，请刷新页面");
    if(window.EverflowBrowserLayout)await window.EverflowBrowserLayout.waitForResources(els.typstPreview,null);
    els.pdfStatus.textContent="正在准备 PDF · 逐页按照当前预览生成，无需系统打印…";
    var blob=await window.EverflowPreviewPdf.exportPreview({
      host:els.typstPreview,
      isStale:function(){return current!==revision||svgRevision!==current||els.typstPreview.dataset.layoutReady!=="true"},
      onProgress:function(done,total){els.pdfStatus.textContent="正在直接生成 PDF · "+done+" / "+total+" 页；未调用系统打印"}
    });
    if(current!==revision)throw new Error("导出过程中题目有变化，请重新下载");
    var name=state.coverTitle||state.title||"Everflow";
    var result=await SAVE.saveBlob(blob,{fileName:name+".pdf",mime:"application/pdf",extension:".pdf",preferNative:false});
    if(result.method!=="cancelled"){
      els.pdfStatus.textContent="PDF 直接下载完成 · 与当前预览使用同一组分页页面（高清图像型 PDF）。";
      toast("PDF 已直接生成并保存");
    }
  }catch(err){
    console.error(err);
    els.pdfStatus.textContent="直接下载失败："+(err&&err.message||"未知错误")+"。预览未更改，可再次尝试。";
  }finally{
    pdfExporting=false;
    if(button){button.disabled=false;button.removeAttribute("aria-busy")}
    if(mobileButton){mobileButton.disabled=false;mobileButton.removeAttribute("aria-busy")}
  }
}
async function browserPrint(){
  if(browserPrintBusy)return;
  browserPrintBusy=true;
  if(els.browserPrintButton){els.browserPrintButton.disabled=true;els.browserPrintButton.setAttribute("aria-busy","true")}
  try{
    // The mobile edit tab hides the preview host; measurement must run in a visible host.
    // Switch to preview before any validation, otherwise hidden DOM has zero-sized boxes.
    if(!wantsLiveTypst())await setMode(true);
    if(svgRevision!==revision||!browserLayoutResult||browserLayoutResult.status!=="ready"){
      if(!typstPreviewing)await refreshTypstPreview();
      if(svgRevision!==revision||!browserLayoutResult||browserLayoutResult.status!=="ready")await waitForBrowserLayoutRevision(revision,12000);
    }
    if(svgRevision!==revision||!browserLayoutResult||browserLayoutResult.status!=="ready"||els.typstPreview.dataset.revision!==String(revision)||els.typstPreview.dataset.layoutReady!=="true")throw new Error("当前预览尚未通过分页检查，禁止导出不一致的 PDF");
    if(window.EverflowBrowserLayout)await window.EverflowBrowserLayout.waitForResources(els.typstPreview,null);
    document.body.classList.add("browser-print-active");
    els.pdfStatus.textContent="同一份预览已交给系统打印；请选择“存储为 PDF”或“另存为 PDF”。";
    var cleanup=function(){
      document.body.classList.remove("browser-print-active");window.removeEventListener("afterprint",cleanup);
      els.pdfStatus.textContent="分页已完成 · PDF 打印复用了预览的同一份分页布局。";
    };
    window.addEventListener("afterprint",cleanup,{once:true});
    window.print();
  }catch(error){
    document.body.classList.remove("browser-print-active");
    console.error(error);els.pdfStatus.textContent="浏览器打印准备失败："+(error.message||"未知错误");
  }finally{
    browserPrintBusy=false;
    if(els.browserPrintButton){els.browserPrintButton.disabled=false;els.browserPrintButton.removeAttribute("aria-busy")}
  }
}
function waitForBrowserLayoutRevision(targetRevision,timeout){
  return new Promise(function(resolve,reject){
    var started=Date.now();
    function check(){
      if(svgRevision===targetRevision&&browserLayoutResult&&browserLayoutResult.status==="ready")return resolve(browserLayoutResult);
      if(Date.now()-started>timeout)return reject(new Error("分页等待超时，请检查题目中无法加载的图片或公式"));
      setTimeout(check,60);
    }
    check();
  });
}
async function exportProject(){
  var data={
    version:2,type:"everflow-local-paper",localOnly:true,latexEnabled:false,
    template:state.template,layout:state.layout,header:state.header,tocEnabled:state.tocEnabled,originalIds:state.originalIds,
    title:state.title,coverTitle:state.coverTitle,
    questions:state.questions.map(function(q){return Object.assign({},q,{localId:q.id})})
  };
  var blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
  try{await SAVE.saveBlob(blob,{fileName:(state.title||"Everflow-项目")+".everflow",mime:"application/json",extension:".everflow"})}catch(e){toast("保存项目失败："+e.message)}
}
function init(){
  ["toast","paperName","questionCount","sourceName","orderList","paperSheet","coverSheet","paperStage","paperQuestions","previewTitle","previewMeta",
   "previewPageCurrent","previewPageTotal","editModeButton","previewModeButton","typstPreview","pdfStatus","questionEditor","titleInput","coverTitleInput",
   "headerInput","testFontPt","testGapMm","formalCoverToggle","templateButton","templateButtonLabel","templatePopover","templateMenu","templateSummary","pageSizeChip","bookHeaderLabel","printButton","browserPrintButton",
   "saveProjectButton","resetOrderButton","clearButton","undoButton","redoButton","saveState","exportDateDisplay","coverPreviewTitle","coverPreviewDate","addQuestionButton","sectionManageButton","sectionPanel","addSectionButton","sectionList","batchBar","batchCount","batchGapInput","batchGapApplyButton","batchGapResetButton","batchSectionSelect","batchMoveSectionButton","batchClearButton","mobileDownloadButton","navigatorToggleButton","outlineTabButton","settingsTabButton","outlinePanel","settingsPanel","navigatorPanel","navigatorResizer","previewResizer","workspaceHeightResizer","workspaceProjects","outlineNav","tocEnabledToggle","tocEnabledSettings","workbench","editPane","previewPane","workbenchBackdrop","activeQuestionLabel","focusStemButton","focusOptionsButton","previewPrevPageButton","previewNextPageButton","previewPageIndicator","previewZoomOutButton","previewZoomInButton","previewZoomLabel","previewFitButton","prevQuestionButton","nextQuestionButton","questionNavPickerButton","questionNavCounter","questionNavPopover","questionNavMenu","selectAllQuestionsButton","selectChapterButton","clearQuestionSelectionButton","outlineSelectionSummary","editorGuideButton","editorGuideDialog","closeEditorGuideButton","finishEditorGuideButton","hideEditorGuideHint"
  ].forEach(function(id){els[id]=byId(id)});
  if(!load()){location.replace("../");return}
  selectedId=state.questions[0].id;syncInputs();bindDrag(els.orderList);
  bindBrowserPreviewInteractions();
  loadUiState();
  normalizeWorkspaces();
  updateNavigatorToggleState();
  window.addEventListener("resize",function(){normalizeWorkspaces();updateNavigatorToggleState()});
  bindPaneResizer(els.navigatorResizer,"navigator");
  bindPaneResizer(els.previewResizer,"preview");
  bindWorkspaceHeightResizer();
  function toggleToc(e){
    var on=e.target.checked;
    mutateState(function(){state.tocEnabled=on},"已"+(on?"开启":"关闭")+"目录页");
  }
  if(els.tocEnabledToggle)els.tocEnabledToggle.onchange=toggleToc;
  if(els.tocEnabledSettings)els.tocEnabledSettings.onchange=toggleToc;
  if(els.outlineTabButton)els.outlineTabButton.onclick=function(){setNavigatorTab("outline")};
  if(els.settingsTabButton)els.settingsTabButton.onclick=function(){setNavigatorTab("settings")};
  if(els.navigatorToggleButton)els.navigatorToggleButton.onclick=toggleNavigator;
  if(els.workbenchBackdrop)els.workbenchBackdrop.onclick=closeNavigatorDrawer;
  if(els.prevQuestionButton)els.prevQuestionButton.onclick=function(){navigateQuestion(state.questions.findIndex(function(q){return q.id===selectedId})-1)};
  if(els.nextQuestionButton)els.nextQuestionButton.onclick=function(){navigateQuestion(state.questions.findIndex(function(q){return q.id===selectedId})+1)};
  if(els.questionNavPickerButton)els.questionNavPickerButton.onclick=function(){
    var menu=els.questionNavPopover;
    menu.hidden=!menu.hidden;
    els.questionNavPickerButton.setAttribute("aria-expanded",String(!menu.hidden));
    if(menu.hidden)return;
    els.questionNavMenu.replaceChildren();
    var previousSection="";
    state.questions.forEach(function(q,i){
      if(q.section!==previousSection){
        previousSection=q.section;
        var group=document.createElement("div");group.className="question-nav-group";
        group.textContent=q.section||"未分类";els.questionNavMenu.appendChild(group);
      }
      var button=document.createElement("button");button.type="button";
      button.className="question-nav-option"+(q.id===selectedId?" is-active":"");
      button.textContent="第 "+(i+1)+" 题 · "+clip(q.content,45);
      button.onclick=function(){menu.hidden=true;els.questionNavPickerButton.setAttribute("aria-expanded","false");navigateQuestion(i)};
      els.questionNavMenu.appendChild(button);
      if(q.id===selectedId)requestAnimationFrame(function(){button.scrollIntoView({block:"nearest"})});
    });
  };
  document.addEventListener("pointerdown",function(e){
    if(els.questionNavPopover&&!els.questionNavPopover.hidden&&!e.target.closest(".editor-question-nav")){
      els.questionNavPopover.hidden=true;els.questionNavPickerButton.setAttribute("aria-expanded","false");
    }
  });
  document.addEventListener("keydown",function(e){
    if(e.altKey&&(e.key==="ArrowDown"||e.key==="ArrowUp")&&!e.ctrlKey&&!e.metaKey){
      if(e.target.closest("input,textarea,select,[contenteditable]"))return;
      e.preventDefault();navigateQuestion(state.questions.findIndex(function(q){return q.id===selectedId})+(e.key==="ArrowDown"?1:-1));
    }
  });
  if(els.selectAllQuestionsButton)els.selectAllQuestionsButton.onclick=function(){
    state.questions.forEach(function(q){selectedIds.add(q.id)});
    renderOrder();updateBatchBar();
  };
  if(els.selectChapterButton)els.selectChapterButton.onclick=function(){
    var current=state.questions.find(function(q){return q.id===selectedId});
    if(!current)return;
    state.questions.forEach(function(q){if(q.section===current.section)selectedIds.add(q.id)});
    renderOrder();updateBatchBar();
  };
  if(els.clearQuestionSelectionButton)els.clearQuestionSelectionButton.onclick=function(){
    selectedIds.clear();lastBatchCheckboxIndex=-1;renderOrder();updateBatchBar();
  };
  function closeGuide(){
    els.editorGuideDialog.hidden=true;
    if(els.hideEditorGuideHint?.checked)try{localStorage.setItem("everflow-guide-completed-v1","1")}catch(e){}
  }
  if(els.editorGuideButton)els.editorGuideButton.onclick=function(){els.editorGuideDialog.hidden=false;els.closeEditorGuideButton.focus()};
  if(els.closeEditorGuideButton)els.closeEditorGuideButton.onclick=closeGuide;
  if(els.finishEditorGuideButton)els.finishEditorGuideButton.onclick=closeGuide;
  if(els.editorGuideDialog)els.editorGuideDialog.onclick=function(e){if(e.target===els.editorGuideDialog)closeGuide()};
  document.addEventListener("keydown",function(e){if(e.key==="Escape"&&!els.editorGuideDialog.hidden)closeGuide()});
  if(els.focusStemButton)els.focusStemButton.onclick=function(){var x=els.questionEditor.querySelector("textarea");if(x){x.focus();x.scrollIntoView({block:"center"})}};
  if(els.focusOptionsButton)els.focusOptionsButton.onclick=function(){var x=els.questionEditor.querySelector(".option-editor input");if(x){x.focus();x.scrollIntoView({block:"center"})}};
  if(els.previewPrevPageButton)els.previewPrevPageButton.onclick=function(){scrollPreviewPage(Math.max(1,currentPreviewPage-1))};
  if(els.previewNextPageButton)els.previewNextPageButton.onclick=function(){scrollPreviewPage(Math.min(previewPageCount,currentPreviewPage+1))};
  if(els.previewZoomOutButton)els.previewZoomOutButton.onclick=function(){setPreviewZoom(previewFit?0.9:previewZoom-.15)};
  if(els.previewZoomInButton)els.previewZoomInButton.onclick=function(){setPreviewZoom(previewFit?1.1:previewZoom+.15)};
  if(els.previewZoomLabel)els.previewZoomLabel.onclick=function(){setPreviewZoom(1)};
  if(els.previewFitButton)els.previewFitButton.onclick=function(){previewFit=true;applyPreviewZoom()};
  setNavigatorTab("outline");
  updatePreviewPageIndicator(1);

  els.editModeButton.onclick=function(){setMode(false)};els.previewModeButton.onclick=function(){setMode(true)};
  window.EverflowEditor={
    snapshot:snapshot,
    insertQuestions:function(items){
      mutateState(function(){
        items.forEach(function(q,i){
          var nq=normalizeQuestion(q,state.questions.length+i);
          nq.id="map-"+Date.now().toString(36)+"-"+i;
          state.questions.push(nq);
        });
        selectedId=state.questions[state.questions.length-1]?.id||selectedId;
      },"已从题目图谱加入 "+items.length+" 道题");
    },
    showSolutions:function(a,b){
      answerMode.answers=!!a;answerMode.explanations=!!b;
      save(false);renderPaper();
    },
    reload:function(){location.reload()}
  };
  // Download: locally rasterize exactly the validated preview pages into a PDF.
  // Print: separately invoke the system print dialog using the same physical preview DOM.
  els.printButton.onclick=downloadPdf;if(els.browserPrintButton)els.browserPrintButton.onclick=browserPrint;if(els.mobileDownloadButton)els.mobileDownloadButton.onclick=downloadPdf;els.saveProjectButton.onclick=exportProject;
  els.undoButton.onclick=undo;els.redoButton.onclick=redo;
  els.addQuestionButton.onclick=function(){
    var current=state.questions.find(function(q){return q.id===selectedId});
    mutateState(function(){var nq=newQuestion(current?current.section:"");var pos=current?state.questions.indexOf(current)+1:state.questions.length;state.questions.splice(pos,0,nq);selectedId=nq.id},"已添加题目");
  };
  els.sectionManageButton.onclick=function(){els.sectionPanel.hidden=!els.sectionPanel.hidden;renderSectionManager()};
  els.addSectionButton.onclick=function(){
    var name=cleanText(prompt("新建大题名称","一、选择题")||"");if(!name)return;
    if(uniqueSections().includes(name)){toast("这个大题已经存在");return}
    mutateState(function(){var nq=newQuestion(name);state.questions.push(nq);selectedId=nq.id},"已新建大题并添加空题");
  };
  els.batchGapApplyButton.onclick=function(){
    var value=Math.max(0,Math.min(100,Number(els.batchGapInput.value)||0));
    mutateState(function(){state.questions.forEach(function(q){if(selectedIds.has(q.id))q.gap=value})},"已批量设置题后留白");
  };
  els.batchGapResetButton.onclick=function(){
    mutateState(function(){state.questions.forEach(function(q){if(selectedIds.has(q.id))q.gap=0})},"已恢复模板默认留白");
  };
  els.batchMoveSectionButton.onclick=function(){
    var name=els.batchSectionSelect.value;if(!name){toast("先选择目标大题");return}
    mutateState(function(){state.questions.forEach(function(q){if(selectedIds.has(q.id)){q.section=name;assignDefaultOptions(q)}})},"已移动到 "+name);
  };
  els.batchClearButton.onclick=function(){selectedIds.clear();renderOrder();updateBatchBar()};
  els.titleInput.oninput=function(){state.title=els.titleInput.value;save();els.paperName.textContent=state.title;renderPaper()};
  els.coverTitleInput.oninput=function(){state.coverTitle=els.coverTitleInput.value;save();renderPaper()};
  els.headerInput.oninput=function(){state.header=els.headerInput.value;save();renderPaper()};
  function applyVisualConfig(){
    var previous=state.testVisualConfig||{};
    state.testVisualConfig={
      fontPt:Math.max(9,Math.min(12,Number(els.testFontPt.value)||modeInfo().fontPt)),
      gapPx:Math.max(0,Math.min(25,Number(els.testGapMm.value)||0))*96/25.4,
      withCover:els.formalCoverToggle.checked,
    };
    save();renderPaper();
  }
  els.testFontPt.onchange=applyVisualConfig;
  els.testGapMm.onchange=applyVisualConfig;
  els.formalCoverToggle.onchange=applyVisualConfig;
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
  var resizeRaf=0;
  window.addEventListener("resize",function(){
    cancelAnimationFrame(resizeRaf);
    resizeRaf=requestAnimationFrame(function(){updatePages();syncViewportMode();applyPreviewZoom();if(window.matchMedia("(min-width:1180px)").matches)closeNavigatorDrawer()});
  });
  if(window.visualViewport){
    window.visualViewport.addEventListener("resize",function(){
      cancelAnimationFrame(resizeRaf);
      resizeRaf=requestAnimationFrame(updatePages);
    });
  }
  undoStack.push(snapshot());render();
  syncViewportMode();
  applyPreviewZoom();
  els.pdfStatus.textContent=window.matchMedia("(min-width:768px)").matches
    ?"正在准备 ExamA4 浏览器分页预览…"
    :"手机编辑模式：切到“预览”查看 ExamA4 浏览器分页。";
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();

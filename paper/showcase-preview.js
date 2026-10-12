/* Homepage sample: rendered through the same Book layout engine and Mode
 * registry as /paper/editor/. No new paper formats, adornments, fake headers,
 * lines or manual option spacing are defined here.
 */
(function(){
"use strict";
var host=document.getElementById("typstPreview");
var status=document.getElementById("previewStatus");
var requested=new URLSearchParams(location.search).get("mode");
var mode=requested==="cover"?"cover":requested==="padl"?"padl":"compact";
var cfg=window.EverflowTemplateModes.mode("book",mode==="cover"?"compact":mode);
var sampleQuestions=mode==="padl"?[
 {id:"pad-1",sectionHeading:"1. 解答题",number:1,
  content:"设函数 $f(x)=x^2+2x$，求 $f'(x)$ 并计算 $f'(1)$。",
  options:[],showOptions:false,gapMm:0}
]:[
 {id:"compact-1",sectionHeading:"1. 选择题",number:1,
  content:"设函数 $f(x)=x^2+2x$，则 $f'(1)$ 等于（　）。",
  options:["$2$","$3$","$4$","$5$"],showOptions:true,gapMm:window.EverflowTemplateModes.questionGapMm("book","compact")},
 {id:"compact-2",sectionHeading:"",number:2,
  content:"求极限 $\\lim_{x\\to0}\\frac{\\sin 3x}{x}$ 的值。",
  options:["$0$","$1$","$3$","不存在"],showOptions:true,gapMm:window.EverflowTemplateModes.questionGapMm("book","compact")},
 {id:"compact-3",sectionHeading:"",number:3,
  content:"设函数 $f(x)=\\ln(1+x^2)$，则 $f'(x)$ 等于（　）。",
  options:["$\\frac{2x}{1+x^2}$","$\\frac{1}{1+x^2}$","$2x$","$\\frac{x}{1+x^2}$"],showOptions:true,gapMm:window.EverflowTemplateModes.questionGapMm("book","compact")},
 {id:"compact-4",sectionHeading:"",number:4,
  content:"已知矩阵 $A=\\begin{bmatrix}1&2\\\\3&4\\end{bmatrix}$，则 $\\det(A)$ 等于（　）。",
  options:["$-2$","$2$","$4$","$-4$"],showOptions:true,gapMm:window.EverflowTemplateModes.questionGapMm("book","compact")},
 {id:"compact-5",sectionHeading:"",number:5,
  content:"求定积分 $\\int_0^1 2x\\,\\mathrm{d}x$ 的值。",
  options:["$0$","$1$","$2$","$3$"],showOptions:true,gapMm:window.EverflowTemplateModes.questionGapMm("book","compact")}
];
function node(tag,cls,value){
 var e=document.createElement(tag);
 if(cls)e.className=cls;
 if(value!==undefined)e.textContent=value;
 return e;
}
function makeItem(record){
 var article=node("article","paper-layout-item");article.dataset.questionId=record.id;
 if(record.sectionHeading)article.appendChild(node("h2","paper-section-heading",record.sectionHeading));
 var question=node("section","question");
 var line=node("div","question-line");
 line.append(node("div","question-number",record.number+"."),node("div","question-body",record.content));
 question.appendChild(line);
 if(record.showOptions&&record.options.length){
   var choices=node("div","options cols-1");
   record.options.forEach(function(choice,i){
     var option=node("div","option");
     option.append(node("span","option-label","("+String.fromCharCode(65+i)+")"),node("span","option-body",choice));
     choices.appendChild(option);
   });
   question.appendChild(choices);
 }
 article.appendChild(question);
 var blank=node("div","question-answer-space");
 blank.style.height=record.gapMm+"mm";
 article.appendChild(blank);
 return article;
}
function fitPage(){
 // Use physical millimetres in the native layout; transform AFTER layout.
 // Applying CSS zoom to paper elements can trigger Safari text inflation.
 var nativeWidth=(mode==="cover"?210:cfg.widthMm)*(96/25.4);
 var nativeHeight=(mode==="cover"?297:cfg.heightMm)*(96/25.4);
 var width=Math.max(1,host.clientWidth-2),height=Math.max(1,host.clientHeight-2);
 var scale=Math.max(.08,Math.min(1,width/nativeWidth,height/nativeHeight));
 host.style.setProperty("--showcase-scale",String(scale));
 host.style.setProperty("--browser-preview-scale","1");
}
function createMasterCover(){
 // These elements and mm coordinates are the Book cover positions defined in
 // everflow-template.txt (cover-title/signature/brand/date). No decorations.
 var cover=node("section","typst-page browser-paper-page browser-cover-page");
 cover.dataset.page="1";
 cover.style.setProperty("--paper-width","210mm");
 cover.style.setProperty("--paper-height","297mm");
 cover.append(
   node("div","browser-cover-title","彼时流年若水做题本"),
   node("div","browser-cover-signature","·彼时流年若水·"),
   node("div","browser-cover-line"),
   node("div","browser-cover-brand","Everflow·彼时流年若水"),
   node("div","browser-cover-date","> > > 更新时间："+new Date().toLocaleDateString("zh-CN"))
 );
 return cover;
}
async function init(){
 fitPage();
 if(mode==="cover"){
   // Original master uses A4 independent front matter for every Book mode.
   host.appendChild(createMasterCover());
   fitPage();status.hidden=true;
   document.documentElement.dataset.previewReady="true";
   return;
 }
 try{
   if(!window.EverflowBrowserLayout||!window.EverflowSafeMath)throw Error("模板渲染组件未就绪");
   var result=await window.EverflowBrowserLayout.render({
      host:host,records:sampleQuestions,info:cfg,template:"book",
      title:mode==="padl"?"Book · PAD 横版":"Book · A4 密集版",
      header:"",layoutVersion:"book-showcase-"+mode,
      createItem:makeItem,renderMath:function(root){window.EverflowSafeMath.render(root)}
   });
   if(!result.pageCount)throw Error("未生成试卷页面");
   fitPage();status.hidden=true;
   document.documentElement.dataset.previewReady="true";
   window.parent.postMessage({type:"everflow:showcase-ready",mode:mode,pages:result.pageCount},"*");
 }catch(e){
   console.error("Everflow showcase rendering failed",e);
   status.textContent="母版预览暂不可用，请打开正式编辑器查看";
   document.documentElement.dataset.previewReady="error";
 }
}
if(typeof ResizeObserver==="function")new ResizeObserver(fitPage).observe(host);
window.addEventListener("resize",fitPage,{passive:true});
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
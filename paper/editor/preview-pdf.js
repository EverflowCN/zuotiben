/* Everflow · Preview-PDF: direct, local, screenshot-identical pagination.
 * Every PDF page rasterizes the EXACT browser preview DOM page.
 * Does not call window.print(), Typst's independent PDF layout, or a server.
 * Font glyphs stay visually accurate; text in the raster PDF is not selectable.
 */
(function(global){
"use strict";
// Resolve dependencies relative to THIS script rather than the current page:
 // /paper/test/ and /paper/editor/ share the same export module.
var scriptBase=new URL(".",document.currentScript&&document.currentScript.src||global.location.href);
var urls={
  snapshot:new URL("vendor/html-to-image.js",scriptBase).href,
  fallback:new URL("vendor/html2canvas.min.js",scriptBase).href,
  pdf:new URL("vendor/jspdf.umd.min.js",scriptBase).href
};
var loads={};
function scriptOnce(key,test){
  if(test())return Promise.resolve();
  if(loads[key])return loads[key];
  loads[key]=new Promise(function(resolve,reject){
    var element=document.createElement("script");
    element.src=urls[key];element.async=true;element.crossOrigin="anonymous";
    element.onload=function(){
      if(test())resolve();
      else reject(new Error("PDF 组件未正确初始化："+key+"，资源地址："+urls[key]));
    };
    element.onerror=function(){
      reject(new Error("PDF 组件加载失败："+key+"，请检查资源地址是否可访问："+urls[key]));
    };
    document.head.appendChild(element);
  }).catch(function(error){delete loads[key];throw error});
  return loads[key];
}
async function libraries(){
  await scriptOnce("pdf",function(){return !!(global.jspdf&&global.jspdf.jsPDF)});
  try{await scriptOnce("snapshot",function(){return !!global.htmlToImage})}
  catch(error){await scriptOnce("fallback",function(){return typeof global.html2canvas==="function"})}
}
function sheetMm(sheet){
  var w=parseFloat(sheet.style.getPropertyValue("--paper-width"))||210;
  var h=parseFloat(sheet.style.getPropertyValue("--paper-height"))||297;
  if(!Number.isFinite(w)||!Number.isFinite(h)||w<90||h<100)throw new Error("纸张宽高无效");
  return {width:w,height:h};
}
function createExportNode(source,geom){
  // Clone only! Never modify the visible page, its zoom or its pagination.
  var staging=document.createElement("div");
  staging.className="everflow-pdf-capture";
  staging.style.cssText="position:fixed;left:-22000px;top:0;z-index:-1;pointer-events:none;overflow:visible;background:#fff";
  var node=source.cloneNode(true);
  node.classList.add("everflow-pdf-page");
  node.style.setProperty("zoom","1","important");
  node.style.setProperty("transform","none","important");
  node.style.setProperty("box-shadow","none","important");
  node.style.setProperty("border","0","important");
  node.style.setProperty("border-radius","0","important");
  node.style.setProperty("margin","0","important");
  node.style.setProperty("width",geom.width+"mm","important");
  node.style.setProperty("height",geom.height+"mm","important");
  node.style.setProperty("min-height",geom.height+"mm","important");
  node.querySelectorAll(".browser-gap-handle").forEach(function(el){el.remove()});
  staging.appendChild(node);document.body.appendChild(staging);
  return {node:node,dispose:function(){staging.remove()}};
}
async function capture(node,geom,pixelRatio){
  var w=Math.round(geom.width*96/25.4),h=Math.round(geom.height*96/25.4);
  // ForeignObject-based renderer keeps live MathML, SVG, images and webfonts.
  if(global.htmlToImage){
    try{
      var canvas=await global.htmlToImage.toCanvas(node,{
        width:w,height:h,canvasWidth:Math.round(w*pixelRatio),canvasHeight:Math.round(h*pixelRatio),
        backgroundColor:"#fff",pixelRatio:pixelRatio,cacheBust:false,skipAutoScale:true,
        filter:function(element){return !(element.classList&&element.classList.contains("browser-gap-handle"))}
      });
      if(!canvas.width||!canvas.height)throw new Error("空白画布");
      return canvas;
    }catch(error){
      if(!global.html2canvas)await scriptOnce("fallback",function(){return typeof global.html2canvas==="function"});
    }
  }
  if(!global.html2canvas)await scriptOnce("fallback",function(){return typeof global.html2canvas==="function"});
  var result=await global.html2canvas(node,{
    width:w,height:h,scale:pixelRatio,backgroundColor:"#ffffff",useCORS:true,
    logging:false,allowTaint:false,windowWidth:Math.max(w,global.innerWidth||w),
    onclone:function(clone){
      var p=clone.querySelector(".everflow-pdf-page");
      if(p){p.style.zoom="1";p.style.transform="none"}
    }
  });
  if(!result.width||!result.height)throw new Error("无法渲染 PDF 截图");
  return result;
}
async function exportPreview(options){
  var source=options.host;
  if(!source||source.dataset.layoutReady!=="true")throw new Error("预览尚未成功分页，禁止下载");
  var pages=Array.from(source.querySelectorAll(":scope > section.browser-paper-page, :scope > article.sheet"));
  if(!pages.length)throw new Error("没有可导出的纸张");
  if(pages.length>500)throw new Error("页数超过浏览器本地导出限制，请拆分工程");
  await libraries();
  var PDF=global.jspdf.jsPDF,pdf=null;
  var memory=Number(navigator.deviceMemory)||0;
  var ratio=(memory>0&&memory<=4)?1.35:1.8;
  for(var i=0;i<pages.length;i++){
    if(options.isStale&&options.isStale())throw new Error("试卷已发生修改，请重新下载");
    if(options.onProgress)options.onProgress(i+1,pages.length);
    var dims=sheetMm(pages[i]);
    var copy=createExportNode(pages[i],dims);
    try{
      if(document.fonts&&document.fonts.ready)await document.fonts.ready;
      var canvas=await capture(copy.node,dims,ratio);
      var image=canvas.toDataURL("image/jpeg",.985);
      if(image.length<2000)throw new Error("纸张截图异常");
      var orient=dims.width>dims.height?"landscape":"portrait";
      if(!pdf)pdf=new PDF({orientation:orient,unit:"mm",format:[dims.width,dims.height],compress:true});
      else pdf.addPage([dims.width,dims.height],orient);
      pdf.addImage(image,"JPEG",0,0,dims.width,dims.height,undefined,"FAST");
      // Release a full page's raster memory before moving to the next page.
      canvas.width=1;canvas.height=1;
    }finally{copy.dispose()}
  }
  if(options.isStale&&options.isStale())throw new Error("内容在导出期间发生改变，请重新生成");
  var blob=pdf.output("blob");
  if(blob.size<1000)throw new Error("PDF 输出异常");
  return blob;
}
global.EverflowPreviewPdf={exportPreview:exportPreview};
})(window);

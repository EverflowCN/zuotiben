/* Everflow PDF-backed vector preview.
 * The preview canvases are painted directly from the exact PDF Blob
 * that "Download PDF" saves. The PDF itself remains vector/searchable.
 * UI zoom never triggers a new Typst layout.
 */
(function(global){
"use strict";
var base=new URL(".",document.currentScript.src);
var pdfjsTask=null,previous=null,renderSerial=0;
function loadPdfJs(){
  if(!pdfjsTask){
    pdfjsTask=import(new URL("./vendor/pdf.mjs",base).href).then(function(lib){
      lib.GlobalWorkerOptions.workerSrc=new URL("./vendor/pdf.worker.mjs",base).href;
      return lib;
    }).catch(function(err){pdfjsTask=null;throw err});
  }
  return pdfjsTask;
}
async function render(options){
  var id=++renderSerial,container=options.host,blob=options.blob,info=options.info;
  if(previous){
    previous.observer&&previous.observer.disconnect();
    previous.doc&&previous.doc.destroy().catch(function(){});
    previous=null;
  }
  if(!(blob instanceof Blob)||blob.type!=="application/pdf"||blob.size<1000)throw new Error("编译结果不是有效 PDF");
  var pdfjs=await loadPdfJs();
  var job=pdfjs.getDocument({
    data:new Uint8Array(await blob.arrayBuffer()),
    useSystemFonts:false,
    isEvalSupported:false
  });
  var doc=await job.promise;
  if(id!==renderSerial){await doc.destroy();throw new DOMException("已取消旧预览","AbortError")}
  if(doc.numPages<1){await doc.destroy();throw new Error("PDF 没有任何纸张")}
  var current={doc:doc,observer:null,running:new Set(),rendered:new Set(),serial:id};
  previous=current;
  var width=Number(info.widthMm),height=Number(info.heightMm),frag=document.createDocumentFragment();
  if(!(width>90&&height>90))throw new Error("纸张尺寸无效");
  for(var i=1;i<=doc.numPages;i++){
    var sheet=document.createElement("section");
    sheet.className="typst-page browser-paper-page everflow-vector-page";
    sheet.dataset.page=String(i);
    sheet.dataset.layoutVersion=String(options.revision);
    sheet.style.setProperty("--paper-width",width+"mm");
    sheet.style.setProperty("--paper-height",height+"mm");
    sheet.setAttribute("aria-label","PDF 第 "+i+" 页");
    var canvas=document.createElement("canvas");
    canvas.className="everflow-vector-canvas";
    canvas.setAttribute("aria-hidden","true");
    sheet.appendChild(canvas);frag.appendChild(sheet);
  }
  container.replaceChildren(frag);
  var scale=96/72,renderScale=Math.min(2.25,Math.max(1,global.devicePixelRatio||1));
  var pages=Array.from(container.querySelectorAll(":scope > section.everflow-vector-page"));
  async function paint(n){
    if(current.serial!==renderSerial||current.running.has(n)||current.rendered.has(n))return;
    current.running.add(n);
    try{
      var page=await doc.getPage(n);
      if(current.serial!==renderSerial)return;
      var viewport=page.getViewport({scale:scale});
      var canvas=pages[n-1].querySelector("canvas"),context=canvas.getContext("2d",{alpha:false});
      canvas.width=Math.max(1,Math.round(viewport.width*renderScale));
      canvas.height=Math.max(1,Math.round(viewport.height*renderScale));
      canvas.style.width="100%";canvas.style.height="100%";
      context.setTransform(renderScale,0,0,renderScale,0,0);
      await page.render({canvasContext:context,viewport:viewport,intent:"display",background:"#ffffff"}).promise;
      if(current.serial!==renderSerial)return;
      current.rendered.add(n);
      pages[n-1].dataset.painted="true";
    }catch(err){
      if(current.serial===renderSerial)pages[n-1].dataset.error=String(err.message||err);
      console.error("Everflow vector page render:",err);
    }finally{
      current.running.delete(n);
    }
  }
  // Paint visible and nearby pages first; other pages are painted on scroll.
  if("IntersectionObserver" in global){
    current.observer=new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting)paint(Number(entry.target.dataset.page));
      });
    },{root:container,rootMargin:"900px 0px 900px 0px",threshold:0});
    pages.forEach(p=>current.observer.observe(p));
  }
  await paint(1);
  if(current.serial!==renderSerial)throw new DOMException("预览已过期","AbortError");
  // If the browser has no IntersectionObserver, draw incrementally to avoid OOM.
  if(!current.observer){
    for(var j=2;j<=Math.min(3,doc.numPages);j++)paint(j);
  }
  return {status:"ready",pageCount:doc.numPages,scales:{},engine:"pdf-backed-typst"};
}
global.EverflowVectorPreview={render:render};
})(window);

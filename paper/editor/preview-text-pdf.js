/* Native PDF text at the browser preview's measured glyph positions.
 * No second typesetter and no repagination. Complex math/art remains raster.
 */
(function(global){
'use strict';
var base=new URL('.',document.currentScript.src),fontBase=new URL('../assets/vendor/typst/fonts/',base);
var loading=null,bytesCache=new Map();
function loadScript(file,test){
 if(test())return Promise.resolve();
 return new Promise(function(resolve,reject){var s=document.createElement('script');s.src=new URL('vendor/'+file,base).href;s.onload=function(){test()?resolve():reject(new Error('文字 PDF 组件初始化失败'))};s.onerror=function(){reject(new Error('文字 PDF 组件加载失败'))};document.head.append(s)});
}
function libraries(){
 if(!loading)loading=Promise.all([loadScript('pdf-lib.min.js',function(){return !!global.PDFLib}),loadScript('fontkit.umd.min.js',function(){return !!global.fontkit}),global.EverflowPreviewPdf.loadLibraries()]).catch(function(e){loading=null;throw e});
 return loading;
}
async function fontData(name){
 if(!bytesCache.has(name))bytesCache.set(name,fetch(new URL(name+'.otf',fontBase)).then(function(r){if(!r.ok)throw new Error('字体加载失败：'+name);return r.arrayBuffer()}).then(function(b){return new Uint8Array(b)}).catch(function(e){bytesCache.delete(name);throw e}));
 return bytesCache.get(name);
}
function fontName(style,char){
 var family=style.fontFamily,bold=Number(style.fontWeight)>=600;
 if(family.includes('Everflow Kai'))return 'FandolKai-Regular';
 if(family.includes('Everflow Hei'))return 'FandolHei-'+(bold?'Bold':'Regular');
 if(family.includes('Everflow Termes')&&char.codePointAt(0)<256)return 'TeXGyreTermesX-'+(style.fontStyle==='italic'?'Italic':bold?'Bold':'Regular');
 return 'FandolSong-'+(bold?'Bold':'Regular');
}
function color(style){var m=style.color.match(/[\d.]+/g)||[0,0,0];return global.PDFLib.rgb(Number(m[0])/255,Number(m[1])/255,Number(m[2])/255)}
function textNodes(node){
 var walker=document.createTreeWalker(node,NodeFilter.SHOW_TEXT),nodes=[],n;
 while((n=walker.nextNode())){
  if(!n.textContent.trim()||n.parentElement.closest('math,svg,canvas,button,.browser-gap-handle,.math-safe-rendered'))continue;
  if(getComputedStyle(n.parentElement).visibility==='hidden')continue;
  nodes.push(n);
 }
 return nodes;
}
async function exportPreview(options){
 var host=options.host,preview=global.EverflowPreviewPdf;
 if(!host||host.dataset.layoutReady!=='true')throw new Error('预览尚未完成分页');
 var pages=Array.from(host.querySelectorAll(':scope > section.browser-paper-page,:scope > article.sheet'));
 if(!pages.length)throw new Error('没有可导出的预览页面');
 await libraries();await document.fonts.ready;
 var pdf=await global.PDFLib.PDFDocument.create();pdf.registerFontkit(global.fontkit);
 var fonts=new Map();
 async function getFont(name){
  if(!fonts.has(name)){var data=await fontData(name);fonts.set(name,{pdf:await pdf.embedFont(data,{subset:true}),face:global.fontkit.create(data)})}
  return fonts.get(name);
 }
 for(var index=0;index<pages.length;index++){
  if(options.isStale&&options.isStale())throw new Error('内容发生变化，请重新下载');
  if(options.onProgress)options.onProgress(index+1,pages.length);
  var dims=preview.sheetMm(pages[index]),copy=preview.createExportNode(pages[index],dims);
  try{
   var root=copy.node.getBoundingClientRect(),records=[],nodes=textNodes(copy.node);
   for(var n of nodes){
    var style=getComputedStyle(n.parentElement),chars=Array.from(n.textContent),offset=0,entries=[],supported=true;
    var size=parseFloat(style.fontSize),opacity=1;
    for(var ancestor=n.parentElement;ancestor&&ancestor!==copy.node.parentElement;ancestor=ancestor.parentElement)opacity*=Number(getComputedStyle(ancestor).opacity);
    for(var char of chars){
     var start=offset;offset+=char.length;if(/\s/.test(char))continue;
     var name=fontName(style,char),font=await getFont(name);
     if(!font.face.hasGlyphForCodePoint(char.codePointAt(0))){supported=false;break}
     var range=document.createRange();range.setStart(n,start);range.setEnd(n,offset);
     var rect=range.getBoundingClientRect();if(!rect.width||!rect.height)continue;
     // Range bounds are the em box. Use the same embedded font's ascent/descent,
     // rather than guessing a baseline from font size or line-height.
     var ascent=font.face.ascent/font.face.unitsPerEm*size,descent=-font.face.descent/font.face.unitsPerEm*size;
     var baseline=rect.top+(rect.height-ascent-descent)/2+ascent;
     entries.push({text:char,x:(rect.left-root.left)*.75,y:(root.height-(baseline-root.top))*.75,size:size*.75,font:font.pdf,color:color(style),opacity:opacity});
    }
    if(supported){records.push.apply(records,entries);var hidden=document.createElement('span');hidden.style.opacity='0';n.parentNode.insertBefore(hidden,n);hidden.append(n)}
   }
   var page=pdf.addPage([dims.width*72/25.4,dims.height*72/25.4]);
   // The graphics layer has no normal text; it preserves math, QR codes,
   // pictures, rules and watermark positions without another layout pass.
   var canvas=await preview.capture(copy.node,dims,1.8);
   var art=await pdf.embedPng(canvas.toDataURL('image/png'));
   page.drawImage(art,{x:0,y:0,width:page.getWidth(),height:page.getHeight()});canvas.width=1;canvas.height=1;
   for(var record of records)page.drawText(record.text,record);
  }finally{copy.dispose()}
  await new Promise(function(resolve){setTimeout(resolve,0)});
 }
 if(options.isStale&&options.isStale())throw new Error('内容发生变化，请重新下载');
 return new Blob([await pdf.save()],{type:'application/pdf'});
}
global.EverflowPreviewTextPdf={exportPreview:exportPreview};
})(window);

(function(global){
"use strict";

function sanitize(name,ext){
  var safe=String(name||"Everflow").replace(/[\\/:*?"<>|]+/g,"-").replace(/\s+/g," ").trim();
  if(!safe)safe="Everflow";
  if(ext&&!safe.toLowerCase().endsWith(ext.toLowerCase()))safe+=ext;
  return safe;
}
function supportsDownload(){
  var a=document.createElement("a");
  return "download" in a;
}
async function saveWithPicker(blob,fileName,mime){
  if(typeof global.showSaveFilePicker!=="function"||!global.isSecureContext)return false;
  try{
    var handle=await global.showSaveFilePicker({
      suggestedName:fileName,
      types:[{description:mime==="application/pdf"?"PDF 文档":"Everflow 项目",accept:{[mime]:[fileName.slice(fileName.lastIndexOf("."))]}}]
    });
    var writable=await handle.createWritable();
    await writable.write(blob);await writable.close();return true;
  }catch(err){
    if(err&&err.name==="AbortError")throw err;
    return false;
  }
}
async function shareFile(blob,fileName,mime){
  if(typeof File!=="function"||!navigator.share||!navigator.canShare)return false;
  try{
    var file=new File([blob],fileName,{type:mime});
    if(!navigator.canShare({files:[file]}))return false;
    await navigator.share({files:[file],title:fileName});
    return true;
  }catch(err){
    if(err&&err.name==="AbortError")throw err;
    return false;
  }
}
function anchorDownload(blob,fileName){
  if(!supportsDownload())return false;
  var url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download=fileName;a.rel="noopener";a.style.display="none";
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(function(){URL.revokeObjectURL(url)},30000);
  return true;
}
function openFallback(blob){
  var url=URL.createObjectURL(blob);
  var win=global.open(url,"_blank","noopener");
  setTimeout(function(){URL.revokeObjectURL(url)},120000);
  return !!win;
}
async function saveBlob(blob,opts){
  opts=opts||{};
  var mime=opts.mime||blob.type||"application/octet-stream";
  var fileName=sanitize(opts.fileName||"Everflow",opts.extension||"");
  if(opts.preferNative!==false){
    try{if(await saveWithPicker(blob,fileName,mime))return {method:"picker",fileName:fileName}}catch(err){if(err&&err.name==="AbortError")return {method:"cancelled",fileName:fileName}}
  }
  if(anchorDownload(blob,fileName))return {method:"download",fileName:fileName};
  try{if(await shareFile(blob,fileName,mime))return {method:"share",fileName:fileName}}catch(err){if(err&&err.name==="AbortError")return {method:"cancelled",fileName:fileName}}
  if(openFallback(blob))return {method:"open",fileName:fileName};
  throw new Error("当前浏览器阻止了文件保存，请在系统浏览器中打开后重试");
}

global.EverflowSaveManager={saveBlob:saveBlob,sanitize:sanitize};
})(window);

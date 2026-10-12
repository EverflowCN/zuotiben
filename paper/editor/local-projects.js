/* Everflow local project archive, no network sync.
 * IndexedDB stores multiple papers and revision history inside ONE local workspace.
 * The legacy active paper stays in localStorage for backward compatibility.
 */
(function(global){
"use strict";
var DB="everflow-paper-local-v1",CURRENT="zuotiben-local-paper-v1",ACTIVE="everflow-active-paper-id-v1";
var pending=Promise.resolve(),database=null,backend="indexeddb",memory=new Map();
function uid(){return "ep-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,9)}
function clone(x){return JSON.parse(JSON.stringify(x))}
function open(){
 if(database)return database;
 database=new Promise(function(resolve){
   if(!global.indexedDB){backend="memory";resolve(null);return}
   try{
     var request=indexedDB.open(DB,1);
     request.onupgradeneeded=function(){
       var db=request.result;
       if(!db.objectStoreNames.contains("papers"))db.createObjectStore("papers",{keyPath:"id"});
       if(!db.objectStoreNames.contains("history"))db.createObjectStore("history",{keyPath:"key"});
     };
     request.onsuccess=function(){resolve(request.result)};
     request.onerror=function(){backend="memory";resolve(null)};
     request.onblocked=function(){backend="memory";resolve(null)};
   }catch(error){backend="memory";resolve(null)}
 });
 return database;
}
async function all(store){
 var db=await open();if(!db)return [...memory.values()].filter(v=>v._store===store).map(clone);
 return new Promise(function(resolve,reject){
   var tx=db.transaction(store,"readonly"),r=tx.objectStore(store).getAll();
   r.onsuccess=function(){resolve(r.result||[])};r.onerror=function(){reject(r.error)};
 });
}
async function put(store,record){
 var db=await open();if(!db){memory.set(store+":"+record[store==="papers"?"id":"key"],Object.assign({_store:store},clone(record)));return}
 return new Promise(function(resolve,reject){
   var tx=db.transaction(store,"readwrite");tx.objectStore(store).put(record);
   tx.oncomplete=function(){resolve(record)};tx.onerror=function(){reject(tx.error)};
 });
}
async function get(store,key){
 var db=await open();if(!db)return clone(memory.get(store+":"+key)||null);
 return new Promise(function(resolve,reject){
  var tx=db.transaction(store,"readonly"),r=tx.objectStore(store).get(key);
  r.onsuccess=function(){resolve(r.result||null)};r.onerror=function(){reject(r.error)};
 });
}
async function del(store,key){
 var db=await open();if(!db){memory.delete(store+":"+key);return}
 return new Promise(function(resolve,reject){
  var tx=db.transaction(store,"readwrite");tx.objectStore(store).delete(key);
  tx.oncomplete=function(){resolve()};tx.onerror=function(){reject(tx.error)};
 });
}
function activeId(){try{return localStorage.getItem(ACTIVE)||""}catch(e){return ""}}
function setActive(id){localStorage.setItem(ACTIVE,id)}
async function list(){
 var out=(await all("papers")).sort((a,b)=>String(b.modified||"").localeCompare(String(a.modified||"")));
 return out.map(p=>({id:p.id,title:p.title,sourceName:p.sourceName,count:p.data?.questions?.length||0,modified:p.modified,created:p.created}));
}
function serialize(data){
 var o=clone(data||{}),now=new Date().toISOString();
 o.title=o.title||"未命名试卷";o.coverTitle=o.coverTitle||o.title;
 if(!Array.isArray(o.questions))o.questions=[];
 o.savedAt=now;return o;
}
async function savePaper(data,opts){
 opts=opts||{};var id=opts.id||activeId()||uid(),now=new Date().toISOString();
 var existing=await get("papers",id),record={
  id:id,title:data.title||"未命名试卷",sourceName:data.sourceName||"本地草稿",
  created:existing?.created||now,modified:now,data:serialize(data)
 };
 await put("papers",record);
 if(opts.checkpoint!==false){
  var hist=(await all("history")).filter(x=>x.paperId===id).sort((a,b)=>String(b.at).localeCompare(String(a.at)));
  var current=JSON.stringify(record.data);
  if(!hist.length||JSON.stringify(hist[0].data)!==current){
   await put("history",{key:id+":"+now+":"+Math.random().toString(36).slice(2,5),paperId:id,at:now,data:record.data,label:opts.label||"自动保存"});
  }
  for(const old of hist.slice(19))await del("history",old.key);
 }
 if(opts.activate!==false)setActive(id);
 return record;
}
async function ensureActive(data){
 var id=activeId();
 if(!id){var r=await savePaper(data,{checkpoint:true});return r}
 var match=await get("papers",id);
 if(!match)return savePaper(data,{id,checkpoint:true});
 // External import replaced legacy active draft. Preserve the previous paper and create another.
 var importedSignature=JSON.stringify((data.questions||[]).map(q=>q.id||q.localId).slice(0,5))+":"+String(data.title||"");
 var priorSignature=JSON.stringify((match.data.questions||[]).map(q=>q.id||q.localId).slice(0,5))+":"+String(match.title||"");
 if(importedSignature!==priorSignature)return savePaper(data,{id:uid(),checkpoint:true,label:"导入试卷"});
 return match;
}
async function openPaper(id){
 var record=await get("papers",id);if(!record)throw new Error("未找到本机保存的试卷");
 // Store active draft before switching by the caller. Keep the original .everflow schema.
 localStorage.setItem(CURRENT,JSON.stringify(record.data));
 setActive(record.id);
 return record;
}
async function newPaper(title,questions){
 var draft={version:2,type:"everflow-local-paper",template:"exam",layout:"a4",title:title||"新试卷",coverTitle:title||"新试卷",sourceName:"本机新增",questions:questions||[{id:uid(),content:"",options:[],section:"一、选择题",type:"选择题",showOptions:true}],originalIds:[]};
 draft.originalIds=draft.questions.map(x=>x.id);
 var rec=await savePaper(draft,{id:uid(),checkpoint:true,label:"新建试卷"});
 localStorage.setItem(CURRENT,JSON.stringify(rec.data));return rec;
}
async function history(id){return (await all("history")).filter(x=>x.paperId===id).sort((a,b)=>String(b.at).localeCompare(String(a.at))).map(x=>({key:x.key,at:x.at,label:x.label,questions:x.data.questions?.length||0}))}
async function restore(key){
 var rec=await get("history",key);if(!rec)throw new Error("找不到这个历史版本");
 var saved=await savePaper(rec.data,{id:rec.paperId,label:"恢复历史版本"});
 localStorage.setItem(CURRENT,JSON.stringify(saved.data));
 return saved;
}
async function removePaper(id){await del("papers",id);for(const item of (await all("history")).filter(x=>x.paperId===id))await del("history",item.key);if(activeId()===id)localStorage.removeItem(ACTIVE)}
function queuedSave(data,opts){
 var value=clone(data);
 pending=pending.then(()=>savePaper(value,opts)).catch(err=>console.error("Everflow local history save failed",err));
 return pending;
}
global.EverflowArchive={open,list,getPaper:id=>get("papers",id),savePaper,queuedSave,activeId,setActive,ensureActive,openPaper,newPaper,history,restore,removePaper,backend:()=>backend};
})(window);
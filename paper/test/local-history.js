(function(root){
"use strict";
const NAME="everflow-template-test-v2",MAX=30;let dbPromise;
function open(){
 if(dbPromise)return dbPromise;
 dbPromise=new Promise((resolve,reject)=>{
  if(!root.indexedDB)return reject(new Error("当前浏览器不支持 IndexedDB"));
  const request=root.indexedDB.open(NAME,1);
  request.onupgradeneeded=()=>{
   const db=request.result;
   if(!db.objectStoreNames.contains("papers"))db.createObjectStore("papers",{keyPath:"key"});
   if(!db.objectStoreNames.contains("packs"))db.createObjectStore("packs",{keyPath:"key"});
  };
  request.onsuccess=()=>resolve(request.result);
  request.onerror=()=>reject(request.error||new Error("本机历史数据库无法使用"));
 });return dbPromise;
}
async function exec(store,mode,fn){
 const db=await open();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction(store,mode),table=tx.objectStore(store);
  const request=fn(table);
  let output;
  if(request){request.onsuccess=()=>output=request.result;request.onerror=()=>reject(request.error)}
  tx.oncomplete=()=>resolve(output);
  tx.onerror=()=>reject(tx.error||new Error("历史存储失败"));
  tx.onabort=()=>reject(tx.error||new Error("历史存储被取消"));
 });
}
function safe(data){return JSON.parse(JSON.stringify(data))}
function id(){return Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,7)}
async function list(){
 const papers=await exec("papers","readonly",s=>s.getAll());
 return papers.sort((a,b)=>String(b.savedAt).localeCompare(String(a.savedAt)));
}
async function save(entry,{version=false}={}){
 const now=new Date().toISOString(),base=String(entry.meta?.id||entry.currentId||"test");
 const papers=await list();
 const identity=base+":"+String(entry.source||"demo");
 const matching=papers.filter(x=>x.identity===identity);
 const existing=matching[0];
 const key=version||!existing?id():existing.key;
 const record={key,identity,source:entry.source||"demo",savedAt:now,
  meta:safe(entry.meta||{}),raw:safe(entry.raw||{}),config:safe(entry.config||{}),
  questionCount:(entry.raw?.questions||[]).length,packKey:entry.packKey||existing?.packKey||null,
  isVersion:!!version};
 await exec("papers","readwrite",s=>s.put(record));
 const updated=await list();
 for(const excess of updated.slice(MAX))await exec("papers","readwrite",s=>s.delete(excess.key));
 try{localStorage.setItem("everflow-template-test-current",JSON.stringify({key,identity,savedAt:now}))}catch(e){}
 return record;
}
function get(key){return exec("papers","readonly",s=>s.get(key))}
async function storePack(key,file){
 if(!file)throw new Error("未提供 ZIP 文件");
 return exec("packs","readwrite",s=>s.put({key,data:file,at:Date.now(),name:file.name||"papers.zip"}));
}
function getPack(key){return exec("packs","readonly",s=>s.get(key))}
function remove(key){return exec("papers","readwrite",s=>s.delete(key))}
root.EverflowTestArchive={open,list,save,get,remove,storePack,getPack};
})(window);
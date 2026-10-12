#!/usr/bin/env python3
# Extract only publicly accessible Mathematics II papers from bbkaoyan.cn.
# No account cookies and no access-control bypass.
import csv
import json
import os
import re
import sys
import time
import urllib.request
import urllib.parse
from pathlib import Path
from collections import Counter

API="https://bbkaoyan.cn/api"
BASE="https://bbkaoyan.cn"
ROOT=Path("bbkaoyan_math2")
HEADERS={"User-Agent":"Mozilla/5.0 (compatible; personal-study-export/1.0)","Accept":"application/json","Referer":BASE+"/"}
LAST=0

def fetch(url, binary=False):
    global LAST
    for attempt in range(3):
        pause=1.05-(time.monotonic()-LAST)
        if pause>0: time.sleep(pause)
        LAST=time.monotonic()
        try:
            req=urllib.request.Request(url,headers=HEADERS)
            with urllib.request.urlopen(req,timeout=30) as resp:
                data=resp.read()
            if binary:return data
            return json.loads(data.decode("utf-8"))
        except Exception as err:
            print("Request failed",attempt+1,url,repr(err),flush=True)
            if attempt==2:raise
            time.sleep(2*(attempt+1))

def api(path,**params):
    url=API+path
    if params:url+="?"+urllib.parse.urlencode(params)
    return fetch(url)

def put(path,text):
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(text,encoding="utf-8")
def dump(path,value):
    put(path,json.dumps(value,ensure_ascii=False,indent=2)+"\n")
def safe(value):
    return re.sub(r'[\\/:*?"<>|\x00-\x1f]','_',str(value or "未命名")).strip()[:100]

def normalize(p,payload):
    arr=[]
    for n,entry in enumerate(payload.get("questions") or [],1):
        q=entry.get("question") or entry
        if not isinstance(q,dict):continue
        opts=q.get("options") or {}
        if isinstance(opts,dict):
            opts=[str(opts[k]) for k in "ABCD" if k in opts and opts[k] is not None]
        elif isinstance(opts,list):
            opts=[str(o.get("text") or o.get("content") or "") if isinstance(o,dict) else str(o) for o in opts]
        else:opts=[]
        stem=q.get("stem") or q.get("stem_latex") or ""
        sec=re.sub(r"^\s*[一二三四五六七八九十\d]+[、.．]\s*","",str(entry.get("section_title") or "试题"))
        answer=q.get("correct_answer") or q.get("correct_answer_latex") or ""
        explanation=q.get("answer_explanation") or q.get("explanation_latex") or ""
        typ={"choice":"选择题","blank":"填空题","solution":"解答题"}.get(q.get("question_type"),"选择题" if opts else "解答题")
        rec={"id":"bb-%s-%s"%(p["id"],q.get("id") or n),"content":str(stem),"options":opts,
             "type":typ,"section":sec,"gap":0,"showOptions":bool(opts),"breakBefore":False,
             "answer":str(answer),"explanation":str(explanation),
             "bbQuestionId":q.get("id"),"bbAssets":q.get("assets") or []}
        arr.append(rec)
    title=p.get("title") or "试卷 "+str(p["id"])
    doc={"version":2,"type":"everflow-local-paper","title":title,"coverTitle":title,
        "template":"exam","layout":"a4","header":"",
        "originalIds":[r["id"] for r in arr],"questions":arr}
    return doc

def render_md(p,doc,with_answers):
    out=["# "+doc["title"],"","- 来源："+BASE+"/papers/"+str(p["id"]),"- 科目：数学二",
         "- 年份："+str(p.get("year") or "未标注"),"- 类型："+str(p.get("kind") or ""),""]
    current=""
    for i,q in enumerate(doc["questions"],1):
        if q["section"]!=current:
            current=q["section"]
            out+=["## "+current,""]
        out+=["### 第 "+str(i)+" 题","",q["content"],""]
        for j,opt in enumerate(q["options"]):out+=["ABCD"[j]+". "+opt]
        out.append("")
        if with_answers:
            out+=["**答案：** "+(q["answer"] or "未提供"),"",
                  "**解析：** "+(q["explanation"] or "未提供"),""]
        for asset in q["bbAssets"]:
            if isinstance(asset,dict):
                out+=["- 图片："+str(asset.get("url") or asset.get("storage_path") or "" )]
        if q["bbAssets"]:out.append("")
        out+=["---",""]
    return "\n".join(out)

def main():
    (ROOT/"raw"/"papers").mkdir(parents=True,exist_ok=True)
    items=[]
    page=1
    while True:
        obj=api("/papers",subject="math2",page=page,page_size=100)
        batch=obj.get("items") or []
        items.extend(p for p in batch if p.get("subject")=="math2")
        print("LIST",page,len(batch),"total",obj.get("total"),flush=True)
        if not batch or len(items)>=int(obj.get("total") or 0):break
        page+=1
        if page>20:raise RuntimeError("Unexpected catalogue pagination")
    items=list({str(x["id"]):x for x in items}.values())
    items.sort(key=lambda p:(int(p.get("year") or 0),str(p["id"])))
    dump(ROOT/"raw"/"papers.json",{"items":items,"total":len(items),"subject":"math2","anonymous":True})
    if not items:raise RuntimeError("Site returned zero publicly accessible mathematics-II papers")
    rows=[]
    failed=[]
    total_questions=0
    total_images=0
    for idx,p in enumerate(items,1):
        pid=p["id"]
        try:
            payload=api("/papers/"+str(pid)+"/questions",include_answer="true")
            if not payload.get("questions"):raise ValueError("No questions returned")
            doc=normalize(p,payload)
            if not doc["questions"]:raise ValueError("No parseable questions")
            dump(ROOT/"raw"/"papers"/(str(pid)+".json"),payload)
            filename=safe(p.get("title"))+"__bb-"+str(pid)
            dump(ROOT/"everflow"/(filename+".everflow"),doc)
            put(ROOT/"试卷_含答案解析"/(filename+".md"),render_md(p,doc,True))
            put(ROOT/"试卷_无答案"/(filename+".md"),render_md(p,doc,False))
            total_questions+=len(doc["questions"])
            for q in doc["questions"]:
                for a in q["bbAssets"]:
                    if not isinstance(a,dict) or not a.get("url"):continue
                    assetid=a.get("id")
                    ext=os.path.splitext(str(a.get("storage_path") or ""))[1].lower() or ".png"
                    if ext not in (".png",".jpg",".jpeg",".webp",".gif",".svg"):ext=".png"
                    target=ROOT/"assets"/str(pid)/(str(q["bbQuestionId"] or q["id"])+
                            "_"+str(a.get("usage") or "asset")+"_"+str(assetid)+ext)
                    try:
                        data=fetch(urllib.parse.urljoin(BASE,str(a["url"])),binary=True)
                        target.parent.mkdir(parents=True,exist_ok=True)
                        target.write_bytes(data)
                        total_images+=1
                    except Exception as err: print("IMAGE FAILED",pid,assetid,repr(err),flush=True)
            rows.append({"id":pid,"year":p.get("year"),"kind":p.get("kind"),
                         "title":p.get("title"),"questions":len(doc["questions"]),
                         "with_answer":sum(bool(q["answer"]) for q in doc["questions"]),
                         "url":BASE+"/papers/"+str(pid)})
            print("OK",idx,"/",len(items),pid,len(doc["questions"]),flush=True)
        except Exception as err:
            failed.append({"id":pid,"title":p.get("title"),"error":str(err)})
            print("FAILED",idx,"/",len(items),pid,repr(err),flush=True)
    index=ROOT/"索引.csv"
    with index.open("w",encoding="utf-8-sig",newline="") as file:
        w=csv.DictWriter(file,fieldnames=["id","year","kind","title","questions","with_answer","url"])
        w.writeheader()
        w.writerows(rows)
    dump(ROOT/"失败清单.json",failed)
    put(ROOT/"README.txt",
      "bbkaoyan.cn 数学二公开试卷提取\n"+
      "无需登录，仅限匿名可访问资料。未包含要求数学二账号登录权限的模拟卷。\n"+
      "成功试卷："+str(len(rows))+"，题目条目："+str(total_questions)+
      "，下载图片："+str(total_images)+"，失败试卷："+str(len(failed))+"\n"+
      "目录：raw/ 为原始API数据；everflow/ 为可导入网站的JSON工程；"+
      "试卷_含答案解析/ 和 试卷_无答案/ 为Markdown；assets/ 为图片。\n"+
      "注意：当前 Everflow 网站编辑器尚不会自动显示工程中的 bbAssets 图片。\n"+
      "版权归各原作者及网站方所有，请仅用于个人学习，不要公开传播。\n")
    import shutil
    archive=shutil.make_archive("bbkaoyan_math2_公开试卷","zip",root_dir=".",base_dir=str(ROOT))
    print("DONE",len(rows),"papers",total_questions,"questions",total_images,"images",len(failed),"failed",archive,flush=True)
    if not rows:sys.exit(2)

if __name__=="__main__":
    main()

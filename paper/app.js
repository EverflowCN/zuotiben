(function(){
  "use strict";

  var STORAGE_KEY="zuotiben-local-paper-v1";
  var THEME_KEY="zuotiben-paper-theme-v1";
  var state={title:"未命名试卷",sourceName:"本地文件",questions:[],originalIds:[],loadedAt:null};
  var compileMode=false;
  var questionMoveEnabled=true;

  var els={};
  function byId(id){return document.getElementById(id)}
  function uid(){return "local-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,8)}
  function cleanText(value){return String(value==null?"":value).replace(/\r\n?/g,"\n").trim()}
  function clip(value,n){var s=String(value||"").replace(/\s+/g," ").trim();return s.length>n?s.slice(0,n-1)+"…":s}
  function toast(message){
    els.toast.textContent=message;
    els.toast.classList.add("show");
    clearTimeout(toast._timer);
    toast._timer=setTimeout(function(){els.toast.classList.remove("show")},2200);
  }
  function downloadText(name,text,type){
    var blob=new Blob([text],{type:type||"text/plain;charset=utf-8"});
    var url=URL.createObjectURL(blob);
    var a=document.createElement("a");
    a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();
    setTimeout(function(){URL.revokeObjectURL(url)},1000);
  }
  function normalizeOption(value){
    if(value==null)return "";
    if(typeof value==="string")return cleanText(value);
    if(typeof value==="object")return cleanText(value.text||value.content||value.label||"");
    return cleanText(value);
  }
  function normalizeQuestion(raw,index){
    raw=raw||{};
    var content=cleanText(raw.content||raw.stem||raw.question||raw.text||raw.title||"");
    var options=[];
    if(Array.isArray(raw.options))options=raw.options.map(normalizeOption).filter(Boolean);
    else if(raw.options&&typeof raw.options==="object"){
      Object.keys(raw.options).sort().forEach(function(k){options.push(normalizeOption(raw.options[k]))});
    }
    return {
      id:String(raw.localId||raw.id||uid()),
      importedIndex:index,
      content:content,
      options:options,
      source:"local",
      latexEnabled:false
    };
  }

  function parseMarkdown(text,fileName){
    var lines=cleanText(text).split("\n");
    var title=(fileName||"").replace(/\.(md|markdown)$/i,"")||"本地试卷";
    var questions=[];
    var current=null;

    function finish(){
      if(!current)return;
      current.content=cleanText(current.body.join("\n"));
      delete current.body;
      if(current.content||current.options.length){
        current.importedIndex=questions.length;
        questions.push(current);
      }
      current=null;
    }

    lines.forEach(function(line){
      var titleMatch=line.match(/^#\s+(.+?)\s*$/);
      if(titleMatch&&!questions.length&&!current){title=cleanText(titleMatch[1]);return}

      var qHead=line.match(/^##\s*(?:第\s*)?(\d+)(?:\s*题)?(?:[.、．:\s-]+(.*))?$/i);
      var numbered=line.match(/^\s*(\d+)[.、．]\s+(.+)$/);
      if(qHead||(!current&&numbered)){
        finish();
        var tail=qHead?cleanText(qHead[2]||""):cleanText(numbered[2]||"");
        current={id:uid(),body:tail?[tail]:[],options:[],source:"local",latexEnabled:false};
        return;
      }
      if(!current)return;
      var option=line.match(/^\s*([A-Ha-h])[.、．:：]\s*(.+)$/);
      if(option){current.options.push(cleanText(option[2]));return}
      current.body.push(line);
    });
    finish();

    if(!questions.length){
      var blocks=cleanText(text).split(/\n{2,}/).filter(Boolean);
      blocks.forEach(function(block,index){
        questions.push(normalizeQuestion({content:block},index));
      });
    }
    return {title:title,questions:questions};
  }

  function parseJson(text,fileName){
    var data=JSON.parse(text);
    var title=(fileName||"").replace(/\.(json|everflow)$/i,"")||"本地试卷";
    var list=[];
    if(Array.isArray(data))list=data;
    else if(data&&Array.isArray(data.questions)){list=data.questions;title=cleanText(data.title||data.name||title)}
    else throw new Error("JSON 中没有 questions 数组");
    var questions=list.map(normalizeQuestion).filter(function(q){return q.content||q.options.length});
    return {title:title,questions:questions};
  }

  function parseFile(file,text){
    var lower=file.name.toLowerCase();
    if(lower.endsWith(".json")||lower.endsWith(".everflow"))return parseJson(text,file.name);
    return parseMarkdown(text,file.name);
  }

  function saveLocal(){
    if(!state.questions.length){localStorage.removeItem(STORAGE_KEY);return}
    var payload={
      version:1,
      type:"everflow-local-paper",
      title:state.title,
      sourceName:state.sourceName,
      savedAt:new Date().toISOString(),
      questions:state.questions.map(function(q){
        return {localId:q.id,content:q.content,options:q.options,source:"local",latexEnabled:false};
      }),
      originalIds:state.originalIds.slice()
    };
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(payload))}catch(e){}
  }

  function restoreLocal(){
    try{
      var raw=localStorage.getItem(STORAGE_KEY);
      if(!raw)return false;
      var data=JSON.parse(raw);
      if(!data||!Array.isArray(data.questions)||!data.questions.length)return false;
      state.title=cleanText(data.title||"本地试卷");
      state.sourceName=cleanText(data.sourceName||"浏览器本地草稿");
      state.questions=data.questions.map(normalizeQuestion);
      state.originalIds=Array.isArray(data.originalIds)&&data.originalIds.length?data.originalIds.map(String):state.questions.map(function(q){return q.id});
      state.loadedAt=data.savedAt||null;
      return true;
    }catch(e){return false}
  }

  function renderMath(root){
    try{
      var delimiters=[
        {left:"$",right:"$",display:true},
        {left:"\\[",right:"\\]",display:true},
        {left:"\\(",right:"\\)",display:false},
        {left:"$",right:"$",display:false}
      ];
      if(window.temml&&typeof window.temml.renderMathInElement==="function"){
        window.temml.renderMathInElement(root,{
          delimiters:delimiters,
          throwOnError:false,
          strict:false,
          trust:false,
          maxExpand:1000,
          maxSize:50
        });
        return;
      }
      if(typeof window.renderMathInElement==="function"){
        window.renderMathInElement(root,{delimiters:delimiters,throwOnError:false,strict:false});
      }
    }catch(e){}
  }

  function textWithBreaks(container,text){
    var parts=String(text||"").split(/\n+/);
    parts.forEach(function(part,index){
      if(!part.trim())return;
      var p=document.createElement("p");
      p.textContent=part.trim();
      container.appendChild(p);
    });
    if(!container.childNodes.length)container.textContent="（空题干）";
  }

  function renderOrder(){
    els.orderList.innerHTML="";
    state.questions.forEach(function(q,index){
      var row=document.createElement("div");
      row.className="order-item";
      row.draggable=true;
      row.dataset.index=String(index);

      var handle=document.createElement("span");
      handle.className="drag-handle";handle.textContent="⋮⋮";handle.title="拖动排序";

      var num=document.createElement("span");
      num.className="order-num";num.textContent=String(index+1);

      var copy=document.createElement("span");
      copy.className="order-copy";
      var b=document.createElement("b");b.textContent=clip(q.content,48)||"未命名题目";
      var small=document.createElement("small");small.textContent=q.options.length?("选择题 · "+q.options.length+" 个选项"):"题目";
      copy.appendChild(b);copy.appendChild(small);

      var controls=document.createElement("span");
      controls.className="order-controls";
      var up=document.createElement("button");up.type="button";up.textContent="↑";up.title="上移";up.disabled=index===0;
      var down=document.createElement("button");down.type="button";down.textContent="↓";down.title="下移";down.disabled=index===state.questions.length-1;
      up.addEventListener("click",function(){moveQuestion(index,index-1)});
      down.addEventListener("click",function(){moveQuestion(index,index+1)});
      controls.appendChild(up);controls.appendChild(down);

      row.appendChild(handle);row.appendChild(num);row.appendChild(copy);row.appendChild(controls);
      els.orderList.appendChild(row);
    });
    els.orderCount.textContent=String(state.questions.length);
  }

  function renderPaper(){
    els.paperQuestions.innerHTML="";
    els.previewTitle.textContent=state.title||"试卷";
    els.previewMeta.textContent="本地排版 · "+state.questions.length+" 题 · 仅题目页";

    if(!state.questions.length){
      var empty=document.createElement("div");
      empty.className="empty-paper";
      empty.textContent="导入题目后将在这里生成 A4 预览";
      els.paperQuestions.appendChild(empty);
      return;
    }

    state.questions.forEach(function(q,index){
      var article=document.createElement("section");
      article.className="question";
      article.dataset.index=String(index);
      article.draggable=Boolean(compileMode&&questionMoveEnabled);

      var moveTools=document.createElement("div");
      moveTools.className="question-move-tools";
      var grip=document.createElement("span");
      grip.className="move-grip";grip.textContent="⋮⋮";grip.title="拖动整道题";
      var moveUp=document.createElement("button");
      moveUp.type="button";moveUp.textContent="↑";moveUp.title="上移整道题";moveUp.disabled=index===0;
      var moveDown=document.createElement("button");
      moveDown.type="button";moveDown.textContent="↓";moveDown.title="下移整道题";moveDown.disabled=index===state.questions.length-1;
      moveUp.addEventListener("click",function(e){e.stopPropagation();moveQuestion(index,index-1)});
      moveDown.addEventListener("click",function(e){e.stopPropagation();moveQuestion(index,index+1)});
      moveTools.appendChild(grip);moveTools.appendChild(moveUp);moveTools.appendChild(moveDown);
      article.appendChild(moveTools);

      var line=document.createElement("div");
      line.className="question-line";
      var num=document.createElement("div");
      num.className="question-number";num.textContent=String(index+1)+".";
      var body=document.createElement("div");
      body.className="question-body";
      textWithBreaks(body,q.content);
      line.appendChild(num);line.appendChild(body);
      article.appendChild(line);

      if(q.options.length){
        var options=document.createElement("div");
        options.className="options";
        var maxOptionLength=q.options.reduce(function(max,opt){return Math.max(max,String(opt||"").replace(/\s+/g,"").length)},0);
        options.classList.add(maxOptionLength<=14?"cols-4":maxOptionLength<=34?"cols-2":"cols-1");
        q.options.forEach(function(opt,optIndex){
          var item=document.createElement("div");
          item.className="option";
          item.textContent=String.fromCharCode(65+optIndex)+". "+opt.replace(/^[A-Ha-h][.、．:：]\s*/,"");
          options.appendChild(item);
        });
        article.appendChild(options);
      }
      els.paperQuestions.appendChild(article);
      renderMath(article);
    });
    requestAnimationFrame(function(){syncPaperScale();updatePageEstimate()});
  }

  function updatePageEstimate(){
    if(!els.paperSheet||!els.previewPageTotal)return;
    var a4Px=1122.52;
    var pages=Math.max(1,Math.ceil(els.paperSheet.scrollHeight/a4Px));
    els.previewPageTotal.textContent=String(pages);
    els.previewPageCurrent.textContent="1";
  }

  function setQuestionMoveEnabled(enabled){
    questionMoveEnabled=Boolean(enabled);
    document.body.classList.toggle("question-move-on",questionMoveEnabled);
    if(els.compileOrderButton)els.compileOrderButton.textContent="题目移动："+(questionMoveEnabled?"开启":"关闭");
    renderPaper();
  }

  function setCompileMode(enabled){
    compileMode=Boolean(enabled);
    document.body.classList.toggle("compile-mode",compileMode);
    document.body.classList.toggle("question-move-on",compileMode&&questionMoveEnabled);
    if(els.compileBar)els.compileBar.hidden=!compileMode;
    if(els.compileModeButton){
      var label=els.compileModeButton.querySelector("span");
      if(label)label.textContent=compileMode?"退出编译模式":"进入编译模式";
    }
    renderPaper();
    requestAnimationFrame(function(){
      syncPaperScale();
      if(compileMode)window.scrollTo({top:0,behavior:"smooth"});
      else els.workspace.scrollIntoView({behavior:"smooth",block:"start"});
    });
  }

  function bindPaperDrag(){
    var dragIndex=null;
    els.paperQuestions.addEventListener("dragstart",function(e){
      if(!compileMode||!questionMoveEnabled)return;
      var row=e.target.closest(".question");
      if(!row)return;
      dragIndex=Number(row.dataset.index);
      row.classList.add("paper-dragging");
      if(e.dataTransfer){e.dataTransfer.effectAllowed="move";e.dataTransfer.setData("text/plain",String(dragIndex))}
    });
    els.paperQuestions.addEventListener("dragend",function(){
      dragIndex=null;
      els.paperQuestions.querySelectorAll(".question").forEach(function(row){row.classList.remove("paper-dragging","paper-drop-before")});
    });
    els.paperQuestions.addEventListener("dragover",function(e){
      if(!compileMode||!questionMoveEnabled)return;
      var row=e.target.closest(".question");
      if(!row)return;
      e.preventDefault();
      els.paperQuestions.querySelectorAll(".question").forEach(function(item){item.classList.remove("paper-drop-before")});
      row.classList.add("paper-drop-before");
    });
    els.paperQuestions.addEventListener("drop",function(e){
      if(!compileMode||!questionMoveEnabled||dragIndex==null)return;
      var row=e.target.closest(".question");
      if(!row)return;
      e.preventDefault();
      var target=Number(row.dataset.index);
      if(target!==dragIndex)moveQuestion(dragIndex,target);
    });
  }


  function renderAll(){
    var has=state.questions.length>0;
    els.workspace.hidden=!has;
    els.startGrid.hidden=has;
    els.paperName.textContent=state.title||"本地试卷";
    els.questionCount.textContent=String(state.questions.length);
    els.sourceName.textContent=state.sourceName||"本地文件";
    renderOrder();
    renderPaper();
    if(has)setTimeout(function(){els.workspace.scrollIntoView({behavior:"smooth",block:"start"})},30);
  }

  function moveQuestion(from,to){
    if(to<0||to>=state.questions.length||from===to)return;
    var item=state.questions.splice(from,1)[0];
    state.questions.splice(to,0,item);
    saveLocal();renderOrder();renderPaper();
  }

  function resetOrder(){
    if(!state.originalIds.length)return;
    var rank={};
    state.originalIds.forEach(function(id,index){rank[String(id)]=index});
    state.questions.sort(function(a,b){
      var ar=rank[a.id];var br=rank[b.id];
      if(ar==null)ar=999999;if(br==null)br=999999;
      return ar-br;
    });
    saveLocal();renderOrder();renderPaper();toast("已恢复导入顺序");
  }

  function bindDrag(){
    var dragIndex=null;
    els.orderList.addEventListener("dragstart",function(e){
      var row=e.target.closest(".order-item");
      if(!row)return;
      dragIndex=Number(row.dataset.index);
      row.classList.add("dragging");
      if(e.dataTransfer){e.dataTransfer.effectAllowed="move";e.dataTransfer.setData("text/plain",String(dragIndex))}
    });
    els.orderList.addEventListener("dragend",function(){
      dragIndex=null;
      els.orderList.querySelectorAll(".order-item").forEach(function(row){row.classList.remove("dragging","drop-before")});
    });
    els.orderList.addEventListener("dragover",function(e){
      var row=e.target.closest(".order-item");
      if(!row)return;
      e.preventDefault();
      els.orderList.querySelectorAll(".order-item").forEach(function(item){item.classList.remove("drop-before")});
      row.classList.add("drop-before");
    });
    els.orderList.addEventListener("drop",function(e){
      var row=e.target.closest(".order-item");
      if(!row||dragIndex==null)return;
      e.preventDefault();
      var target=Number(row.dataset.index);
      if(target!==dragIndex)moveQuestion(dragIndex,target);
    });
  }

  async function importSelectedFile(file){
    if(!file)return;
    if(file.size>8*1024*1024){toast("文件过大：当前本地导入限制为 8 MB");return}
    try{
      var text=await file.text();
      var parsed=parseFile(file,text);
      if(!parsed.questions.length)throw new Error("没有识别到题目");
      state.title=parsed.title||"本地试卷";
      state.sourceName=file.name;
      state.questions=parsed.questions;
      state.originalIds=state.questions.map(function(q){return q.id});
      state.loadedAt=new Date().toISOString();
      saveLocal();renderAll();toast("已在浏览器本地导入 "+state.questions.length+" 题");
    }catch(err){
      toast("导入失败："+(err&&err.message?err.message:"格式无法识别"));
    }finally{
      els.fileInput.value="";
    }
  }

  function exportProject(){
    if(!state.questions.length){toast("请先导入题目");return}
    var data={
      version:1,
      type:"everflow-local-paper",
      title:state.title,
      exportedAt:new Date().toISOString(),
      localOnly:true,
      latexEnabled:false,
      questions:state.questions.map(function(q){
        return {localId:q.id,content:q.content,options:q.options,source:"local",latexEnabled:false};
      })
    };
    var safe=(state.title||"everflow-paper").replace(/[\\/:*?"<>|]+/g,"-");
    downloadText(safe+".everflow",JSON.stringify(data,null,2),"application/json;charset=utf-8");
    toast("项目文件已保存到本机");
  }

  function downloadTemplate(){
    var example=[
      "# 2026 数学模拟卷",
      "",
      "## 1",
      "设函数 $f(x)=x^2$，则 $f'(x)=$",
      "",
      "A. $x$",
      "B. $2x$",
      "C. $x^2$",
      "D. $2$",
      "",
      "## 2",
      "设矩阵 $A=\\begin{bmatrix}1&2\\\\3&4\\end{bmatrix}$，求：",
      "",
      "(1) 求 $\\det A$；",
      "(2) 求 $A^{-1}$。"
    ].join("\n");
    downloadText("Everflow-本地题目导入模板.md",example,"text/markdown;charset=utf-8");
    toast("示例模板已下载");
  }

  function aiPrompt(){
    return [
      "请完整转录我接下来提供的试卷/PDF/图片内容，并严格转换为 Everflow Markdown 导入格式。",
      "",
      "必须遵守：",
      "1. 不修改题意，不总结，不润色，不自行补题；",
      "2. 按原文保留全部题目、选项、小问和符号；",
      "3. 数学公式统一使用 LaTeX：行内公式使用 $...$，独立公式使用 $$...$$；",
      "4. 每道题必须以“## 1”“## 2”这种二级标题开始；",
      "5. 选择题选项统一为“A. …”“B. …”“C. …”“D. …”；",
      "6. (1)(2)(3)、I/II/III 等层级必须保留并分行；",
      "7. 不输出答案、解析、说明、Markdown 代码围栏或任何额外文字，除非原文中本来就有；",
      "8. 遇到无法确认的字符不要猜，使用【待核对：原位置】标记；",
      "9. 输出前检查积分上下限、根号、分式、矩阵、上下标、正负号、≤/≥ 是否遗漏。",
      "",
      "格式示例：",
      "# 试卷名称",
      "",
      "## 1",
      "题干……",
      "",
      "A. 选项A",
      "B. 选项B",
      "C. 选项C",
      "D. 选项D",
      "",
      "## 2",
      "题干……",
      "",
      "(1) 小问……",
      "(2) 小问……"
    ].join("\n");
  }

  async function copyPrompt(){
    var text=aiPrompt();
    try{
      await navigator.clipboard.writeText(text);
      toast("AI 转录提示词已复制");
    }catch(e){
      var ta=document.createElement("textarea");
      ta.value=text;ta.style.position="fixed";ta.style.opacity="0";document.body.appendChild(ta);ta.select();
      document.execCommand("copy");ta.remove();toast("AI 转录提示词已复制");
    }
  }

  async function printPaper(){
    if(!state.questions.length){toast("请先导入题目");return}
    try{
      if(document.fonts&&document.fonts.ready){
        toast("正在准备模板字体…");
        await document.fonts.ready;
      }
    }catch(e){}
    renderPaper();
    await new Promise(function(resolve){requestAnimationFrame(function(){requestAnimationFrame(resolve)})});
    window.print();
  }

  function showModal(show){
    els.formatModal.hidden=!show;
    document.body.style.overflow=show?"hidden":"";
  }

  function clearPaper(){
    if(!state.questions.length)return;
    if(!window.confirm("清空当前本地试卷？已保存的 .everflow 文件不会受影响。"))return;
    state={title:"未命名试卷",sourceName:"本地文件",questions:[],originalIds:[],loadedAt:null};
    localStorage.removeItem(STORAGE_KEY);
    renderAll();window.scrollTo({top:0,behavior:"smooth"});toast("已清空本地草稿");
  }

  function syncPaperScale(){
    if(!els.paperStage||!els.paperSheet)return;
    if(window.innerWidth>760){
      els.paperSheet.style.transform="";
      els.paperSheet.style.marginBottom="";
      els.paperStage.style.minHeight="";
      els.paperStage.style.height="";
      return;
    }
    var available=Math.max(240,els.paperStage.clientWidth-24);
    var natural=793.7;
    var scale=Math.min(1,available/natural);
    els.paperSheet.style.transform="scale("+scale+")";
    var naturalHeight=els.paperSheet.scrollHeight;
    els.paperSheet.style.marginBottom=(naturalHeight*scale-naturalHeight)+"px";
    els.paperStage.style.minHeight=(naturalHeight*scale+24)+"px";
  }

  function initTheme(){
    var theme=localStorage.getItem(THEME_KEY);
    if(theme==="dark")document.body.classList.add("dark");
    els.themeToggle.addEventListener("click",function(){
      document.body.classList.toggle("dark");
      localStorage.setItem(THEME_KEY,document.body.classList.contains("dark")?"dark":"light");
    });
  }

  function init(){
    [
      "toast","startGrid","workspace","paperName","questionCount","sourceName","orderCount","orderList",
      "paperQuestions","previewTitle","previewMeta","paperSheet","fileInput","importButton","openProjectButton",
      "copyPromptButton","downloadTemplateButton","howButton","replaceButton","exportProjectButton","printButton",
      "resetOrderButton","clearButton","formatModal","themeToggle","compileModeButton","compileBar","compileOrderButton",
      "compileExitButton","compilePrintButton","previewPageCurrent","previewPageTotal"
    ].forEach(function(id){els[id]=byId(id)});
    els.paperStage=document.querySelector(".paper-stage");

    initTheme();
    bindDrag();
    bindPaperDrag();

    els.importButton.addEventListener("click",function(){els.fileInput.click()});
    els.openProjectButton.addEventListener("click",function(){els.fileInput.click()});
    els.replaceButton.addEventListener("click",function(){els.fileInput.click()});
    els.fileInput.addEventListener("change",function(){importSelectedFile(els.fileInput.files&&els.fileInput.files[0])});
    els.copyPromptButton.addEventListener("click",copyPrompt);
    els.downloadTemplateButton.addEventListener("click",downloadTemplate);
    els.howButton.addEventListener("click",function(){showModal(true)});
    els.exportProjectButton.addEventListener("click",exportProject);
    els.compileModeButton.addEventListener("click",function(){setCompileMode(!compileMode)});
    els.compileExitButton.addEventListener("click",function(){setCompileMode(false)});
    els.compileOrderButton.addEventListener("click",function(){setQuestionMoveEnabled(!questionMoveEnabled)});
    els.compilePrintButton.addEventListener("click",printPaper);
    els.printButton.addEventListener("click",printPaper);
    els.resetOrderButton.addEventListener("click",resetOrder);
    els.clearButton.addEventListener("click",clearPaper);
    document.querySelectorAll("[data-modal-close]").forEach(function(el){el.addEventListener("click",function(){showModal(false)})});
    document.addEventListener("keydown",function(e){if(e.key==="Escape"&&!els.formatModal.hidden)showModal(false)});
    window.addEventListener("resize",function(){requestAnimationFrame(function(){syncPaperScale();updatePageEstimate()})});

    if(restoreLocal())renderAll();
    else renderAll();

    window.addEventListener("load",function(){renderPaper();syncPaperScale();updatePageEstimate()});
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);
  else init();
})();
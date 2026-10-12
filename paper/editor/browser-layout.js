(function(global){
"use strict";

var PX_PER_MM=96/25.4;
var MIN_SCALE=.5;
var MAX_REPAIR_PASSES=3;

function clamp(value,min,max){return Math.min(max,Math.max(min,value))}
function roundMm(value){return Math.round(value*10)/10}
function nextFrame(){return new Promise(function(resolve){requestAnimationFrame(function(){requestAnimationFrame(resolve)})})}
function abortError(){return new DOMException("分页已取消","AbortError")}
function assertActive(signal){if(signal&&signal.aborted)throw abortError()}

function withTimeout(promise,timeout,code,signal){
  return new Promise(function(resolve,reject){
    var done=false;
    var timer=setTimeout(function(){finish(new Error(code||"LAYOUT_RESOURCE_TIMEOUT"))},timeout||15000);
    function abort(){finish(abortError())}
    function finish(error,value){
      if(done)return;done=true;clearTimeout(timer);
      if(signal)signal.removeEventListener("abort",abort);
      if(error)reject(error);else resolve(value);
    }
    if(signal){signal.addEventListener("abort",abort,{once:true});if(signal.aborted)return abort()}
    Promise.resolve(promise).then(function(value){finish(null,value)},finish);
  });
}

async function waitForResources(root,signal){
  assertActive(signal);
  var fonts=document.fonts?document.fonts.ready:Promise.resolve();
  var images=Array.from(root.querySelectorAll("img")).map(function(image){
    if(typeof image.decode==="function")return image.decode().then(function(){if(!image.naturalWidth)throw new Error("LAYOUT_IMAGE_INVALID")});
    return new Promise(function(resolve,reject){
      if(image.complete)return image.naturalWidth?resolve():reject(new Error("LAYOUT_IMAGE_INVALID"));
      image.addEventListener("load",resolve,{once:true});image.addEventListener("error",function(){reject(new Error("LAYOUT_IMAGE_INVALID"))},{once:true});
    });
  });
  await withTimeout(Promise.all([fonts].concat(images)),15000,"LAYOUT_RESOURCE_TIMEOUT",signal);
  await nextFrame();assertActive(signal);
}

function eachVisibleTextNode(root,callback){
  var walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode:function(node){
    if(!node.textContent||!node.textContent.trim())return NodeFilter.FILTER_REJECT;
    var parent=node.parentElement;
    if(!parent||parent.closest("[hidden],[aria-hidden='true'],script,style,.browser-gap-handle"))return NodeFilter.FILTER_REJECT;
    var style=getComputedStyle(parent);
    // The off-screen measurement layer is intentionally visibility:hidden.
    // Its text still paints into layout rects and must participate in measuring.
    return style.display==="none"||(style.visibility==="hidden"&&!parent.closest(".paper-measurement-layer"))?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT;
  }});
  while(walker.nextNode())if(callback(walker.currentNode)===true)break;
}

function textRects(node){
  var range=document.createRange();range.selectNodeContents(node);
  var rects=Array.from(range.getClientRects()).filter(function(rect){return rect.width>.1&&rect.height>.1});
  range.detach();return rects;
}

function paintedRects(root){
  var rects=[];
  var atomic="math,.tml-display,.tml-math,img,svg,canvas,table,tr,pre,code,.options,.option,.semantic-row,.paper-section-heading";
  root.querySelectorAll(atomic).forEach(function(element){rects.push.apply(rects,Array.from(element.getClientRects()))});
  eachVisibleTextNode(root,function(node){
    if(node.parentElement&&node.parentElement.closest(atomic))return false;
    rects.push.apply(rects,textRects(node));return false;
  });
  return rects.filter(function(rect){return rect.width>.1&&rect.height>.1});
}

function safeBreaks(root,pxPerMm){
  var base=root.getBoundingClientRect(),rects=paintedRects(root).sort(function(a,b){return a.top-b.top});
  var candidates=[],cursor=base.top;
  rects.forEach(function(rect){
    if(rect.top>cursor+.35)candidates.push((cursor+rect.top)/2);
    cursor=Math.max(cursor,rect.bottom);
  });
  root.querySelectorAll(".semantic-row,.options,.option,.paper-section-heading,.question-line,.question-answer-space,p").forEach(function(element){
    var box=element.getBoundingClientRect();if(box.height){candidates.push(box.top,box.bottom)}
    if(element.classList.contains("question-answer-space")){
      for(var point=box.top+10*pxPerMm;point<box.bottom;point+=10*pxPerMm)candidates.push(point);
    }
  });
  var question=root.querySelector(".question-line"),keepUntil=base.top;
  if(question){
    var questionBox=question.getBoundingClientRect();
    var leading=parseFloat(getComputedStyle(root).lineHeight)||16;
    keepUntil=questionBox.top+Math.min(questionBox.height,3*leading);
  }
  return Array.from(new Set(candidates.filter(function(point){
    return point>=keepUntil-.15&&point>base.top+1&&point<base.bottom-1&&!rects.some(function(rect){return rect.top<point-.15&&rect.bottom>point+.15});
  }).map(function(point){return roundMm((point-base.top)/pxPerMm)}))).sort(function(a,b){return a-b});
}

function inkBounds(root){
  var left=Infinity,right=-Infinity,top=Infinity,bottom=-Infinity,found=false;
  function add(rect){
    if(!rect||!rect.width&&!rect.height)return;found=true;
    left=Math.min(left,rect.left);right=Math.max(right,rect.right);top=Math.min(top,rect.top);bottom=Math.max(bottom,rect.bottom);
  }
  eachVisibleTextNode(root,function(node){textRects(node).forEach(add);return false});
  root.querySelectorAll("img,svg,canvas,math,.tml-display,table,pre").forEach(function(element){add(element.getBoundingClientRect())});
  return found?{left:left,right:right,top:top,bottom:bottom}:root.getBoundingClientRect();
}

function maxSegment(height,breaks){
  var points=[0].concat(breaks||[],[height]);
  var max=0;for(var i=1;i<points.length;i++)max=Math.max(max,points[i]-points[i-1]);
  return max;
}

function horizontalFitRatio(columnBox,ink){
  var paintedWidth=Math.max(columnBox.right,ink.right)-Math.min(columnBox.left,ink.left);
  // Do not reserve a pixel from already-fitting content: that makes every
  // pass shrink a full-width block forever, even when there is no overflow.
  return paintedWidth<=columnBox.width+1?1:columnBox.width/paintedWidth;
}

function geometry(info,template){
  var columns=Math.max(1,Number(info.columns)||1),gap=Number(info.columnGapMm)||0;
  var header=template==="book"?((Number(info.headerHeightPt)||25)*25.4/72):0;
  var footer=Math.max(4.2,Number(info.footSkipMm)||4.2);
  var width=(Number(info.widthMm)-Number(info.leftMm)-Number(info.rightMm)-gap*(columns-1))/columns;
  // Running furniture lives inside the page margins in the Everflow master.
  // Only the declared top/bottom margins reduce the question flow height.
  var height=Number(info.heightMm)-Number(info.topMm)-Number(info.bottomMm);
  return {columns:columns,columnGapMm:gap,columnWidthMm:roundMm(width),columnHeightMm:roundMm(height),headerMm:roundMm(header),footerMm:roundMm(footer)};
}

function measureNodes(layer,records,geo,scales){
  var layerWidth=layer.getBoundingClientRect().width,pxPerMm=layerWidth/geo.columnWidthMm;
  return records.map(function(record,index){
    var node=layer.querySelector('[data-measure-id="'+CSS.escape(String(record.id))+'"]');
    var currentScale=scales[record.id]||1;
    node.style.zoom=String(currentScale);
    var box=node.getBoundingClientRect(),height=roundMm(box.height/pxPerMm),breaks=safeBreaks(node,pxPerMm);
    var ink=inkBounds(node),columnBox=layer.getBoundingClientRect();
    var horizontalRatio=horizontalFitRatio(columnBox,ink);
    return {id:record.id,index:index,record:record,node:node,heightMm:height,safeBreaksMm:breaks,scale:currentScale,horizontalRatio:horizontalRatio,maxSegmentMm:maxSegment(height,breaks)};
  });
}

function newPage(geo){
  return {columns:Array.from({length:geo.columns},function(){return {usedMm:0,fragments:[]}})};
}

function paginate(items,geo,onePerPage){
  var pages=[newPage(geo)],pageIndex=0,columnIndex=0,overflow=[];
  function column(){return pages[pageIndex].columns[columnIndex]}
  function advanceColumn(){
    if(columnIndex+1<geo.columns){columnIndex++;return}
    pages.push(newPage(geo));pageIndex++;columnIndex=0;
  }
  function advancePage(){
    if(!column().fragments.length&&columnIndex===0&&pages[pageIndex].columns.every(function(c){return !c.fragments.length}))return;
    pages.push(newPage(geo));pageIndex++;columnIndex=0;
  }
  items.forEach(function(item,itemIndex){
    if((item.record.breakBefore||onePerPage)&&pages.some(function(page){return page.columns.some(function(c){return c.fragments.length})}))advancePage();
    var offset=0;
    while(offset<item.heightMm-.01){
      var current=column(),remaining=geo.columnHeightMm-current.usedMm;
      if(remaining<1){advanceColumn();continue}
      var rest=item.heightMm-offset;
      if(rest<=remaining+.01){
        current.fragments.push({item:item,offsetMm:offset,heightMm:rest,whole:offset===0&&rest>=item.heightMm-.01,last:true});
        current.usedMm=roundMm(current.usedMm+rest);offset=item.heightMm;break;
      }
      if(offset===0&&item.heightMm<=geo.columnHeightMm+.01){advanceColumn();continue}
      var limit=offset+remaining;
      var end=(item.safeBreaksMm||[]).filter(function(point){return point>offset+.2&&point<=limit+.01}).pop();
      if(end==null){
        if(current.fragments.length){advanceColumn();continue}
        end=(item.safeBreaksMm||[]).filter(function(point){return point>offset+.2&&point<=offset+geo.columnHeightMm+.01}).pop();
        if(end==null){overflow.push(item.id);break}
      }
      current.fragments.push({item:item,offsetMm:offset,heightMm:roundMm(end-offset),whole:false,last:end>=item.heightMm-.01});
      current.usedMm=roundMm(current.usedMm+end-offset);offset=end;
      if(offset<item.heightMm-.01)advanceColumn();
    }
    if(onePerPage&&itemIndex<items.length-1)advancePage();
  });
  while(pages.length>1&&pages[pages.length-1].columns.every(function(c){return !c.fragments.length}))pages.pop();
  return {pages:pages,overflowQuestionIds:Array.from(new Set(overflow))};
}

function stripMeasurementAttributes(node){
  node.removeAttribute("data-measure-id");
  node.querySelectorAll("[id]").forEach(function(element){element.removeAttribute("id")});
  return node;
}

function renderPage(layoutPage,pageNumber,total,options,geo,logicalOffset,totalLogical){
  var info=options.info,page=document.createElement("section");
  page.className="typst-page browser-paper-page";
  page.dataset.page=String(pageNumber);page.dataset.layoutVersion=String(options.layoutVersion||"");
  page.style.setProperty("--paper-width",info.widthMm+"mm");page.style.setProperty("--paper-height",info.heightMm+"mm");
  page.style.setProperty("--paper-top",info.topMm+"mm");page.style.setProperty("--paper-bottom",info.bottomMm+"mm");
  page.style.setProperty("--paper-left",info.leftMm+"mm");page.style.setProperty("--paper-right",info.rightMm+"mm");
  page.style.setProperty("--paper-header",geo.headerMm+"mm");page.style.setProperty("--paper-footer",geo.footerMm+"mm");
  page.style.setProperty("--paper-column-gap",geo.columnGapMm+"mm");page.style.setProperty("--paper-font",info.fontPt+"pt");
  page.style.setProperty("--paper-leading",String(info.lineHeight));
  page.style.setProperty("--paper-head-sep",(Number(info.headSepMm)||3)+"mm");
  page.style.setProperty("--master-choice-before",((Number(info.baselinePt)||0)*(Number(info.choiceBeforeSkipBaseline)||0)*25.4/72)+"mm");

  if(options.template==="book"){
    var header=document.createElement("header");header.className="browser-running-header";
    ["彼时流年若水",options.header||"","https://zuotiben.top"].forEach(function(text){var span=document.createElement("span");span.textContent=text;header.appendChild(span)});
    page.appendChild(header);
  }
  var columns=document.createElement("main");columns.className="browser-paper-columns";columns.style.gridTemplateColumns="repeat("+geo.columns+",minmax(0,1fr))";
  layoutPage.columns.forEach(function(layoutColumn,columnIndex){
    var column=document.createElement("div");column.className="browser-paper-column";column.dataset.column=String(columnIndex+1);
    layoutColumn.fragments.forEach(function(fragment){
      var source=fragment.item.node.cloneNode(true),rendered;
      stripMeasurementAttributes(source);source.style.zoom=String(fragment.item.scale||1);
      if(fragment.whole){rendered=source}
      else{
        rendered=document.createElement("div");rendered.className="paper-question-fragment-window";rendered.style.height=fragment.heightMm+"mm";
        var body=document.createElement("div");body.className="paper-question-fragment-body";body.style.transform="translateY(-"+fragment.offsetMm+"mm)";
        if(!fragment.last)source.querySelectorAll(".browser-gap-handle").forEach(function(handle){handle.remove()});
        body.appendChild(source);rendered.appendChild(body);
      }
      column.appendChild(rendered);
    });
    columns.appendChild(column);
  });
  page.appendChild(columns);

  var watermark=document.createElement("img");watermark.className="browser-paper-watermark";watermark.src="../assets/watermark/water.png";watermark.alt="";watermark.setAttribute("aria-hidden","true");page.appendChild(watermark);
  var qr=document.createElement("aside");qr.className="browser-paper-qr";qr.setAttribute("aria-label","zuotiben.top 二维码");
  var qrImage=document.createElement("img");qrImage.src="../assets/zuotiben-qr.svg";qrImage.alt="";qrImage.setAttribute("aria-hidden","true");
  var qrText=document.createElement("span");qrText.textContent="zuotiben.top";qr.append(qrImage,qrText);page.appendChild(qr);
  var footer=document.createElement("footer");footer.className="browser-paper-footer";
  if(options.template==="exam"&&geo.columns>1){
    footer.classList.add("is-column-footer");
    var logical=Number(logicalOffset)||0;
    layoutPage.columns.forEach(function(layoutColumn){
      var number=document.createElement("span");
      if(layoutColumn.fragments.length){logical++;number.textContent=(options.title||"试卷")+"  第 "+logical+" 页（共 "+totalLogical+" 页）"}
      footer.appendChild(number);
    });
  }else{
    var number=document.createElement("span");
    number.textContent=options.template==="book"
      ?"· 第 "+pageNumber+" 页 / 共 "+total+" 页 ·"
      :(options.title||"试卷")+"  第 "+pageNumber+" 页（共 "+total+" 页）";
    footer.appendChild(number);
  }
  page.appendChild(footer);
  return page;
}

function validate(host){
  var issues=[];
  host.querySelectorAll(".browser-paper-column").forEach(function(column){
    var bounds=column.getBoundingClientRect();
    if(column.scrollHeight>column.clientHeight+1){
      var items=column.querySelectorAll(".paper-layout-item[data-question-id]");
      var last=items.length?items[items.length-1]:null;
      issues.push({kind:"vertical",questionId:last?last.dataset.questionId:null,ratio:column.clientHeight/column.scrollHeight});
    }
    column.querySelectorAll(".paper-layout-item").forEach(function(item){
      var ink=inkBounds(item),id=item.dataset.questionId||null;
      if(ink.right>bounds.right+1||ink.left<bounds.left-1){
        var width=Math.max(.1,ink.right-ink.left);issues.push({kind:"horizontal",questionId:id,ratio:(bounds.width-2)/width});
      }
    });
  });
  return issues;
}

function createMeasurementLayer(options,geo){
  var layer=document.createElement("div");layer.className="paper-measurement-layer";
  layer.style.width=geo.columnWidthMm+"mm";
  layer.style.fontSize=options.info.fontPt+"pt";
  layer.style.lineHeight=String(options.info.lineHeight);
  layer.style.setProperty("--master-choice-before",((Number(options.info.baselinePt)||0)*(Number(options.info.choiceBeforeSkipBaseline)||0)*25.4/72)+"mm");
  options.records.forEach(function(record,index){
    var node=options.createItem(record,index,true);node.dataset.measureId=String(record.id);layer.appendChild(node);
  });
  document.body.appendChild(layer);return layer;
}

function fitChoices(layer){
  layer.querySelectorAll(".options").forEach(function(options){
    var cells=Array.from(options.children),width=options.getBoundingClientRect().width,max=0;
    cells.forEach(function(cell){
      var probe=cell.cloneNode(true);
      probe.style.cssText="position:absolute;display:inline-flex;width:max-content;max-width:none;white-space:nowrap";
      var label=probe.querySelector(".option-label");if(label)label.style.cssText="width:2.25em;flex:0 0 2.25em";
      layer.appendChild(probe);max=Math.max(max,probe.getBoundingClientRect().width);probe.remove();
    });
    var n=cells.length,short=max<=.22*width,medium=max<=.46*width;
    var cols=n===3||n===6?(short?3:medium?2:1):n===4?(short?4:medium?2:1):n>1&&medium?2:1;
    options.className="options cols-"+cols;
  });
}

function installPrintRule(info){
  var style=document.getElementById("everflow-browser-print-page");
  if(!style){style=document.createElement("style");style.id="everflow-browser-print-page";document.head.appendChild(style)}
  style.textContent="@media print{@page everflow-cover{size:210mm 297mm;margin:0}@page everflow-content{size:"+info.widthMm+"mm "+info.heightMm+"mm;margin:0}}";
}

async function render(options){
  var signal=options.signal,geo=geometry(options.info,options.template),layer=createMeasurementLayer(options,geo),scales={},pass=0,result=null;
  try{
    if(options.renderMath)options.renderMath(layer);
    await waitForResources(layer,signal);fitChoices(layer);await nextFrame();installPrintRule(options.info);
    for(pass=0;pass<MAX_REPAIR_PASSES;pass++){
      assertActive(signal);if(options.onProgress)options.onProgress({phase:pass?"repairing":"measuring",pass:pass+1,total:MAX_REPAIR_PASSES});
      var measured=measureNodes(layer,options.records,geo,scales);
      var adjusted=false;
      measured.forEach(function(item){
        var verticalRatio=item.maxSegmentMm>geo.columnHeightMm?geo.columnHeightMm/item.maxSegmentMm:1;
        var ratio=Math.min(1,item.horizontalRatio,verticalRatio);
        if(ratio<.999){
          var next=Math.floor(item.scale*ratio*.995*1000)/1000;
          if(next<MIN_SCALE)throw Object.assign(new Error("题目 "+item.record.number+" 低于 50% 仍无法安全排版，请改用更大纸张或拆分题目。"),{code:"LAYOUT_UNREADABLE",questionId:item.id});
          scales[item.id]=next;adjusted=true;
        }
      });
      if(adjusted){await nextFrame();continue}
      var pagination=paginate(measured,geo,!!options.info.onePerPage);
      if(pagination.overflowQuestionIds.length){
        var changed=false;
        pagination.overflowQuestionIds.forEach(function(id){
          var item=measured.find(function(candidate){return candidate.id===id});if(!item)return;
          var next=Math.floor(item.scale*.92*1000)/1000;
          if(next>=MIN_SCALE){scales[id]=next;changed=true}
        });
        if(changed){await nextFrame();continue}
        throw Object.assign(new Error("有题目没有可用的安全断点，请拆分题干或改用 A3。"),{code:"LAYOUT_NO_SAFE_BREAK",questionIds:pagination.overflowQuestionIds});
      }
      var fragment=document.createDocumentFragment();
      var coverCount=options.createCover?1:0;
      if(options.createCover)fragment.appendChild(options.createCover());
      var totalLogical=pagination.pages.reduce(function(sum,page){return sum+page.columns.filter(function(column){return column.fragments.length}).length},0);
      var logicalOffset=0;
      pagination.pages.forEach(function(page,index){
        var rendered=renderPage(page,index+1,pagination.pages.length,options,geo,logicalOffset,totalLogical);
        rendered.dataset.page=String(index+1+coverCount);
        fragment.appendChild(rendered);
        logicalOffset+=page.columns.filter(function(column){return column.fragments.length}).length;
      });
      options.host.replaceChildren(fragment);await nextFrame();assertActive(signal);
      var issues=validate(options.host);
      if(!issues.length){
        result={status:"ready",pageCount:pagination.pages.length,coverPageCount:options.createCover?1:0,repairPass:pass,scales:scales,overflowQuestionIds:[]};break;
      }
      issues.forEach(function(issue){
        if(!issue.questionId)return;
        var current=scales[issue.questionId]||1,next=Math.floor(current*clamp(issue.ratio*.99,.75,.99)*1000)/1000;
        if(next>=MIN_SCALE)scales[issue.questionId]=next;
      });
      await nextFrame();
    }
    if(!result)throw Object.assign(new Error("三轮自动调整后仍存在越界内容，请改用 A3、减少留白或拆分题目。"),{code:"LAYOUT_REPAIR_EXHAUSTED"});
    if(options.onProgress)options.onProgress({phase:"ready",pass:pass+1,total:MAX_REPAIR_PASSES,pageCount:result.pageCount});
    return result;
  }finally{layer.remove()}
}

global.EverflowBrowserLayout={render:render,waitForResources:waitForResources,geometry:geometry,pxPerMm:PX_PER_MM,
  horizontalFitRatio:horizontalFitRatio,paginate:paginate};
})(window);

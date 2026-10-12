/* Everflow safe math rendering.
 * Repairs common imported TeX escaping mistakes ONLY for display, never writes
 * into the source fields. Invalid math stays legible and editable, not Temml ParseError.
 * Requires the bundled local Temml distribution; makes no network requests.
 */
(function(global){
"use strict";
var DELIMITED=/(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)|(?<!\\)\$(?:\\.|[^$\n])+\$)/g;
var COMMAND=/\\(?:frac|dfrac|tfrac|sqrt|int|iint|iiint|sum|prod|lim|mathrm|mathbf|mathbb|mathcal|mathit|left|right|cdot|times|geq|leq|neq|infty|alpha|beta|gamma|lambda|theta|pi|sin|cos|tan|ln|log|exp|partial|nabla|overline|bar|vec|hat|begin|end)\b/;
var COUNT={repaired:0,fallback:0,rendered:0};
function fixImportedTeX(s){
  var raw=String(s||"");
  // Importers occasionally serialize a slash twice in each macro, but TeX
  // matrix row breaks (\\) are intentionally left unchanged.
  var fixed=raw.replace(/\\\\(?=(?:frac|dfrac|tfrac|sqrt|int|iint|iiint|sum|prod|lim|mathrm|mathbf|mathbb|mathcal|mathit|left|right|cdot|times|geq|leq|neq|infty|alpha|beta|gamma|lambda|theta|pi|sin|cos|tan|ln|log|exp|partial|nabla|overline|bar|vec|hat|begin|end)\b)/g,"\\");
  if(fixed!==raw)COUNT.repaired++;
  return fixed;
}
function simplifyInvalid(raw){
  return String(raw||"")
    .replace(/\\(?:left|right)\s*/g,"")
    .replace(/\\(?:mathrm|mathbf|mathit|text)\{([^{}]*)\}/g,"$1")
    .replace(/\\(?:dfrac|tfrac|frac)\{([^{}]*)\}\{([^{}]*)\}/g,"($1)/($2)")
    .replace(/\\(?:geq|ge)\b/g,"≥").replace(/\\(?:leq|le)\b/g,"≤")
    .replace(/\\neq\b/g,"≠").replace(/\\infty\b/g,"∞")
    .replace(/\\cdot\b/g,"·").replace(/\\times\b/g,"×")
    .replace(/\\int\b/g,"∫").replace(/\\iint\b/g,"∬")
    .replace(/\\sum\b/g,"∑").replace(/\\sqrt\{([^{}]*)\}/g,"√($1)")
    .replace(/\\(?:alpha|beta|gamma|theta|lambda|pi)\b/g,function(x){return ({alpha:"α",beta:"β",gamma:"γ",theta:"θ",lambda:"λ",pi:"π"})[x.slice(1)]||x})
    .replace(/\\(?:\(|\)|\[|\])/g,"").replace(/\\\\(?=[A-Za-z])/g,"\\")
    .replace(/\s{3,}/g,"  ");
}
function runTeX(expression,display,ownerDoc){
  var clean=fixImportedTeX(expression).trim(),result=null;
  if(!clean)return ownerDoc.createTextNode("");
  if(global.temml&&typeof global.temml.renderToString==="function"){
    // Reject invalid TeX rather than letting autoRender inject "ParseError"
    // into the user's PDF. A missing \right is common in OCR/AI imports.
    for(var step=0;step<2;step++){
      var candidate=step===0?clean:clean.replace(/\\(?:left|right)\b\s*/g,"");
      try{
        var html=global.temml.renderToString(candidate,{
          displayMode:!!display,throwOnError:true,strict:false,trust:false,
          maxExpand:1000,maxSize:50
        });
        if(/ParseError|katex-error|temml-error/i.test(html))throw new Error("Temml returned error markup");
        var span=ownerDoc.createElement("span");
        span.className="math-safe-rendered";
        if(display)span.classList.add("math-safe-display");
        span.innerHTML=html;
        if(!span.querySelector("math"))throw new Error("No MathML output");
        if(step)span.title="已自动修复不配对的 \\left / \\right；原题内容未被修改";
        COUNT.rendered++;if(step)COUNT.repaired++;
        return span;
      }catch(e){result=e}
    }
  }
  var fallback=ownerDoc.createElement("span");
  fallback.className="math-safe-fallback";
  fallback.title="公式语法有误，已以可读文本显示。请在左侧修正原始 LaTeX；原始内容未被修改。";
  fallback.textContent=simplifyInvalid(clean);
  COUNT.fallback++;
  return fallback;
}
function groupLiteralMath(str,doc){
  var frag=doc.createDocumentFragment();
  // Group ASCII math runs containing TeX macros between Chinese text.
  // Do not treat ordinary English prose as mathematics.
  var chunks=String(str||"").split(/([\u3400-\u9fff，。；：、！？\n]+)/);
  chunks.forEach(function(chunk){
    if(!chunk)return;
    var value=fixImportedTeX(chunk);
    if(COMMAND.test(value)){
      var match=value.match(/^(\s*)([\s\S]*?)(\s*)$/),inner=match[2];
      if(inner)frag.append(doc.createTextNode(match[1]),runTeX(inner,false,doc),doc.createTextNode(match[3]));
      else frag.append(doc.createTextNode(value));
    }else{
      frag.append(doc.createTextNode(value));
    }
  });
  return frag;
}
function convertNode(node){
  var doc=node.ownerDocument,content=node.nodeValue;
  if(!content||(!/\\[A-Za-z(\[\])]/.test(content)&&content.indexOf("$")<0))return;
  var frag=doc.createDocumentFragment(),idx=0,match;
  DELIMITED.lastIndex=0;
  while((match=DELIMITED.exec(content))){
    if(match.index>idx)frag.append(groupLiteralMath(content.slice(idx,match.index),doc));
    var token=match[0],display=token.startsWith("$$")||token.startsWith("\\[");
    var raw=token.startsWith("$$")?token.slice(2,-2):token.startsWith("$")?token.slice(1,-1):token.slice(2,-2);
    frag.append(runTeX(raw,display,doc));
    idx=DELIMITED.lastIndex;
  }
  if(idx<content.length)frag.append(groupLiteralMath(content.slice(idx),doc));
  if(frag.hasChildNodes())node.replaceWith(frag);
}
function render(root){
  if(!root)return;
  var doc=root.ownerDocument||document,filter={
    acceptNode:function(node){
      var parent=node.parentElement;
      if(!parent||parent.closest("math,.math-safe-rendered,.math-safe-fallback,script,style,textarea,pre,code,svg"))return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  };
  var walker=doc.createTreeWalker(root,NodeFilter.SHOW_TEXT,filter),nodes=[];
  while(walker.nextNode())nodes.push(walker.currentNode);
  nodes.forEach(convertNode);
  return COUNT;
}
global.EverflowSafeMath={render:render,stats:function(){return Object.assign({},COUNT)},fixImportedTeX:fixImportedTeX};
})(window);

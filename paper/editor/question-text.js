(function(global){
"use strict";
function normalize(text){
  return String(text||"").replace(/\\par\b/g,"\n")
    .replace(/\\blankbox\b/g,"（\u2002\u2002\u2002）")
    .replace(/（\s*\\hspace\{1\.5em\}\s*）/g,"（\u2002\u2002\u2002）")
    .replace(/\\blankline\b/g,"＿＿＿").replace(/\\quad\b/g,"\u2003");
}
function semanticLines(text){
  var formulas=[];
  var src=String(text||"").replace(/\r\n?/g,"\n").replace(/\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)|\$[^$]*?\$/g,function(math){
    var token="\uE000"+formulas.length+"\uE001";formulas.push(math);return token;
  });
  src=normalize(src);
  var roman=["I","II","III","IV","V","VI","VII","VIII","IX","X"];
  src=src.replace(/([ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ])[.、．]?/g,function(_,c){return roman[c.charCodeAt(0)-0x2160]+"."});
  src=src.replace(/([^\n])\s+(?=[①②③④⑤⑥⑦⑧⑨⑩])/g,"$1\n")
    .replace(/([^\n])\s+(?=(?:\([1-9]\d*\)|（[1-9]\d*）|\([ivxlcdm]+\))\s*)/gi,"$1\n");
  src=(" "+src).replace(/([^\nA-Za-z0-9/])\s+(?=(?:VIII|VII|VI|IV|IX|III|II|I|V|X)[.、．]\s*)/g,"$1\n").slice(1);
  return src.split(/\n+/).map(function(line){return line.trim().replace(/\uE000(\d+)\uE001/g,function(_,i){return formulas[Number(i)]})}).filter(Boolean);
}
global.EverflowQuestionText={semanticLines:semanticLines};
})(globalThis);

// Everflow editor state -> safe Typst content.
// All visual/layout rules live in everflow-template.typ.

function typstString(value){
  return '"' + String(value==null?"":value)
    .replace(/\\/g,"\\\\")
    .replace(/"/g,'\\"')
    .replace(/\r/g,"\\r")
    .replace(/\n/g,"\\n")
    .replace(/\t/g,"\\t")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,"") + '"';
}

function normalizeTemplateMacros(text){
  return String(text||"")
    .replace(/\\par\b/g,"\n")
    .replace(/\\blankbox\b/g,"（\u2002\u2002\u2002）")
    .replace(/（\s*\\hspace\{1\.5em\}\s*）/g,"（\u2002\u2002\u2002）")
    .replace(/\\blankline\b/g,"＿＿＿")
    .replace(/\\quad\b/g,"\u2003");
}

function semanticLines(text){
  let src=normalizeTemplateMacros(text).replace(/\r\n?/g,"\n");
  src=src.replace(/([^\n])\s+(?=(?:①|②|③|④|⑤|⑥|⑦|⑧|⑨|⑩))/g,"$1\n");
  src=src.replace(/([^\n])\s+(?=(?:\([1-9]\d*\)|（[1-9]\d*）|\([ivxlcdm]+\))\s*)/gi,"$1\n");
  src=(" "+src)
    .replace(/([^\nA-Za-z0-9/])\s+(?=(?:I{1,3}|IV|V|VI{0,3})[.、．]\s*)/g,"$1\n")
    .slice(1);
  return src.split(/\n+/).map(x=>x.trim()).filter(Boolean);
}

function classifyLine(line){
  let m=String(line||"").match(/^([①②③④⑤⑥⑦⑧⑨⑩])\s*(.*)$/);
  if(m)return {kind:"circled",label:m[1],body:m[2]};
  m=String(line||"").match(/^((?:I{1,3}|IV|V|VI{0,3})[.、．])\s*(.*)$/);
  if(m)return {kind:"roman",label:m[1],body:m[2]};
  m=String(line||"").match(/^((?:\([1-9]\d*\)|（[1-9]\d*）|\([ivxlcdm]+\)))\s*(.*)$/i);
  if(m)return {kind:"subq",label:m[1],body:m[2]};
  return {kind:"plain",label:"",body:String(line||"")};
}

function inlineParts(text,book){
  const source=String(text||"");
  const re=/(\$[^$\n]+\$|\\\([^]*?\\\))/g;
  const out=[];
  let last=0,m;
  while((m=re.exec(source))){
    if(m.index>last)out.push("#text("+typstString(source.slice(last,m.index))+")");
    const raw=m[0];
    let math=raw.startsWith("$")?raw.slice(1,-1):raw.slice(2,-2);
    if(book&&!/^\s*\\displaystyle\b/.test(math))math="\\displaystyle "+math;
    out.push("#everflow-inline-math("+typstString(math)+")");
    last=m.index+raw.length;
  }
  if(last<source.length)out.push("#text("+typstString(source.slice(last))+")");
  if(!out.length)out.push("#text("+typstString(source)+")");
  return out.join("");
}

function questionBody(text,book){
  const src=normalizeTemplateMacros(text);
  const displayRe=/(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\])/g;
  const nodes=[];
  let last=0,m,previousKind="plain";

  function addText(chunk){
    for(const line of semanticLines(chunk)){
      const meta=classifyLine(line);
      const groupStart=meta.kind!=="plain"&&meta.kind!==previousKind;
      nodes.push(
        "#everflow-semantic-line("+
        typstString(meta.kind)+","+
        typstString(meta.label)+
        ",["+inlineParts(meta.body,book)+"],group-start:"+(groupStart?"true":"false")+")"
      );
      previousKind=meta.kind;
    }
  }

  while((m=displayRe.exec(src))){
    if(m.index>last)addText(src.slice(last,m.index));
    const raw=m[0];
    nodes.push("#block(above:3pt,below:3pt)[#everflow-display-math("+typstString(raw.slice(2,-2).trim())+")]" );
    previousKind="plain";
    last=m.index+raw.length;
  }
  if(last<src.length)addText(src.slice(last));
  if(!nodes.length)nodes.push("#text("+typstString("（空题干）")+")");
  return "[\n"+nodes.join("\n")+"\n]";
}

function optionBody(text,book){
  const source=normalizeTemplateMacros(text).replace(/\r\n?/g,"\n");
  const ls=source.split(/\n+/).map(x=>x.trim()).filter(Boolean);
  if(!ls.length)return "[#text(\"\")]";
  return "["+ls.map((line,i)=>(i?"#linebreak()":"")+inlineParts(line,book)).join("")+"]";
}

function sectionName(raw){
  return String(raw||"")
    .replace(/^\s*[一二三四五六七八九十百]+[、.．]\s*/,"")
    .replace(/^\s*\d+[.．、]\s*/,"")
    .trim();
}

function questionGapMm(spec){
  if(typeof spec.questionGapMm==="number")return spec.questionGapMm;
  if(typeof spec.questionGapBaseline==="number"){
    return Number(spec.baselinePt||0)*Number(spec.questionGapBaseline)*25.4/72;
  }
  return 0;
}

function configSource(state,spec){
  const kind=state.template==="book"?"book":"exam";
  const bodySize=Number(spec.fontPt||(kind==="book"?10.53937:9.03374));
  const baseline=Number(spec.baselinePt||(kind==="book"?16.44145:14.09265));
  const width=Number(spec.widthMm||210),height=Number(spec.heightMm||297);
  const top=Number(spec.topMm||(kind==="book"?14:16));
  const bottom=Number(spec.bottomMm||(kind==="book"?14:12));
  const left=Number(spec.leftMm||(kind==="book"?18:20));
  const right=Number(spec.rightMm||(kind==="book"?18:20));
  const columnGap=Number(spec.columnGapMm||0);
  const columns=Number(spec.columns||1);
  const usable=height-top-bottom;
  const contentWidth=columns===2
    ?(width-left-right-columnGap)/2
    :(width-left-right);

  return "("+
    "kind:"+typstString(kind)+","+
    "title:"+typstString(state.title||"试卷")+","+
    "cover-title:"+typstString(state.coverTitle||state.title||"未命名试卷")+","+
    "export-date:"+typstString(state.exportDate||"")+","+
    "header-center:"+typstString(state.header||"")+","+
    "page-width:"+width+"mm,"+
    "page-height:"+height+"mm,"+
    "top:"+top+"mm,"+
    "bottom:"+bottom+"mm,"+
    "left:"+left+"mm,"+
    "right:"+right+"mm,"+
    "columns:"+columns+","+
    "column-gap:"+columnGap+"mm,"+
    "foot-skip:"+Number(spec.footSkipMm||(kind==="book"?9:5.3))+"mm,"+
    "body-size:"+bodySize+"pt,"+
    "baseline:"+baseline+"pt,"+
    "usable-height:"+usable+"mm,"+
    "content-width:"+contentWidth+"mm,"+
    "question-gap:"+questionGapMm(spec).toFixed(5)+"mm,"+
    "one-per-page:"+(spec.onePerPage?"true":"false")+
  ")";
}

function optionsSource(options,book){
  if(!Array.isArray(options)||!options.length)return "()";
  const items=options.map((value,i)=>
    "(label:"+typstString("("+String.fromCharCode(65+i)+")")+",body:"+optionBody(value,book)+")"
  );
  return "("+items.join(",")+(items.length===1?",":"")+")";
}

function flowSource(state,spec){
  const questions=Array.isArray(state.questions)?state.questions:[];
  const book=state.template==="book";
  const out=[];
  let previous="",sectionOrdinal=0;

  questions.forEach((q,index)=>{
    const rawSection=String(q.section||"").trim();
    const nextSection=sectionName(rawSection);
    const sectionStart=!!nextSection&&rawSection!==previous;

    if(sectionStart){
      sectionOrdinal++;
      if(book&&sectionOrdinal>1&&!spec.onePerPage)out.push("#pagebreak()");
      out.push("#everflow-section("+typstString(nextSection)+","+sectionOrdinal+",cfg)");
      previous=rawSection;
    }

    const defaultGap=questionGapMm(spec);
    const gap=spec.onePerPage?0:(Number(q.gap)>0?Number(q.gap):defaultGap);
    let force=!!q.breakBefore;
    if(book&&sectionStart&&sectionOrdinal>1&&!spec.onePerPage)force=false;

    const opts=(q.showOptions!==false&&Array.isArray(q.options)&&q.options.length)
      ?optionsSource(q.options,book)
      :"()";

    out.push(
      "#everflow-question("+(index+1)+","+
      questionBody(q.content||"",book)+
      ",options:"+opts+
      ",cfg:cfg,gap:"+gap.toFixed(5)+"mm,break-before:"+(force?"true":"false")+")"
    );

    if(spec.onePerPage&&index<questions.length-1)out.push("#pagebreak()");
  });

  return out.join("\n\n");
}

export function buildTypstSource(state,spec){
  return "#import \"/everflow-template.typ\": *\n"+
    "#let cfg = "+configSource(state,spec)+"\n"+
    "#everflow-document(cfg)[\n"+flowSource(state,spec)+"\n]\n";
}

export function makeCompilePayload(state,spec){
  return {
    source:buildTypstSource(state,spec),
    title:state.coverTitle||state.title||"Everflow",
  };
}

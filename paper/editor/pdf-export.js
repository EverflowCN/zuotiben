import React from "https://esm.sh/react@19.1.1";
import { Document, Page, Text, View, Image, Font, StyleSheet, pdf } from "https://esm.sh/@react-pdf/renderer@4.9.0?deps=react@19.1.1";
import { Math as PdfMath } from "https://esm.sh/@react-pdf/math@6.0.0?bundle&deps=react@19.1.1,@react-pdf/renderer@4.9.0";
import QRCode from "https://esm.sh/qrcode@1.5.4";

const h = React.createElement;
const MM = 72 / 25.4;
let fontsRegistered = false;
let qrPromise = null;

const FONT_URLS = {
  songRegular: "https://cdn.jsdelivr.net/gh/Yixf-Self/fandol-fonts@b93300821373d3092e378e57ae22ecb8e9082c62/FandolSong-Regular/FandolSong-Regular.otf",
  songBold: "https://cdn.jsdelivr.net/gh/Yixf-Self/fandol-fonts@b93300821373d3092e378e57ae22ecb8e9082c62/FandolSong-Bold/FandolSong-Bold.otf",
  heiRegular: "https://cdn.jsdelivr.net/gh/Yixf-Self/fandol-fonts@b93300821373d3092e378e57ae22ecb8e9082c62/FandolHei-Regular/FandolHei-Regular.otf",
  heiBold: "https://cdn.jsdelivr.net/gh/Yixf-Self/fandol-fonts@b93300821373d3092e378e57ae22ecb8e9082c62/FandolHei-Bold/FandolHei-Bold.otf",
  kaiRegular: "https://cdn.jsdelivr.net/gh/Yixf-Self/fandol-fonts@b93300821373d3092e378e57ae22ecb8e9082c62/FandolKai-Regular/FandolKai-Regular.otf"
};

function registerFonts() {
  if (fontsRegistered) return;
  Font.register({
    family: "EverflowSong",
    fonts: [
      { src: FONT_URLS.songRegular, fontWeight: 400 },
      { src: FONT_URLS.songBold, fontWeight: 700 }
    ]
  });
  Font.register({
    family: "EverflowHei",
    fonts: [
      { src: FONT_URLS.heiRegular, fontWeight: 400 },
      { src: FONT_URLS.heiBold, fontWeight: 700 }
    ]
  });
  Font.register({ family: "EverflowKai", fonts: [{ src: FONT_URLS.kaiRegular, fontWeight: 400 }] });
  Font.registerHyphenationCallback(word => [word]);
  fontsRegistered = true;
}

function layoutSpec(state) {
  const book = state.template === "book";
  const layout = state.layout || (book ? "standard" : "a4");
  const spec = {
    kind: book ? "book" : "exam",
    layout,
    widthMm: 210,
    heightMm: 297,
    topMm: book ? 14 : 16,
    bottomMm: book ? 14 : 12,
    leftMm: book ? 18 : 20,
    rightMm: book ? 18 : 20,
    fontSize: book ? 10.5 : 9,
    lineHeight: 1.56,
    columns: 1,
    columnGapMm: 0,
    onePerPage: false,
    gapPt: 0,
    footSkipMm: book ? 9 : 5.3,
    header: book
  };
  const baselinePt = spec.fontSize * spec.lineHeight;
  if (book) {
    if (layout === "compact") spec.gapPt = baselinePt * 0.35;
    else if (layout === "standard") spec.gapPt = 25 * MM;
    else if (layout === "loose") spec.gapPt = 75 * MM;
    else if (layout === "single") { spec.gapPt = 0; spec.onePerPage = true; }
    else if (layout === "padl") {
      Object.assign(spec,{widthMm:200,heightMm:150,topMm:10,bottomMm:12,leftMm:12,rightMm:12,footSkipMm:7,gapPt:0,onePerPage:true});
    } else if (layout === "padp") {
      Object.assign(spec,{widthMm:200,heightMm:250,topMm:14,bottomMm:12,leftMm:14,rightMm:14,footSkipMm:8,gapPt:0,onePerPage:true});
    }
  } else {
    spec.gapPt = baselinePt * 0.45;
    if (layout === "a3" || layout === "mixed") {
      Object.assign(spec,{widthMm:420,heightMm:297,topMm:14,bottomMm:11,leftMm:18,rightMm:18,columns:2,columnGapMm:24,footSkipMm:5.3});
    }
  }
  spec.pageWidthPt = spec.widthMm * MM;
  spec.pageHeightPt = spec.heightMm * MM;
  spec.textWidthPt = (spec.widthMm - spec.leftMm - spec.rightMm) * MM;
  spec.contentHeightPt = (spec.heightMm - spec.topMm - spec.bottomMm) * MM;
  spec.columnWidthPt = spec.columns === 2
    ? ((spec.widthMm - spec.leftMm - spec.rightMm - spec.columnGapMm) / 2) * MM
    : spec.textWidthPt;
  return spec;
}

const styles = StyleSheet.create({
  questionRow: { flexDirection: "row", alignItems: "flex-start" },
  questionBody: { flexGrow: 1, flexShrink: 1, minWidth: 0 },
  inlineRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "baseline" },
  optionRow: { flexDirection: "row", width: "100%" },
  optionCell: { paddingRight: 0 },
  qrWrap: { position: "absolute", left: 3 * MM, bottom: 5.8 * MM, width: 15 * MM, alignItems: "center" },
  qr: { width: 13 * MM, height: 13 * MM },
  watermark: { position: "absolute", right: 13 * MM, bottom: 30 * MM, height: 34 * MM, opacity: 0.09 },

  coverPage: { position: "relative", backgroundColor: "#ffffff", color: "#111111" },
  coverTitle: {
    position: "absolute", left: 18 * MM, right: 18 * MM, top: 120.9 * MM,
    textAlign: "center", fontSize: 24.7871, lineHeight: 30 / 24.7871, fontWeight: 700
  },
  coverSignature: {
    position: "absolute", left: 18 * MM, right: 18 * MM, top: 148.05 * MM,
    textAlign: "center", fontSize: 18.3313, lineHeight: 18 / 18.3313, fontWeight: 700
  },
  coverBottomLine: {
    position: "absolute", left: 18 * MM, top: 266 * MM, width: 50 * MM,
    borderTopWidth: 0.4, borderTopColor: "#111111", borderTopStyle: "solid"
  },
  coverBrand: {
    position: "absolute", left: 19.3 * MM, top: 270.55 * MM,
    fontSize: 9.4645, lineHeight: 12 / 9.4645, fontWeight: 700
  },
  coverDate: {
    position: "absolute", left: 19.3 * MM, top: 277.15 * MM,
    fontSize: 8.9664, lineHeight: 11 / 8.9664, fontWeight: 700
  }
});

function isCjkChar(ch) {
  return ch && ch.codePointAt(0) > 0x7f;
}

function splitFontRuns(text) {
  const chars = Array.from(String(text || ""));
  if (!chars.length) return [];
  const out = [];
  let current = chars[0], cjk = isCjkChar(chars[0]);
  for (let i = 1; i < chars.length; i++) {
    const next = isCjkChar(chars[i]);
    if (next === cjk) current += chars[i];
    else { out.push({ text: current, cjk }); current = chars[i]; cjk = next; }
  }
  out.push({ text: current, cjk });
  return out;
}

function mixedText(text, options = {}) {
  const {
    key = "mixed", size = 10.5, lineHeight = 1.56, bold = false,
    sans = false, color, style = {}
  } = options;
  return h(
    Text,
    { key, style: [{ fontSize: size, lineHeight, color }, style] },
    ...splitFontRuns(text).map((run, i) =>
      h(Text,{
        key: key+"-"+i,
        style: {
          fontFamily: run.cjk ? (sans ? "EverflowHei" : "EverflowSong") : (bold ? "Times-Bold" : "Times-Roman"),
          fontWeight: bold ? 700 : 400
        }
      },run.text)
    )
  );
}

function parseInlineMath(line) {
  const text = String(line || "");
  const re = /(\$[^$\n]+\$|\\\([^]*?\\\))/g;
  const parts = [];
  let last = 0, match;
  while ((match = re.exec(text))) {
    if (match.index > last) parts.push({ type: "text", value: text.slice(last, match.index) });
    const raw = match[0];
    parts.push({ type: "math", value: raw.startsWith("$") ? raw.slice(1,-1) : raw.slice(2,-2) });
    last = match.index + raw.length;
  }
  if (last < text.length) parts.push({ type: "text", value: text.slice(last) });
  return parts;
}

function NaturalMath({value,fontSize,inline=true}) {
  const element = PdfMath({ inline, height: fontSize, color: "#111111", children: value });
  const box = String(element.props.viewBox || "").trim().split(/[ ,]+/).map(Number);
  if (box.length !== 4 || !box.every(Number.isFinite)) return element;
  const scale = fontSize / 1000;
  return React.cloneElement(element,{ width: box[2] * scale, height: box[3] * scale });
}

function semanticLines(text) {
  let src = String(text || "").replace(/\r\n?/g,"\n");
  src = src.replace(/([^\n])\s+(?=(?:①|②|③|④|⑤|⑥|⑦|⑧|⑨|⑩))/g,"$1\n");
  src = src.replace(/([^\n])\s+(?=(?:\([1-9]\d*\)|（[1-9]\d*）)\s*)/g,"$1\n");
  src = src.replace(/([^\nA-Za-z0-9/])\s+(?=(?:I{1,3}|IV|V|VI{0,3})[.、．]\s*)/g,"$1\n");
  return src.split(/\n+/).map(x=>x.trim()).filter(Boolean);
}

function renderInlineLine(line,key,spec,prefix="") {
  const parts = parseInlineMath(line);
  if (!parts.some(p=>p.type==="math")) {
    return mixedText(prefix+line,{key,size:spec.fontSize,lineHeight:spec.lineHeight});
  }
  const children = [];
  if (prefix) children.push(mixedText(prefix,{key:key+"-prefix",size:spec.fontSize,lineHeight:spec.lineHeight}));
  parts.forEach((part,i)=>{
    if (part.type === "math") children.push(h(NaturalMath,{key:key+"-m-"+i,value:part.value,fontSize:spec.fontSize,inline:true}));
    else if (part.value) children.push(mixedText(part.value,{key:key+"-t-"+i,size:spec.fontSize,lineHeight:spec.lineHeight}));
  });
  return h(View,{key,style:[styles.inlineRow,{minHeight:spec.fontSize*spec.lineHeight}]},...children);
}

function contentBlocks(text) {
  const source = String(text || "");
  const re = /(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\])/g;
  const out = [];
  let last = 0,m;
  while ((m=re.exec(source))) {
    if (m.index>last) out.push({type:"text",value:source.slice(last,m.index)});
    const raw=m[0];
    out.push({type:"displayMath",value:raw.slice(2,-2)});
    last=m.index+raw.length;
  }
  if(last<source.length)out.push({type:"text",value:source.slice(last)});
  return out;
}

function renderQuestionBody(content,qIndex,spec) {
  const nodes=[];let serial=0;
  contentBlocks(content).forEach(block=>{
    if(block.type==="displayMath"){
      nodes.push(h(View,{key:"q"+qIndex+"-display-"+serial++,style:{marginVertical:.35*spec.fontSize,alignItems:"center"}},
        h(NaturalMath,{value:block.value.trim(),fontSize:spec.fontSize*1.08,inline:false})
      ));
      return;
    }
    semanticLines(block.value).forEach(line=>nodes.push(renderInlineLine(line,"q"+qIndex+"-line-"+serial++,spec)));
  });
  return nodes.length?nodes:[mixedText("（空题干）",{key:"q"+qIndex+"-empty",size:spec.fontSize,lineHeight:spec.lineHeight})];
}

function plainMeasureText(text,fontSize) {
  try {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    ctx.font = (fontSize * 96/72) + 'px "Everflow Song","Times New Roman",serif';
    return ctx.measureText(String(text||"")).width * 72/96;
  } catch {
    return Array.from(String(text||"")).reduce((n,ch)=>n+(isCjkChar(ch)?fontSize:fontSize*.55),0);
  }
}

function choiceColumns(options,spec) {
  const n=options.length;
  const lineWidth = spec.columnWidthPt - (2.25+.55)*spec.fontSize;
  let max=0;
  options.forEach((o,i)=>{max=Math.max(max,plainMeasureText("("+String.fromCharCode(65+i)+") "+String(o||""),spec.fontSize))});
  const short=max < .22*lineWidth, medium=max < .46*lineWidth;
  if(n===3)return short?3:(medium?2:1);
  if(n===4)return short?4:(medium?2:1);
  if(n===5)return medium?2:1;
  if(n===6)return short?3:(medium?2:1);
  return medium&&n>1?2:1;
}

function renderOptionCell(content,label,key,spec) {
  return h(View,{key,style:{flexDirection:"row",alignItems:"flex-start",minWidth:0}},
    mixedText(label,{key:key+"-label",size:spec.fontSize,lineHeight:spec.lineHeight,style:{width:2.25*spec.fontSize}}),
    h(View,{style:{flexGrow:1,flexShrink:1,minWidth:0}},renderInlineLine(String(content||""),key+"-body",spec))
  );
}

function renderOptions(options,qIndex,spec) {
  if(!options||!options.length)return null;
  const cols=choiceColumns(options,spec),rows=[];
  const columnGapEm=cols===4?.55:(cols===3?.8:(cols===2?1.2:0));
  const indent=(2.25+.55)*spec.fontSize;
  const rowGap=.22*spec.fontSize;
  for(let i=0;i<options.length;i+=cols){
    const cells=[];
    for(let j=0;j<cols;j++){
      const idx=i+j;
      const width=(100/cols)+"%";
      if(idx>=options.length){cells.push(h(View,{key:"blank-"+i+"-"+j,style:{width}}));continue}
      const label="("+String.fromCharCode(65+idx)+")";
      cells.push(h(View,{
        key:"q"+qIndex+"-opt-"+idx,
        style:{width,paddingRight:j===cols-1?0:columnGapEm*spec.fontSize}
      },renderOptionCell(options[idx],label,"q"+qIndex+"-optline-"+idx,spec)));
    }
    rows.push(h(View,{key:"q"+qIndex+"-row-"+i,style:[styles.optionRow,{marginBottom:i+cols<options.length?rowGap:0}]},...cells));
  }
  return h(View,{style:{marginTop:.45*spec.fontSize*spec.lineHeight,marginLeft:indent}},...rows);
}

function questionGapPt(q,spec) {
  return q.gap ? Number(q.gap)*MM : spec.gapPt;
}

function estimateUnits(text) {
  return Array.from(String(text||"").replace(/\\[A-Za-z]+/g,"x")).reduce((n,ch)=>{
    if(ch==="\n")return n+10;
    if(/\s/.test(ch))return n+.3;
    return n+(isCjkChar(ch)?1:.55);
  },0);
}

function estimateQuestionHeight(q,index,spec,prevSection) {
  const bodyWidth=Math.max(80,spec.columnWidthPt-(2.25+.55)*spec.fontSize);
  let lines=0;
  semanticLines(q.content).forEach(line=>{
    lines+=Math.max(1,Math.ceil(estimateUnits(line)*spec.fontSize/bodyWidth));
  });
  let height=Math.max(1,lines)*spec.fontSize*spec.lineHeight;
  if(q.showOptions!==false&&q.options&&q.options.length){
    const cols=choiceColumns(q.options,spec);
    const rows=Math.ceil(q.options.length/cols);
    height+=.45*spec.fontSize*spec.lineHeight + rows*spec.fontSize*spec.lineHeight + Math.max(0,rows-1)*.22*spec.fontSize;
  }
  height+=questionGapPt(q,spec);
  if(q.section&&q.section!==prevSection)height+=spec.fontSize*2.2;
  return height;
}

function renderQuestion(q,index,spec) {
  const hasOptions=q.showOptions!==false&&Array.isArray(q.options)&&q.options.length>0;
  const oversize=estimateQuestionHeight(q,index,spec,"")>spec.contentHeightPt-2*spec.fontSize*spec.lineHeight;
  return h(View,{
    key:q.id||"q-"+index,
    wrap:oversize,
    break:q.breakBefore===true,
    style:{marginBottom:questionGapPt(q,spec)}
  },
    h(View,{style:styles.questionRow},
      mixedText(String(index+1)+".",{key:"num-"+index,size:spec.fontSize,lineHeight:spec.lineHeight,style:{width:2.25*spec.fontSize,textAlign:"right",marginRight:.55*spec.fontSize}}),
      h(View,{style:styles.questionBody},...renderQuestionBody(q.content,index,spec))
    ),
    hasOptions?renderOptions(q.options,index,spec):null
  );
}

function sectionHeading(text,key,spec,breakBefore=false) {
  return h(View,{key,break:breakBefore,minPresenceAhead:spec.fontSize*spec.lineHeight*3,style:{marginBottom:.35*spec.fontSize}},
    mixedText(text,{key:key+"-text",size:spec.kind==="book"?12:spec.fontSize,lineHeight:spec.kind==="book"?1.35:spec.lineHeight,bold:true,sans:true})
  );
}

function getWatermarkDataUri() {
  try {
    const el=document.querySelector(".paper-watermark");
    if(!el)return null;
    const bg=getComputedStyle(el).backgroundImage||"";
    const match=bg.match(/url\(["']?(data:image\/png;base64,[^"')]+)["']?\)/i);
    return match?match[1]:null;
  } catch { return null; }
}

function getQrDataUri() {
  if(!qrPromise)qrPromise=QRCode.toDataURL("https://zuotiben.top/",{
    errorCorrectionLevel:"M",margin:0,width:256,color:{dark:"#111111",light:"#ffffff"}
  });
  return qrPromise;
}

function fixedAssets(assets) {
  const nodes=[];
  if(assets.watermark)nodes.push(h(Image,{fixed:true,key:"watermark",src:assets.watermark,style:styles.watermark}));
  if(assets.qr)nodes.push(h(View,{fixed:true,key:"qr-wrap",style:styles.qrWrap},
    h(Image,{src:assets.qr,style:styles.qr}),
    mixedText("zuotiben.top",{key:"qr-label",size:5.8,lineHeight:1})
  ));
  return nodes;
}

function bookHeader(state,spec) {
  if(spec.kind!=="book")return null;
  return h(View,{
    fixed:true,
    style:{
      position:"absolute",left:spec.leftMm*MM,right:spec.rightMm*MM,top:5.6*MM,height:5.3*MM,
      flexDirection:"row",alignItems:"flex-start",justifyContent:"space-between",
      borderBottomWidth:.4,borderBottomColor:"#24272b",borderBottomStyle:"solid",paddingBottom:1.2*MM
    }
  },
    mixedText("彼时流年若水",{key:"bh-l",size:10,lineHeight:1.2,bold:true}),
    mixedText(state.header||"",{key:"bh-c",size:10,lineHeight:1.2,bold:true,style:{textAlign:"center"}}),
    mixedText("https://zuotiben.top",{key:"bh-r",size:10,lineHeight:1.2,bold:true,style:{textAlign:"right"}})
  );
}

function autoFooter(spec,state) {
  if(spec.kind==="book"){
    return h(View,{fixed:true,style:{
      position:"absolute",left:spec.leftMm*MM,right:spec.rightMm*MM,bottom:4.2*MM,
      height:4.2*MM,alignItems:"center",justifyContent:"center"
    }},
      h(Text,{style:{fontFamily:"EverflowSong",fontSize:9,lineHeight:11/9,color:"#24272b"},
        render:({pageNumber,totalPages})=>"· 第 "+Math.max(1,pageNumber-1)+" 页 / 共 "+Math.max(1,totalPages-1)+" 页 ·"
      })
    );
  }
  return h(View,{fixed:true,style:{
    position:"absolute",left:spec.leftMm*MM,right:spec.rightMm*MM,bottom:spec.footSkipMm*MM,
    height:4.5*MM,alignItems:"center",justifyContent:"center"
  }},
    h(Text,{style:{fontFamily:"EverflowKai",fontSize:9,lineHeight:11/9},
      render:({pageNumber,totalPages})=>(state.title||"试卷")+"  第 "+Math.max(1,pageNumber-1)+" 页（共 "+Math.max(1,totalPages-1)+" 页）"
    })
  );
}

function staticBookFooter(pageNo,total,spec) {
  return h(View,{style:{
    position:"absolute",left:spec.leftMm*MM,right:spec.rightMm*MM,bottom:4.2*MM,
    height:4.2*MM,alignItems:"center",justifyContent:"center"
  }},mixedText("· 第 "+pageNo+" 页 / 共 "+total+" 页 ·",{key:"bf-"+pageNo,size:9,lineHeight:11/9,color:"#24272b"}));
}

function examA3Footer(pageIndex,totalLogical,spec,leftUsed,rightUsed,state) {
  const nodes=[];
  const colWidth=spec.columnWidthPt;
  if(leftUsed)nodes.push(h(View,{key:"lf",style:{
    position:"absolute",left:spec.leftMm*MM,bottom:spec.footSkipMm*MM,width:colWidth,height:4.5*MM,alignItems:"center"
  }},h(Text,{key:"lft",style:{fontFamily:"EverflowKai",fontSize:9,lineHeight:11/9}},(state.title||"试卷")+"  第 "+(pageIndex*2+1)+" 页（共 "+totalLogical+" 页）")));
  if(rightUsed)nodes.push(h(View,{key:"rf",style:{
    position:"absolute",right:spec.rightMm*MM,bottom:spec.footSkipMm*MM,width:colWidth,height:4.5*MM,alignItems:"center"
  }},h(Text,{key:"rft",style:{fontFamily:"EverflowKai",fontSize:9,lineHeight:11/9}},(state.title||"试卷")+"  第 "+(pageIndex*2+2)+" 页（共 "+totalLogical+" 页）")));
  return nodes;
}

function coverPageNode(state) {
  const title=state.coverTitle||state.title||"未命名试卷";
  const exportDate=state.exportDate||"";
  const dateColor=state.template==="exam"?"#ff0000":"#24272b";
  return h(Page,{size:"A4",style:styles.coverPage,wrap:false},
    mixedText(title,{key:"cover-title",size:state.template==="book"?21.9178:24.7871,lineHeight:30/(state.template==="book"?21.9178:24.7871),bold:true,style:[styles.coverTitle,{fontSize:state.template==="book"?21.9178:24.7871}]}),
    mixedText("·彼时流年若水·",{key:"cover-signature",size:18.3313,lineHeight:18/18.3313,bold:true,style:styles.coverSignature}),
    h(View,{key:"cover-line",style:styles.coverBottomLine}),
    mixedText("Everflow·彼时流年若水",{key:"cover-brand",size:9.4645,lineHeight:12/9.4645,bold:true,style:styles.coverBrand}),
    mixedText("> > > 更新时间："+exportDate,{key:"cover-date",size:8.9664,lineHeight:11/8.9664,bold:true,color:dateColor,style:styles.coverDate})
  );
}

function pageStyle(spec) {
  return {
    paddingTop:spec.topMm*MM,paddingRight:spec.rightMm*MM,paddingBottom:spec.bottomMm*MM,paddingLeft:spec.leftMm*MM,
    backgroundColor:"#ffffff",color:"#111111",fontSize:spec.fontSize,lineHeight:spec.lineHeight,fontFamily:"EverflowSong"
  };
}

function flowNodes(state,spec) {
  const q=Array.isArray(state.questions)?state.questions:[],nodes=[];
  let previous="";
  q.forEach((item,i)=>{
    if(item.section&&item.section!==previous){
      nodes.push(sectionHeading(item.section,"sec-"+i,spec,spec.kind==="book"&&i>0));
      previous=item.section;
    }
    nodes.push(renderQuestion(item,i,spec));
  });
  return nodes;
}

function buildBookOnePerPage(state,assets,spec) {
  const questions=Array.isArray(state.questions)?state.questions:[];
  return questions.map((q,i)=>{
    const nodes=[...fixedAssets(assets),bookHeader(state,spec),staticBookFooter(i+1,questions.length,spec)].filter(Boolean);
    if(q.section&&(i===0||questions[i-1].section!==q.section))nodes.push(sectionHeading(q.section,"sec-"+i,spec,false));
    nodes.push(renderQuestion({...q,gap:0,breakBefore:false},i,spec));
    return h(Page,{key:"bp-"+i,size:[spec.pageWidthPt,spec.pageHeightPt],style:pageStyle(spec),wrap:false},...nodes);
  });
}

function paginateA3(state,spec) {
  const questions=Array.isArray(state.questions)?state.questions:[];
  const pages=[];let page={left:[],right:[],leftH:0,rightH:0},side="left",previous="";
  const maxH=spec.contentHeightPt-10*MM;
  questions.forEach((q,i)=>{
    const hq=estimateQuestionHeight(q,i,spec,previous);
    const currentH=side==="left"?page.leftH:page.rightH;
    if(currentH>0&&currentH+hq>maxH){
      if(side==="left")side="right";
      else{pages.push(page);page={left:[],right:[],leftH:0,rightH:0};side="left"}
    }
    const entry={q,index:i,section:q.section&&q.section!==previous?q.section:""};
    if(side==="left"){page.left.push(entry);page.leftH+=hq}
    else{page.right.push(entry);page.rightH+=hq}
    previous=q.section||previous;
  });
  if(page.left.length||page.right.length)pages.push(page);
  return pages;
}

function renderA3Column(entries,spec) {
  const nodes=[];
  entries.forEach(e=>{
    if(e.section)nodes.push(sectionHeading(e.section,"a3s-"+e.index,spec,false));
    nodes.push(renderQuestion({...e.q,breakBefore:false},e.index,spec));
  });
  return nodes;
}

function buildExamA3(state,assets,spec) {
  const pages=paginateA3(state,spec);
  const totalLogical=pages.reduce((n,p)=>n+(p.left.length?1:0)+(p.right.length?1:0),0);
  return pages.map((p,pi)=>{
    const children=[...fixedAssets(assets)];
    children.push(...examA3Footer(pi,totalLogical,spec,p.left.length>0,p.right.length>0,state));
    children.push(h(View,{key:"cols",style:{flexDirection:"row",width:"100%",height:spec.contentHeightPt-10*MM}},
      h(View,{style:{width:spec.columnWidthPt,marginRight:spec.columnGapMm*MM}},...renderA3Column(p.left,spec)),
      h(View,{style:{width:spec.columnWidthPt}},...renderA3Column(p.right,spec))
    ));
    return h(Page,{key:"a3-"+pi,size:[spec.pageWidthPt,spec.pageHeightPt],style:pageStyle(spec),wrap:false},...children);
  });
}

function buildDocument(state,assets) {
  const spec=layoutSpec(state),title=state.title||"试卷";
  const pages=[coverPageNode(state)];
  if(spec.kind==="exam"&&spec.columns===2){
    pages.push(...buildExamA3(state,assets,spec));
  } else if(spec.kind==="book"&&spec.onePerPage){
    pages.push(...buildBookOnePerPage(state,assets,spec));
  } else {
    pages.push(h(Page,{key:"body",size:[spec.pageWidthPt,spec.pageHeightPt],style:pageStyle(spec),wrap:true},
      ...fixedAssets(assets),
      bookHeader(state,spec),
      autoFooter(spec,state),
      ...flowNodes(state,spec)
    ));
  }
  return h(Document,{
    title,author:"Everflow·彼时流年若水",subject:"Everflow local paper",creator:"zuotiben.top"
  },...pages);
}

export async function createPdf(state,hooks={}) {
  registerFonts();
  const {onStatus=()=>{}}=hooks;
  onStatus("正在准备原模板字体与版式…");
  const [qr,watermark]=await Promise.all([getQrDataUri(),Promise.resolve(getWatermarkDataUri())]);
  onStatus("正在按原模板生成 PDF…");
  return await pdf(buildDocument(state,{qr,watermark})).toBlob();
}

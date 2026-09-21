(function(global){
"use strict";

/*
 * Single source of truth for the browser editor.
 * Values below mirror the current fixed XeLaTeX master:
 * Everflow·彼时流年若水_TeXPage专用版_mixed-A4填写区上移版.zip
 */
var COMMON={
  questionLabelWidthEm:2.25,
  questionLabelSepEm:0.55,
  choiceLabelWidthEm:2.25,
  choiceColumnGapEm:1.2,
  choiceFourColumnThreshold:0.22,
  choiceTwoColumnThreshold:0.46,
  choiceBeforeSkipBaseline:0.45,
  choiceRowGapEm:0.22,
  keepQuestionWithChoices:true,
  oversizeQuestionPolicy:"warn-break",

  // Current XeLaTeX heading policy (00-user-config/04-question-layout.tex)
  headingKeepWithNext:true,
  headingConsecutiveGroupControl:true,
  headingMinimumFollowLines:3,
  headingFollowMode:"question",
  questionGroupNeedSpaceBaseline:10,
  partNeedSpaceBaseline:10,
  chapterNeedSpaceBaseline:8,
  sectionNeedSpaceBaseline:9,
  subsectionNeedSpaceBaseline:6,
  subsubsectionNeedSpaceBaseline:5,
  publicationUnitTitleNeedSpaceBaseline:9,
  sectionNoteNeedSpaceBaseline:4,

  // exam-zh section style: inherits body size, black-face + bold.
  sectionFontFamily:"hei",
  sectionFontWeight:700,
  sectionFontScale:1,
  sectionBeforeSkipEx:2,
  sectionAfterSkipEx:1,
  sectionNumberSeparator:"、",

  // Unified question-core list geometry.
  statementsLabelWidthEm:2.2,
  statementsLabelSepEm:0.38,
  statementsLeftMarginEm:2.58,
  statementsItemSepEm:0.15,
  statementsTopSepEm:0.30,
  romanLabelWidthEm:2.15,
  romanLabelSepEm:0.35,
  romanLeftMarginEm:2.50,
  romanItemSepEm:0.15,
  romanTopSepEm:0.30,
  subquestionLeftMarginEm:2.50,
  subquestionLabelSepEm:0.60,
  subquestionItemSepEm:0.20,
  subquestionTopSepEm:0.35
};

var EXAM={
  fontPt:9,
  baselinePt:14.04,
  lineHeight:14.04/9,
  questionGapBaseline:0.45,
  sectionForceNewPage:false,
  a3HeadingAdvance:"column",
  headerHeightPt:14,
  headerSepMm:2.5,
  footerFontPt:9,
  footerLeadingPt:11,
  footerFontFamily:"kai"
};

var BOOK={
  fontPt:10.5,
  baselinePt:16.38,
  lineHeight:16.38/10.5,
  sectionFontPt:12,
  sectionForceNewPage:true,
  headerHeightPt:25,
  headerFontPt:10,
  headerLeadingPt:12,
  headerTextRaiseMm:-3,
  headerRulePt:0.4,
  headerSepMm:3,
  footerFontPt:9,
  footerLeadingPt:11,
  footerFontFamily:"song"
};

function merge(){
  var out={},i,k;
  for(i=0;i<arguments.length;i++)for(k in arguments[i])out[k]=arguments[i][k];
  return out;
}

var GROUPS=[
  {
    id:"exam",
    label:"试卷",
    defaultMode:"a4",
    modes:[
      merge(COMMON,EXAM,{
        id:"a4",label:"A4 试卷",shortLabel:"A4",
        widthMm:210,heightMm:297,topMm:16,bottomMm:12,leftMm:20,rightMm:20,
        footSkipMm:5.3,columns:1,columnGapMm:0,onePerPage:false,mixed:false
      }),
      merge(COMMON,EXAM,{
        id:"a3",label:"A3 双栏试卷",shortLabel:"A3 双栏",
        widthMm:420,heightMm:297,topMm:14,bottomMm:11,leftMm:18,rightMm:18,
        footSkipMm:5.3,columns:2,columnGapMm:24,onePerPage:false,mixed:false
      }),
      merge(COMMON,EXAM,{
        id:"mixed",label:"A4/A3 混排试卷",shortLabel:"A4/A3 混排",
        widthMm:420,heightMm:297,topMm:14,bottomMm:11,leftMm:18,rightMm:18,
        footSkipMm:5.3,columns:2,columnGapMm:24,onePerPage:false,mixed:true,
        frontmatterWidthMm:210,frontmatterHeightMm:297
      })
    ]
  },
  {
    id:"book",
    label:"做题本",
    defaultMode:"standard",
    modes:[
      merge(COMMON,BOOK,{
        id:"compact",label:"紧凑版",shortLabel:"紧凑版",
        widthMm:210,heightMm:297,topMm:14,bottomMm:14,leftMm:18,rightMm:18,
        headSepMm:3,footSkipMm:9,onePerPage:false,questionGapBaseline:0.35
      }),
      merge(COMMON,BOOK,{
        id:"standard",label:"标准版",shortLabel:"标准版",
        widthMm:210,heightMm:297,topMm:14,bottomMm:14,leftMm:18,rightMm:18,
        headSepMm:3,footSkipMm:9,onePerPage:false,questionGapMm:25
      }),
      merge(COMMON,BOOK,{
        id:"loose",label:"宽松版",shortLabel:"宽松版",
        widthMm:210,heightMm:297,topMm:14,bottomMm:14,leftMm:18,rightMm:18,
        headSepMm:3,footSkipMm:9,onePerPage:false,questionGapMm:75
      }),
      merge(COMMON,BOOK,{
        id:"single",label:"一题一页",shortLabel:"一题一页",
        widthMm:210,heightMm:297,topMm:14,bottomMm:14,leftMm:18,rightMm:18,
        headSepMm:3,footSkipMm:9,onePerPage:true,questionGapMm:0
      }),
      merge(COMMON,BOOK,{
        id:"padl",label:"平板横版（200×150 mm）",shortLabel:"平板横版",
        widthMm:200,heightMm:150,topMm:10,bottomMm:12,leftMm:12,rightMm:12,
        headSepMm:2,footSkipMm:7,onePerPage:true,questionGapMm:0
      }),
      merge(COMMON,BOOK,{
        id:"padp",label:"平板竖版（200×250 mm）",shortLabel:"平板竖版",
        widthMm:200,heightMm:250,topMm:14,bottomMm:12,leftMm:14,rightMm:14,
        headSepMm:3,footSkipMm:8,onePerPage:true,questionGapMm:0
      })
    ]
  }
];

function group(id){return GROUPS.find(function(x){return x.id===id})||GROUPS[0]}
function mode(groupId,modeId){
  var g=group(groupId);
  return g.modes.find(function(x){return x.id===modeId})||g.modes.find(function(x){return x.id===g.defaultMode})||g.modes[0];
}
function normalize(groupId,modeId){
  var g=group(groupId==="book"?"book":"exam");
  var m=mode(g.id,modeId);
  return {group:g.id,mode:m.id};
}
function label(groupId,modeId){
  var g=group(groupId),m=mode(groupId,modeId);
  return g.label+" · "+m.label;
}
function questionGapMm(groupId,modeId){
  var m=mode(groupId,modeId);
  if(typeof m.questionGapMm==="number")return m.questionGapMm;
  if(typeof m.questionGapBaseline==="number")return m.baselinePt*m.questionGapBaseline*25.4/72;
  return 0;
}
function choiceBeforeSkipMm(groupId,modeId){
  var m=mode(groupId,modeId);
  return m.baselinePt*m.choiceBeforeSkipBaseline*25.4/72;
}

global.EverflowTemplateModes={
  groups:GROUPS,group:group,mode:mode,normalize:normalize,label:label,
  questionGapMm:questionGapMm,choiceBeforeSkipMm:choiceBeforeSkipMm,
  common:COMMON
};
})(window);

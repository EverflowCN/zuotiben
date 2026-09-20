(function(global){
"use strict";

var GROUPS=[
  {
    id:"exam",
    label:"试卷",
    defaultMode:"a4",
    modes:[
      {id:"a4",label:"A4 试卷",shortLabel:"A4",widthMm:210,heightMm:297,columns:1},
      {id:"a3",label:"A3 双栏试卷",shortLabel:"A3 双栏",widthMm:420,heightMm:297,columns:2,columnGapMm:24},
      {id:"mixed",label:"A4/A3 混排试卷",shortLabel:"A4/A3 混排",widthMm:420,heightMm:297,columns:2,columnGapMm:24,mixed:true}
    ]
  },
  {
    id:"book",
    label:"做题本",
    defaultMode:"standard",
    modes:[
      {id:"compact",label:"紧凑版",shortLabel:"紧凑版",widthMm:210,heightMm:297,onePerPage:false},
      {id:"standard",label:"标准版",shortLabel:"标准版",widthMm:210,heightMm:297,onePerPage:false},
      {id:"loose",label:"宽松版",shortLabel:"宽松版",widthMm:210,heightMm:297,onePerPage:false},
      {id:"single",label:"一题一页",shortLabel:"一题一页",widthMm:210,heightMm:297,onePerPage:true},
      {id:"padl",label:"平板横版（200×150 mm）",shortLabel:"平板横版",widthMm:200,heightMm:150,onePerPage:true},
      {id:"padp",label:"平板竖版（200×250 mm）",shortLabel:"平板竖版",widthMm:200,heightMm:250,onePerPage:true}
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

global.EverflowTemplateModes={groups:GROUPS,group:group,mode:mode,normalize:normalize,label:label};
})(window);

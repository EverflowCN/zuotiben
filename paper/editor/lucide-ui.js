/* Lucide-inspired SVG icon shapes, from Lucide open-source icon set.
 * Copyright (c) Lucide Icons and Contributors. ISC license.
 * Feather-derived glyphs remain under Cole Bemis's MIT license.
 * See ./ICONS-LICENSE.txt. No external CDN, font, requests or SVG injection.
 */
(function(){
"use strict";
var P={
 menu:['M4 6h16','M4 12h16','M4 18h16'],
 undo:['M9 14 4 9l5-5','M4 9h10a6 6 0 0 1 0 12h-2'],
 redo:['m15 14 5-5-5-5','M20 9H10a6 6 0 0 0 0 12h2'],
 save:['M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z','M17 21v-8H7v8','M7 3v5h8'],
 download:['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4','m7 10 5 5 5-5','M12 15V3'],
 printer:['M6 9V3h12v6','M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2','M6 14h12v8H6z','M18 12h.01'],
 plus:['M12 5v14','M5 12h14'],
 minus:['M5 12h14'],
 network:['M6 3v12','M18 9v12','M6 15h12','M6 6h12','M9 6v3','M15 12v3','M4 3h4v4H4z','M16 17h4v4h-4z'],
 history:['M3 12a9 9 0 1 0 3-6.7','M3 3v6h6','M12 7v5l4 2'],
 folder:['M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z'],
 list:['M8 6h13','M8 12h13','M8 18h13','M3 6h.01','M3 12h.01','M3 18h.01'],
 text:['M4 7V4h16v3','M9 20h6','M12 4v16'],
 left:['m15 18-6-6 6-6'],
 right:['m9 18 6-6-6-6'],
 maximize:['M8 3H5a2 2 0 0 0-2 2v3','M21 8V5a2 2 0 0 0-2-2h-3','M3 16v3a2 2 0 0 0 2 2h3','M16 21h3a2 2 0 0 0 2-2v-3'],
 file:['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z','M14 2v6h6','M8 13h8','M8 17h8'],
 settings:['M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8','M19.4 15a1.8 1.8 0 0 0 .36 2l-1.7 1.7a1.8 1.8 0 0 0-2-.36L14 19.2V21h-4v-1.8l-2.06-.86a1.8 1.8 0 0 0-2 .36l-1.7-1.7a1.8 1.8 0 0 0 .36-2L3.8 13H2v-2h1.8l.86-2.06a1.8 1.8 0 0 0-.36-2l1.7-1.7a1.8 1.8 0 0 0 2 .36L10 4.8V3h4v1.8l2.06.86a1.8 1.8 0 0 0 2-.36l1.7 1.7a1.8 1.8 0 0 0-.36 2L20.2 11H22v2h-1.8z']
};
function symbol(name){
  var ns="http://www.w3.org/2000/svg",svg=document.createElementNS(ns,"svg");
  svg.setAttribute("viewBox","0 0 24 24");svg.setAttribute("fill","none");
  svg.setAttribute("stroke","currentColor");svg.setAttribute("stroke-width","1.85");
  svg.setAttribute("stroke-linecap","round");svg.setAttribute("stroke-linejoin","round");
  svg.setAttribute("aria-hidden","true");svg.classList.add("ef-icon");
  for(var d of P[name]||[]){
    var path=document.createElementNS(ns,"path");path.setAttribute("d",d);svg.appendChild(path);
  }
  return svg;
}
function apply(id,name,iconOnly){
  var button=document.getElementById(id);
  if(!button||!P[name])return;
  button.classList.add("ef-icon-button");
  var svg=symbol(name);
  if(iconOnly){
    if(!button.hasAttribute("aria-label"))
      button.setAttribute("aria-label",button.getAttribute("title")||button.textContent.trim());
    button.replaceChildren(svg);
  }else button.prepend(svg);
}
var icons={
 navigatorToggleButton:["menu",true],undoButton:["undo",true],redoButton:["redo",true],
 saveProjectButton:["save",false],mobileDownloadButton:["download",false],
 newLocalPaper:["plus",false],openPaperGraph:["network",false],openLocalHistory:["history",false],
 addQuestionButton:["plus",false],sectionManageButton:["list",false],
 focusStemButton:["text",false],focusOptionsButton:["list",false],
 previewPrevPageButton:["left",true],previewNextPageButton:["right",true],
 previewZoomOutButton:["minus",true],previewZoomInButton:["plus",true],
 previewFitButton:["maximize",false],printButton:["download",false],
 browserPrintButton:["printer",false],resetOrderButton:["history",false]
};
for(var key of Object.keys(icons))apply(key,icons[key][0],icons[key][1]);
})();

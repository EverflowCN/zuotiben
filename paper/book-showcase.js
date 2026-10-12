/* Three genuine mother-template pages: cover / compact A4 / landscape PAD. */
(function(){
 "use strict";
 var stage=document.getElementById("psBooksStage");if(!stage)return;
 var cards=Array.from(stage.querySelectorAll(".ps-book-card"));
 var dots=Array.from(document.querySelectorAll("[data-book-dot]"));
 var titles=["封面展示","密集排版","单题横版"];
 var selected=0;
 function update(index,focus){
   selected=(index+cards.length)%cards.length;
   cards.forEach(function(card,i){
     var rel=(i-selected+cards.length)%cards.length;
     card.classList.toggle("is-centered",rel===0);
     card.classList.toggle("is-next",rel===1);
     card.classList.toggle("is-prev",rel===cards.length-1);
     card.setAttribute("aria-current",String(rel===0));
     card.tabIndex=rel===0?0:-1;
   });
   dots.forEach(function(dot,i){dot.setAttribute("aria-current",String(i===selected))});
   document.getElementById("psBookLabel").textContent=titles[selected];
   var badge=document.getElementById("psBookModeBadge");
   if(badge)badge.textContent=String(selected+1).padStart(2,"0")+" / 03";
   if(focus)cards[selected].focus({preventScroll:true});
 }
 cards.forEach(function(card,i){
   card.addEventListener("click",function(){update(i,false)});
   card.addEventListener("keydown",function(e){
     if(e.key==="ArrowRight"||e.key==="ArrowLeft"){
       e.preventDefault();update(selected+(e.key==="ArrowRight"?1:-1),true);
     }
   });
 });
 dots.forEach(function(dot,i){dot.addEventListener("click",function(){update(i,true)})});
 document.getElementById("psBookPrevious").addEventListener("click",function(){update(selected-1,false)});
 document.getElementById("psBookNext").addEventListener("click",function(){update(selected+1,false)});
 var down=null;
 stage.addEventListener("pointerdown",function(e){if(e.pointerType==="touch")down={x:e.clientX,y:e.clientY}});
 stage.addEventListener("pointerup",function(e){
   if(!down)return;
   var dx=e.clientX-down.x,dy=e.clientY-down.y;down=null;
   if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.4)update(selected+(dx<0?1:-1),false);
 });
 update(0,false);
})();
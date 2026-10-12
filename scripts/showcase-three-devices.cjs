const {chromium,webkit}=require('playwright');
const assert=require('node:assert/strict');
const host='http://127.0.0.1:8765';
const viewports=[
  {width:1440,height:900,label:'desktop'},
  {width:1024,height:768,label:'tablet-landscape'},
  {width:820,height:1180,label:'tablet-portrait'},
  {width:390,height:844,label:'phone'}
];
async function inspect(browser,name){
  const context=await browser.newContext({viewport:viewports[0],deviceScaleFactor:name==='webkit'?2:1,hasTouch:name==='webkit'});
  const page=await context.newPage();const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  try{
    for(const vp of viewports){
      await page.setViewportSize({width:vp.width,height:vp.height});
      await page.goto(host+'/',{waitUntil:'domcontentloaded'});
      page.on('console',m=>{if(m.type()==='error')console.log("BROWSER_CONSOLE",m.text())});
      await page.waitForTimeout(2800);
      console.log("THREE_FRAME_STATE",JSON.stringify(await page.evaluate(()=>[...document.querySelectorAll('.ps-book-template-frame')].map(f=>({src:f.src,ready:f.contentDocument?.documentElement.dataset.previewReady,status:f.contentDocument?.getElementById('previewStatus')?.textContent})))));
      await page.waitForFunction(()=>[...document.querySelectorAll('.ps-book-template-frame')].length===3
        && [...document.querySelectorAll('.ps-book-template-frame')].every(f=>f.contentDocument?.documentElement.dataset.previewReady==='true'),{timeout:33000});
      await page.locator('.ps-book-card.is-centered').waitFor();
      const m=await page.evaluate(()=>{
        const frames=[...document.querySelectorAll('.ps-book-template-frame')];
        return {
          overflow:document.documentElement.scrollWidth-window.innerWidth,
          label:document.getElementById('psBookLabel').textContent,
          badge:document.getElementById('psBookModeBadge').textContent,
          pages:frames.map(f=>{
            const d=f.contentDocument;
            const p=d.querySelector('.browser-paper-page'),paper=p.getBoundingClientRect();
            const title=d.querySelector('.browser-cover-title'),sig=d.querySelector('.browser-cover-signature');
            return {
              ready:d.documentElement.dataset.previewReady,
              frameWidth:f.clientWidth,frameHeight:f.clientHeight,
              visualWidth:paper.width,visualHeight:paper.height,
              overflowWidth:paper.right-f.clientWidth,
              overflowHeight:paper.bottom-f.clientHeight,
              zoom:getComputedStyle(p).zoom,
              textSizeAdjust:getComputedStyle(d.body).webkitTextSizeAdjust,
              paperSize:p.style.getPropertyValue('--paper-width')+'×'+p.style.getPropertyValue('--paper-height'),
              titleSigGap:title&&sig?sig.getBoundingClientRect().top-title.getBoundingClientRect().bottom:null,
              titleLines:title?title.clientHeight/parseFloat(getComputedStyle(title).lineHeight):null
            };
          })
        };
      });
      console.log(JSON.stringify({engine:name,viewport:vp.label,...m}));
      assert.equal(m.label,'封面展示');
      assert.equal(m.badge,'01 / 03');
      assert.ok(m.overflow<=3,'Page horizontal overflow '+name+' '+vp.label+': '+m.overflow);
      assert.equal(m.pages.length,3);
      for(const [i,p] of m.pages.entries()){
        assert.equal(p.ready,'true');
        assert.ok(p.visualWidth>80&&p.visualHeight>80,name+' '+vp.label+' blank page '+i);
        assert.ok(p.overflowWidth<=4,name+' '+vp.label+' paper wide overflow '+JSON.stringify(p));
        assert.ok(p.overflowHeight<=4,name+' '+vp.label+' paper tall overflow '+JSON.stringify(p));
      }
      assert.ok(m.pages[0].titleSigGap>2,name+' '+vp.label+' cover title overlaps signature '+JSON.stringify(m.pages[0]));
      assert.ok(m.pages[0].titleLines<=1.1,name+' '+vp.label+' cover title wraps '+JSON.stringify(m.pages[0]));
      if(vp.width<=980){
        const header=await page.evaluate(()=>({
          height:document.querySelector('.ps-header').getBoundingClientRect().height,
          navHidden:getComputedStyle(document.querySelector('.ps-header-links')).display==='none',
          menuVisible:getComputedStyle(document.querySelector('.ps-header-mobile-menu')).display!=='none'
        }));
        assert.ok(header.height<=76,name+' '+vp.label+' header grew into vertically wrapped text '+JSON.stringify(header));
        assert.ok(header.navHidden&&header.menuVisible,name+' '+vp.label+' menu not responsive');
        await page.locator('#psMobileMenu summary').click();
        assert.equal(await page.locator('#psMobileMenu').evaluate(e=>e.open),true);
        assert.equal(await page.locator('.ps-mobile-nav-popover a').count(),4);
        await page.locator('#psMobileMenu summary').click();
      }else{
        assert.equal(await page.locator('#psMobileMenu').isVisible(),false);
      }
      await page.screenshot({path:'test-results/showcase-'+name+'-'+vp.label+'.png',fullPage:false});
    }
    assert.deepEqual(errors,[],name+' console errors '+errors.join(' | '));
  }finally{await context.close()}
}
(async()=>{
  for(const [name,engine] of [['chromium',chromium],['webkit',webkit]]){
    const browser=await engine.launch({headless:true,args:name==='chromium'?['--no-sandbox']:[]});
    try{await inspect(browser,name)}finally{await browser.close()}
  }
  console.log('PASS native template showcase: desktop, iPad landscape, iPad portrait, mobile Chromium and WebKit. No overlap or paper clipping.');
})().catch(e=>{console.error(e);process.exit(1)});

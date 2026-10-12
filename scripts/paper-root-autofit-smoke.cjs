const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  const exceptions=[];page.on('pageerror',e=>exceptions.push(e.message));
  const origin='http://127.0.0.1:8765';
  await page.goto(origin+'/',{waitUntil:'domcontentloaded'});
  await page.locator('#psBooksStage .ps-book-card').first().waitFor({timeout:15000});
  assert.equal(await page.title(),'彼时流年若水做题本 · 免费开源本地组卷 | Everflow');
  assert.equal(await page.locator('.ps-book-card').count(),3);
  assert.equal(await page.locator('.ps-book-card[aria-current="true"]').count(),1);
  assert.equal(new URL(await page.locator('.ps-header-cta').getAttribute('href'),origin).pathname,'/library/');
  assert.equal(new URL(await page.locator('#startBlankButton').evaluate(e=>document.baseURI)).pathname,'/paper/');
  await page.locator('#psBookNext').click();
  assert.ok((await page.locator('#psBookLabel').innerText()).includes('标准试卷'));
  await page.locator('[data-book-dot="2"]').click();
  assert.ok((await page.locator('#psBookLabel').innerText()).includes('单题留空'));
  await page.locator('.ps-book-card.is-centered').press('ArrowRight');
  assert.ok((await page.locator('#psBookLabel').innerText()).includes('母版封面'));
  await page.screenshot({path:'test-results/home-book-showcase-desktop.png',fullPage:false});
  await page.locator('#startBlankButton').click();
  await page.waitForURL('**/paper/editor/',{timeout:17000});
  await page.locator('#orderList .order-item').first().waitFor({timeout:12000});
  await page.waitForFunction(()=>getComputedStyle(document.getElementById('previewPane')).display!=='none',{timeout:12000});
  // Preview page itself stays physical, while the visual zoom tracks available pane width.
  await page.waitForFunction(()=>document.getElementById('typstPreview').clientWidth>0,{timeout:12000});
  await page.waitForFunction(()=>document.getElementById('typstPreview').style.getPropertyValue('--browser-preview-scale')!=='',{timeout:12000});
  const before=await page.evaluate(()=>({
    fit:document.getElementById('typstPreview').style.getPropertyValue('--browser-preview-scale'),
    width:document.getElementById('previewPane').getBoundingClientRect().width
  }));
  const splitter=await page.locator('#previewResizer').boundingBox();
  assert.ok(splitter);
  const y=Math.min(splitter.y+150,splitter.y+splitter.height-50);
  await page.mouse.move(splitter.x+splitter.width/2,y);
  await page.mouse.down();await page.mouse.move(splitter.x+splitter.width/2+150,y,{steps:12});await page.mouse.up();
  await sleep(500);
  const after=await page.evaluate(()=>({
    fit:document.getElementById('typstPreview').style.getPropertyValue('--browser-preview-scale'),
    width:document.getElementById('previewPane').getBoundingClientRect().width,
    paneSize:document.getElementById('previewPane').dataset.paneSize
  }));
  assert.ok(after.width<before.width-80,JSON.stringify({before,after}));
  assert.ok(parseFloat(after.fit)<parseFloat(before.fit),JSON.stringify({before,after}));
  assert.ok(after.paneSize,'ResizeObserver did not set panel flags');
  assert.equal(await page.locator('#showAnswersToggle').isVisible(),true);
  assert.equal(await page.locator('#showExplanationsToggle').isVisible(),true);
  // Compact editor content, dropdown, checkbox tools and navigation remain accessible.
  await page.locator('#questionNavPickerButton').click();
  assert.equal(await page.locator('#questionNavPopover').isVisible(),true);
  let menu=await page.locator('#questionNavPopover').boundingBox();
  let pane=await page.locator('#editPane').boundingBox();
  assert.ok(menu.width<pane.width+25,'dropdown escapes panel');
  await page.screenshot({path:'test-results/editor-responsive-split.png',fullPage:false});
  const lib=await browser.newPage();
  await lib.goto(origin+'/library/',{waitUntil:'domcontentloaded'});
  assert.ok((await lib.title()).includes('研库'));
  await lib.close();
  await page.setViewportSize({width:390,height:844});
  await page.goto(origin+'/',{waitUntil:'domcontentloaded'});
  await page.locator('#psBooksStage').waitFor();
  await sleep(200);
  const overflow=await page.evaluate(()=>({doc:document.documentElement.scrollWidth,view:window.innerWidth}));
  assert.ok(overflow.doc<=overflow.view+3,'mobile root horizontal overflow '+JSON.stringify(overflow));
  await page.screenshot({path:'test-results/home-book-showcase-mobile.png',fullPage:false});
  assert.deepEqual(exceptions,[],'Uncaught JS: '+exceptions.join('; '));
  console.log('PASS: domain homepage, archived old 研库, 3D book carousel, root draft -> editor navigation, adaptive preview & dropdown, mobile');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
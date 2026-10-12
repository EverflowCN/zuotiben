const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:1366,height:900}});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  const data={
   version:2,type:'everflow-local-paper',title:'交互回归测试',template:'exam',layout:'a4',
   questions:[
    {id:'a1',content:'计算 $1+1$。',section:'一、选择题',type:'选择题',options:['1','2','3','4'],showOptions:true},
    {id:'a2',content:'计算 $2+2$。',section:'一、选择题',type:'选择题',options:['3','4','5','6'],showOptions:true},
    {id:'a3',content:'计算 $\\int_0^1x\\,dx$。',section:'二、填空题',type:'填空题',options:[],showOptions:false},
    {id:'a4',content:'计算 $\\det A$。',section:'三、解答题',type:'解答题',options:[],showOptions:false}
   ]
  };
  await page.addInitScript(d=>localStorage.setItem('zuotiben-local-paper-v1',JSON.stringify(d)),data);
  await page.goto('http://127.0.0.1:8765/paper/editor/',{waitUntil:'domcontentloaded'});
  await page.locator('#orderList .order-item').first().waitFor({timeout:15000});
  assert.equal(await page.locator('#orderList .order-item').count(),4);
  await page.locator('#orderList .order-item').nth(1).locator('.order-check').check();
  assert.equal(await page.locator('#batchCount').innerText(),'1');
  assert.equal(await page.locator('#questionNavCounter').innerText(),'1 / 4');
  await page.locator('#orderList .order-item').nth(2).locator('.order-copy').click();
  assert.equal(await page.locator('#questionNavCounter').innerText(),'3 / 4');
  assert.equal(await page.locator('#batchCount').innerText(),'1');
  await page.locator('#selectChapterButton').click();
  assert.equal(await page.locator('#batchCount').innerText(),'2');
  await page.locator('#selectAllQuestionsButton').click();
  assert.equal(await page.locator('#batchCount').innerText(),'4');
  await page.locator('#clearQuestionSelectionButton').click();
  assert.equal(await page.locator('#batchBar').isVisible(),false);
  await page.locator('#nextQuestionButton').click();
  assert.equal(await page.locator('#questionNavCounter').innerText(),'4 / 4');
  await page.locator('#prevQuestionButton').click();
  assert.equal(await page.locator('#questionNavCounter').innerText(),'3 / 4');
  await page.locator('#questionNavPickerButton').click();
  assert.equal(await page.locator('#questionNavPopover').isVisible(),true);
  await page.locator('#questionNavMenu .question-nav-option').nth(0).click();
  assert.equal(await page.locator('#questionNavCounter').innerText(),'1 / 4');
  const orig=await page.locator('#navigatorPanel').boundingBox();
  const split=await page.locator('#navigatorResizer').boundingBox();
  assert.ok(orig&&split,'desktop splitter absent');
  await page.mouse.move(split.x+split.width/2,split.y+150);
  await page.mouse.down();await page.mouse.move(split.x+split.width/2+80,split.y+150,{steps:8});await page.mouse.up();
  const wider=await page.locator('#navigatorPanel').boundingBox();
  const geometryDebug=await page.evaluate(()=>({
    navStyle:document.documentElement.style.getPropertyValue('--navigator-w'),
    editorStyle:document.documentElement.style.getPropertyValue('--editor-w'),
    grid:getComputedStyle(document.getElementById('workbench')).gridTemplateColumns,
    navComputed:getComputedStyle(document.getElementById('navigatorPanel')).position,
    source:document.elementFromPoint(0,0)?.id
  }));
  console.log('SPLITTER_DIAG',JSON.stringify({original:orig.width,updated:wider.width,geometryDebug}));
  assert.ok(wider.width>orig.width+35,'navigator splitter not draggable '+orig.width+' -> '+wider.width);
  const paneBefore=await page.locator('#editPane').boundingBox();
  const center=await page.locator('#previewResizer').boundingBox();
  await page.mouse.move(center.x+center.width/2,center.y+130);
  await page.mouse.down();await page.mouse.move(center.x+center.width/2-55,center.y+130,{steps:7});await page.mouse.up();
  const paneAfter=await page.locator('#editPane').boundingBox();
  assert.ok(paneAfter.width<paneBefore.width-20,'middle-right drag did not resize '+paneBefore.width+' -> '+paneAfter.width);
  const beforeHide=await page.locator('#previewPane').boundingBox();
  await page.locator('#navigatorToggleButton').click();
  assert.equal(await page.locator('#navigatorPanel').isVisible(),false);
  assert.equal(await page.locator('#navigatorToggleButton').getAttribute('aria-expanded'),'false');
  const afterHide=await page.locator('#previewPane').boundingBox();
  assert.ok(afterHide.width>beforeHide.width+80,'collapsing left did not free preview space');
  await page.locator('#navigatorToggleButton').click();
  assert.equal(await page.locator('#navigatorPanel').isVisible(),true);
  assert.equal(await page.locator('#mobileDownloadButton').isVisible(),false);
  assert.equal(await page.locator('#printButton').isVisible(),true);
  await page.locator('#editorGuideButton').click();
  assert.equal(await page.locator('#editorGuideDialog').isVisible(),true);
  assert.equal(await page.locator('.editor-guide-body article').count(),4);
  await page.locator('#finishEditorGuideButton').click();
  assert.equal(await page.locator('#editorGuideDialog').isVisible(),false);
  await page.screenshot({path:'test-results/editor-interaction-desktop.png',fullPage:false});
  await page.setViewportSize({width:834,height:1000});
  await wait(350);
  const t1=await page.locator('#editPane').boundingBox(),t2=await page.locator('#previewPane').boundingBox();
  assert.ok(t1.width>=320,'tablet editor squeezed '+t1.width);
  assert.ok(t2.width>=360,'tablet preview squeezed '+t2.width);
  await page.setViewportSize({width:393,height:852});
  await wait(350);
  assert.equal(await page.locator('#mobileDownloadButton').isVisible(),true);
  assert.equal(await page.locator('#printButton').isVisible(),false);
  await page.locator('#navigatorToggleButton').click();
  assert.equal(await page.locator('body').evaluate(el=>el.classList.contains('navigator-open')),true);
  await page.screenshot({path:'test-results/editor-interaction-mobile.png',fullPage:false});
  assert.deepEqual(errors,[],'page errors: '+errors.join('; '));
  console.log('PASS draggable 3-pane, collapsed mode, batch and chapter selection, prev/next picker, guide, one download and tablet/mobile layouts');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
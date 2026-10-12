const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:920},acceptDownloads:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const origin='http://127.0.0.1:8765';
  await page.goto(origin+'/paper/',{waitUntil:'domcontentloaded'});
  assert.ok((await page.title()).includes('彼时流年若水'));
  // Homepage hero must be the actual Everflow mother COVER (not a question page).
  const cover=page.locator('.ps-paper-demo.ps-master-cover');
  await cover.waitFor();
  assert.equal(await cover.locator('.ps-q').count(),0,'homepage must not display sample questions as the cover');
  const metrics=await cover.evaluate(el=>{
    const r=el.getBoundingClientRect();
    const pos=sel=>{const p=el.querySelector(sel).getBoundingClientRect();return (p.y-r.y)/r.height};
    return {ratio:r.height/r.width,titleY:pos('.ps-master-title'),signatureY:pos('.ps-master-signature'),ruleY:pos('.ps-master-rule'),dateY:pos('.ps-master-date')};
  });
  assert.ok(Math.abs(metrics.ratio-297/210)<.02,'A4 physical aspect ratio: '+JSON.stringify(metrics));
  assert.ok(Math.abs(metrics.titleY-120.9/297)<.025,'cover title geometry');
  assert.ok(Math.abs(metrics.signatureY-148.05/297)<.025,'cover signature geometry');
  assert.ok(Math.abs(metrics.ruleY-266/297)<.025,'cover foot rule geometry');
  assert.ok(Math.abs(metrics.dateY-277.15/297)<.025,'cover red-date geometry');
  assert.ok((await page.locator('#psCoverDate').textContent()).includes('更新时间：'));
  for(const width of [820,390]){
    await page.setViewportSize({width,height:1080});
    assert.equal(await cover.isVisible(),true,'cover hidden at width '+width);
    const box=await cover.boundingBox();
    assert.ok(box.width>200&&box.width<=width,'cover width broken at '+width+': '+JSON.stringify(box));
  }
  await page.setViewportSize({width:1440,height:920});
  await page.locator('#copyPromptButton').click();
  assert.equal(await page.locator('#aiPromptModal').isVisible(),true);
  assert.equal(await page.locator('.ai-copy').count(),2);
  await page.locator('#aiPromptClose').click();
  assert.equal(await page.locator('#aiPromptModal').isVisible(),false);
  await page.locator('#pasteMarkdown').fill("# 数学二甲卷\n\n## 一、选择题\n\n### 1\n设函数 $f(x)=x^2$，则 $f'(1)=$（　）。\nA. $0$\nB. $1$\nC. $2$\nD. $4$\n答案：C\n解析：求导得 $f'(x)=2x$。\n\n## 二、填空题\n\n### 2\n设 $\\int_0^1 x\\,dx=$ ________。\n答案：$\\frac12$\n解析：原函数为 $\\frac12 x^2$。");
  await Promise.all([page.waitForURL(/\/paper\/editor\/?$/),page.locator('#pasteImportButton').click()]);
  await page.waitForSelector('#localPaperList .workspace-paper',{timeout:25000});
  assert.ok((await page.locator('#paperName').innerText()).includes('数学二甲卷'));
  assert.equal(await page.locator('#orderList .order-item').count(),2);
  assert.equal(await page.locator('#showAnswersToggle').isChecked(),false);
  assert.equal(await page.locator('#showExplanationsToggle').isChecked(),false);
  await page.locator('#showAnswersToggle').check();
  await page.waitForFunction(()=>document.querySelector('#typstPreview .paper-inline-solution')!==null,{timeout:40000});
  await page.locator('#showExplanationsToggle').check();
  await page.waitForFunction(()=>document.querySelector('#typstPreview .paper-inline-solution')?.textContent.includes('解析'),{timeout:40000});
  await page.locator('#openLocalHistory').click();
  assert.equal(await page.locator('#workspaceDialog').isVisible(),true);
  await page.locator('#workspaceDialogClose').click();
  await page.locator('#openPaperGraph').click();
  assert.ok((await page.locator('.workspace-graph-row').count())>=2);
  await page.locator('.workspace-graph-row input').first().check();
  await page.locator('.workspace-graph-actions select').selectOption('current');
  await page.locator('.workspace-graph-actions button').click();
  assert.equal(await page.locator('#orderList .order-item').count(),3);
  await page.locator('#newLocalPaper').click();
  await page.waitForFunction(()=>document.querySelectorAll('#localPaperList .workspace-paper').length>=2,{timeout:20000});
  assert.ok((await page.locator('#paperName').innerText()).includes('新试卷'));
  await page.locator('#localPaperList .workspace-paper').nth(1).click();
  await page.waitForFunction(()=>document.querySelector('#paperName')?.textContent.includes('数学二甲卷'),{timeout:25000});
  assert.ok((await page.locator('#orderList .order-item').count())>=2);
  await page.goto(origin+'/checkin/',{waitUntil:'domcontentloaded'});
  assert.equal(await page.locator('#total').innerText(),'0');
  await page.locator('#check').click();
  assert.equal(await page.locator('#total').innerText(),'1');
  await page.reload();
  assert.equal(await page.locator('#total').innerText(),'1');
  assert.deepEqual(errors,[],"JS errors: "+errors.join(' / '));
  console.log('PASS: AI chooser, pasted Markdown, folder archive, answers/analysis, graph, history and checkin');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
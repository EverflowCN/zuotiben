
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  const origin='http://127.0.0.1:8765',ctx=await browser.newContext({viewport:{width:1440,height:900},permissions:['clipboard-read','clipboard-write']});
  const page=await ctx.newPage(),errs=[];
  page.on('pageerror',e=>errs.push(e.message));
  await page.goto(origin+'/paper/',{waitUntil:'domcontentloaded'});
  await page.locator('.ps-flow-card').first().waitFor();
  assert.equal(await page.locator('.ps-flow-card').count(),4);
  assert.equal(new URL(await page.locator('.ps-flow-card a[href*=doubao]').getAttribute('href')).hostname,'www.doubao.com');
  assert.ok((await page.locator('.ps-flow-tip').innerText()).includes('A4'));
  assert.ok((await page.locator('.ps-flow-tip').innerText()).includes('A3'));
  await page.locator('#quickCopyRulesButton').click();
  const rule=await page.evaluate(()=>navigator.clipboard.readText());
  assert.ok(rule.includes('## 一、选择题'));
  assert.ok(rule.includes('LaTeX'));
  assert.ok(rule.includes('Markdown'));
  await page.evaluate(async text=>navigator.clipboard.writeText(text),"```markdown\n# AI转录数学二\n\n## 一、选择题\n\n### 1\n求 $\\lim_{x\\to0}\\frac{\\sin 3x}{x}$ 的值。\nA. 0\nB. 1\nC. 3\nD. 不存在\n答案：C\n解析：等价无穷小。\n```");
  await page.locator('#quickPasteClipboardButton').click();
  await page.waitForURL(/\/paper\/editor\/?$/, {timeout:25000});
  await page.waitForSelector('#orderList .order-item',{timeout:15000});
  assert.equal(await page.locator('#orderList .order-item').count(),1);
  const q=JSON.parse(await page.evaluate(()=>localStorage.getItem('zuotiben-local-paper-v1'))).questions[0];
  assert.equal(q.options.length,4);
  assert.equal(q.answer,'C');
  assert.ok(q.content.includes(String.raw`\lim_{x\to0}`));
  await page.goto(origin+'/paper/',{waitUntil:'domcontentloaded'});
  await page.setViewportSize({width:393,height:852});
  const bad=await page.evaluate(()=>({doc:document.documentElement.scrollWidth,view:window.innerWidth}));
  assert.ok(bad.doc<=bad.view+3,'phone horizontal overflow '+JSON.stringify(bad));
  await page.screenshot({path:'test-results/quick-flow-mobile.png',fullPage:true});
  await page.setViewportSize({width:1440,height:900});
  await page.screenshot({path:'test-results/quick-flow-desktop.png',fullPage:true});
  assert.deepEqual(errs,[],'Page errors '+errs.join(' | '));
  console.log('PASS: four-step visual guide, Doubao link, A4 advisory, prompt copy, fenced Markdown clipboard one-click import, mobile layout');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});

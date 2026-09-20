const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try {
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{if(!localStorage.getItem('zuotiben-local-paper-v1'))localStorage.setItem('zuotiben-local-paper-v1',JSON.stringify({title:'编辑器验证试卷',questions:[{id:'a',content:'设函数 $f(x)=x^2$，求导数。',options:['$x$','$2x$']},{id:'b',content:'设矩阵 $A=\\begin{bmatrix}1&2\\\\3&4\\end{bmatrix}$，求：\n(1) 求 $\\det A$；\n(2) 求 $A^{-1}$。',options:[]}]}))});
 await page.goto('http://127.0.0.1:8765/paper/editor/',{waitUntil:'domcontentloaded',timeout:120000});
 await page.locator('#questionEditor textarea').fill('修改后的题干 $x^2$');
 assert.match(await page.locator('#paperQuestions').innerText(),/修改后的题干/);
 await page.locator('#templateButton').click();await page.locator('#headerInput').fill('数学练习');
 await page.locator('#previewModeButton').click();assert.equal(await page.locator('.editor-sidebar').isVisible(),false);
 assert.equal(await page.locator('.editor-topbar').isVisible(),true);
 await page.locator('#editModeButton').click();assert.equal(await page.locator('.editor-sidebar').isVisible(),true);
 await page.reload({waitUntil:'domcontentloaded'});assert.equal(await page.locator('#headerInput').inputValue(),'数学练习');
 await page.locator('#compileButton').click();
 await page.waitForFunction(()=>!document.querySelector('#compileButton').disabled,{},{timeout:240000});
 assert.match(await page.locator('#pdfStatus').innerText(),/PDF 已生成/);
 assert.equal(await page.locator('#pdfPreview').isVisible(),true);
 const dl=page.waitForEvent('download');await page.locator('#printButton').click();const download=await dl;await download.saveAs('test-results/editor.pdf');
 assert.equal(fs.readFileSync('test-results/editor.pdf').subarray(0,5).toString(),'%PDF-');
 await page.locator('#editModeButton').click();await page.screenshot({path:'test-results/editor-desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'test-results/editor-mobile.png',fullPage:true});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 assert.deepEqual(errors,[]);console.log('PASS: edit, persistence, mode switch, compile, PDF download, mobile width');
 } finally {await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});

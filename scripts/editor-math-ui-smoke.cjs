
const { chromium }=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:1366,height:820}});
  const failures=[];page.on('pageerror',e=>failures.push(e.message));
  const question={
   id:'math-safe-case-1',type:'选择题',section:'一、选择题',showOptions:true,
   content:"设 $f(x)=x^2$，求 $f'(1)$ 的值。",
   options:['1','2','3','4'],
   explanation:"构造函数 \\(g(x)=\\mathrm{e}^{-x} f(x)\\)，则 \\(\\int_0^1 g(x)\\mathrm{d}x\\geq\\left[\\int_0^1 g(x)\\mathrm{d}x\\)。\n下一步：\\(h(x)=\\frac{1}{2}x^2\\)，即 \\(h(1)=\\frac12\\)。\n被转义的宏 \\\\mathrm{e}^{-x} 对应指数函数。",
   answer:"$f'(1)=2$"
  };
  await page.addInitScript(q=>{
    localStorage.setItem('zuotiben-local-paper-v1',JSON.stringify({
      version:2,type:'everflow-local-paper',localOnly:true,
      title:'公式和解析健壮性检测',coverTitle:'公式和解析健壮性检测',
      template:'exam',layout:'a4',questions:[q],originalIds:[q.id]
    }));
    localStorage.removeItem('everflow-active-paper-id-v1');
  },question);
  await page.goto('http://127.0.0.1:8765/paper/editor/',{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#orderList .order-item',{timeout:15000});
  await page.locator('#showExplanationsToggle').check();
  await page.waitForFunction(()=>document.querySelector('#typstPreview')?.dataset.layoutReady==='true',{timeout:65000});
  const rendered=await page.locator('#typstPreview .paper-inline-solution').innerText();
  assert.ok(rendered.includes('构造函数'),'explanation missing');
  assert.ok(!/ParseError|Unexpected character|Expected.*right/i.test(rendered),'parser error printed into the PDF: '+rendered);
  const formulaCount=await page.locator('#typstPreview .math-safe-rendered').count();
  assert.ok(formulaCount>0,'LaTeX had no MathML, count='+formulaCount);
  const original=await page.evaluate(()=>JSON.parse(localStorage.getItem('zuotiben-local-paper-v1')).questions[0].explanation);
  assert.equal(original,question.explanation,'defensive display rewrote source LaTeX');
  const colors=await page.locator('.order-item.is-selected').evaluate(el=>{
    const st=getComputedStyle(el);return {borderLeft:st.borderLeftColor,shadow:st.boxShadow};
  });
  assert.ok(colors.shadow==='none'||!colors.shadow.includes('inset'),'selection still has colored inset bar');
  assert.equal(await page.locator('#browserPrintButton').isVisible(),true,'system print control should be visible');
  assert.ok(await page.locator('#printButton .ef-icon').count()===1,'download SVG icon missing');
  assert.equal(await page.locator('#textPdfButton').isVisible(),false,'experimental text PDF should stay hidden');
  const topbar=await page.locator('.texpage-topbar').evaluate(el=>getComputedStyle(el).backgroundColor);
  assert.ok(topbar.includes('252, 253, 251')||topbar.includes('255, 255, 255'),'top bar not restyled: '+topbar);
  await page.screenshot({path:'test-results/editor-math-ui-desktop.png',fullPage:false});
  for(const size of [{width:1024,height:768},{width:390,height:844}]){
    await page.setViewportSize(size);
    if(size.width===390)await page.locator('#previewModeButton').click();
    await page.screenshot({path:'test-results/editor-math-ui-'+size.width+'.png',fullPage:false});
    assert.equal(await page.locator(size.width===390?'#mobileDownloadButton':'#printButton').isVisible(),true);
    assert.equal(await page.locator(size.width===390?'#mobileTextDownloadButton':'#textPdfButton').isVisible(),false);
    assert.equal(await page.locator(size.width===390?'#mobileSystemPrintButton':'#browserPrintButton').isVisible(),true);
  }
  assert.deepEqual(failures,[],'browser errors: '+failures.join('; '));
  console.log('PASS safe math rendering + no ParseError + unchanged source + neutral selection + free icons');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exit(1)});

const playwright=require('playwright');
const browserName=process.env.BROWSER||'chromium';
const browserType=playwright[browserName];
const assert=require('node:assert/strict');
const fs=require('node:fs');

async function waitForBrowserLayout(page, timeout=120000){
  await page.waitForFunction(()=>{
    const sheet=document.querySelector('#typstPreview .browser-paper-page');
    const status=document.querySelector('#pdfStatus')?.textContent||'';
    return !!sheet && /分页已完成/.test(status) || /失败|异常|Error|error/i.test(status);
  },null,{timeout});
  const status=await page.locator('#pdfStatus').innerText().catch(()=> '');
  const count=await page.locator('#typstPreview .browser-paper-page').count();
  if(!count)throw new Error('Browser layout preview failed: '+status);
  return status;
}


(async()=>{
  if(!browserType)throw new Error('Unsupported browser: '+browserName);
  const browser=await browserType.launch(browserName==='chromium'?{headless:true,args:['--no-sandbox']}:{headless:true});
  try{
    const page=await browser.newPage({viewport:{width:1440,height:1000},acceptDownloads:true});
    const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('console',m=>{if(m.type()==='error')console.log('BROWSER:',m.text())});

    await page.addInitScript(()=>{
      window.__PRINT_CALLED__=0;
      window.print=()=>{window.__PRINT_CALLED__+=1;window.dispatchEvent(new Event('afterprint'))};
      if(!localStorage.getItem('zuotiben-local-paper-v1')){
        localStorage.setItem('zuotiben-local-paper-v1',JSON.stringify({
        title:'编辑器验证试卷',
        coverTitle:'编辑器验证试卷',
        template:'exam',
        layout:'a4',
        questions:[
          {
            id:'a',
            section:'一、选择题',
            content:'设函数 $f(x)=x^2$，求导数。 ① 函数连续 ② 函数可导',
            options:['$x$','$2x$','$x^2$','$2$'],
            showOptions:true
          },
          {
            id:'b',
            section:'二、解答题',
            content:'设矩阵 $A=\\begin{bmatrix}1&2\\\\3&4\\end{bmatrix}$，求：\n(1) 求 $\\det A$；\n(2) 求 $A^{-1}$。\nI. 说明条件\nII. 给出结论',
            options:[],
            showOptions:false
          }
        ]
        }));
      }
    });

    await page.goto('http://127.0.0.1:8765/paper/editor/',{
      waitUntil:'domcontentloaded',
      timeout:120000
    });

    // Desktop = TeXPage-style three surfaces visible together.
    assert.equal(await page.locator('.texpage-navigator').isVisible(),true);
    assert.equal(await page.locator('.texpage-editor-pane').isVisible(),true);
    assert.equal(await page.locator('.texpage-preview-pane').isVisible(),true);

    await page.locator('#questionEditor textarea').fill('修改后的题干 $x^2$');
    assert.match(await page.locator('#activeQuestionLabel').innerText(),/第 1 题/);
    const firstTypstStatus=await waitForBrowserLayout(page);
    assert.match(firstTypstStatus,/分页已完成/);
    assert.ok((await page.locator('#typstPreview > section.typst-page').count())>=1);
    assert.notEqual(await page.locator('#previewPageIndicator').innerText(),'— / —');

    // Cross-browser smoke uses Book standard; physical dimensions are verified in a separate fast CI.
    await page.locator('#templateButton').click();
    await page.locator('.template-option').filter({hasText:'标准版'}).click();
    await page.waitForFunction(()=>document.body.dataset.template==='book'&&document.body.dataset.layout==='standard',{},{timeout:30000});
    await waitForBrowserLayout(page);

    // Structure/settings act like the left project panel.
    await page.locator('#settingsTabButton').click();
    assert.equal(await page.locator('#settingsPanel').isVisible(),true);
    assert.equal(await page.locator('body').getAttribute('data-template'),'book');
    assert.equal(await page.locator('body').getAttribute('data-layout'),'standard');
    await page.locator('#headerInput').fill('数学练习');

    // Preview controls.
    await page.locator('#previewZoomInButton').click();
    assert.notEqual(await page.locator('#previewZoomLabel').innerText(),'适宽');
    await page.locator('#previewFitButton').click();
    assert.equal(await page.locator('#previewZoomLabel').innerText(),'适宽');
    await page.locator('#browserPrintButton').click();
    await page.waitForFunction(()=>window.__PRINT_CALLED__===1);
    await page.screenshot({path:'test-results/editor-desktop-texpage.png',fullPage:true});

    // Navigator collapse on wide desktop.
    await page.locator('#navigatorToggleButton').click();
    assert.equal(await page.locator('body').evaluate(el=>el.classList.contains('navigator-collapsed')),true);
    await page.locator('#navigatorToggleButton').click();

    // Persistence + PDF download.
    await page.reload({waitUntil:'domcontentloaded'});
    await page.locator('#settingsTabButton').click();
    assert.equal(await page.locator('#headerInput').inputValue(),'数学练习');

    // The PDF action must use the exact preview DOM and not the separate React PDF renderer.
    assert.equal(await page.locator('#printButton').isVisible(),false);
    await waitForBrowserLayout(page);
    const previewMarkup=await page.locator('#typstPreview').innerHTML();
    await page.locator('#browserPrintButton').click();
    await page.waitForFunction(()=>window.__PRINT_CALLED__===1);
    assert.equal(await page.locator('#typstPreview').innerHTML(),previewMarkup,'Print changed the already-paginated preview');

    // Chromium's print-to-PDF from that same DOM verifies actual PDF bytes.
    if(browserName==='chromium'){
      await page.evaluate(()=>document.body.classList.add('browser-print-active'));
      await page.pdf({path:'test-results/editor.pdf',printBackground:true,preferCSSPageSize:true});
      await page.evaluate(()=>document.body.classList.remove('browser-print-active'));
      assert.equal(fs.readFileSync('test-results/editor.pdf').subarray(0,5).toString(),'%PDF-');
    }

    // Tablet: navigator becomes drawer; editor and preview stay split.
    await page.setViewportSize({width:834,height:1112});
    await page.waitForTimeout(180);
    await waitForBrowserLayout(page);
    assert.equal(await page.locator('.texpage-editor-pane').isVisible(),true);
    assert.equal(await page.locator('.texpage-preview-pane').isVisible(),true);
    await page.locator('#navigatorToggleButton').click();
    assert.equal(await page.locator('body').evaluate(el=>el.classList.contains('navigator-open')),true);
    await page.locator('#workbenchBackdrop').click({position:{x:790,y:500}});
    assert.equal(await page.locator('body').evaluate(el=>el.classList.contains('navigator-open')),false);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    const tabletEditorWidth=await page.locator('.texpage-editor-pane').evaluate(el=>el.getBoundingClientRect().width);
    const tabletPreviewWidth=await page.locator('.texpage-preview-pane').evaluate(el=>el.getBoundingClientRect().width);
    assert.ok(tabletEditorWidth>=320);
    assert.ok(tabletPreviewWidth>=360);
    await page.screenshot({path:'test-results/editor-tablet-texpage.png',fullPage:true});

    // Phone: one surface at a time + navigator drawer.
    await page.setViewportSize({width:390,height:844});
    await page.waitForTimeout(180);
    assert.equal(await page.locator('.texpage-editor-pane').isVisible(),true);
    assert.equal(await page.locator('.texpage-preview-pane').isVisible(),false);
    assert.equal(await page.locator('#mobileDownloadButton').isVisible(),true);
    assert.equal(await page.locator('#previewModeButton').isVisible(),true);
    const actionRects=await page.locator('.texpage-topbar .editor-top-actions').evaluate(el=>{const p=el.getBoundingClientRect();return {left:p.left,right:p.right,scrollWidth:el.scrollWidth,width:el.clientWidth}});
    assert.ok(actionRects.right<=393&&actionRects.left>=0&&actionRects.scrollWidth<=actionRects.width+2,'mobile topbar overflows '+JSON.stringify(actionRects));

    await page.locator('#navigatorToggleButton').click();
    assert.equal(await page.locator('body').evaluate(el=>el.classList.contains('navigator-open')),true);
    await page.locator('#workbenchBackdrop').click({position:{x:370,y:400}});
    assert.equal(await page.locator('body').evaluate(el=>el.classList.contains('navigator-open')),false);

    // Printing from the edit tab must show the physical preview first.
    await page.locator('#mobileDownloadButton').click();
    await page.waitForFunction(()=>window.__PRINT_CALLED__===2);
    await waitForBrowserLayout(page);
    assert.equal(await page.locator('.texpage-editor-pane').isVisible(),false);
    assert.equal(await page.locator('.texpage-preview-pane').isVisible(),true);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    const pageWidth=await page.locator('#typstPreview > section.typst-page').first().evaluate(el=>el.getBoundingClientRect().width);
    console.log('MOBILE PAGE WIDTH',pageWidth,await page.locator('#typstPreview').evaluate(el=>({width:el.clientWidth,zoom:getComputedStyle(el).getPropertyValue('--browser-preview-scale'),screen:innerWidth,fit:getComputedStyle(el.querySelector('.browser-paper-page')).zoom})));
    assert.ok(pageWidth<=390,'mobile page should fit: '+pageWidth);
    await page.screenshot({path:'test-results/editor-mobile-texpage.png',fullPage:true});

    await page.locator('#editModeButton').click();
    assert.equal(await page.locator('.texpage-editor-pane').isVisible(),true);

    assert.deepEqual(errors,[]);
    console.log('PASS ['+browserName+']: responsive editor, browser pagination/print, and print-to-PDF sourced from the exact preview DOM');
  }finally{
    await browser.close();
  }
})().catch(e=>{console.error(e);process.exit(1)});

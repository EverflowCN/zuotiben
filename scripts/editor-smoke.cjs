const playwright=require('playwright');
const browserName=process.env.BROWSER||'chromium';
const browserType=playwright[browserName];
const assert=require('node:assert/strict');
const fs=require('node:fs');

async function waitForTypst(page, timeout=120000){
  await page.waitForFunction(()=>{
    const svg=document.querySelector('#typstPreview svg');
    const status=document.querySelector('#pdfStatus')?.textContent||'';
    return !!svg || /失败|异常|Error|error/i.test(status);
  },null,{timeout});
  const status=await page.locator('#pdfStatus').innerText().catch(()=> '');
  const count=await page.locator('#typstPreview svg').count();
  if(!count)throw new Error('Typst preview failed: '+status);
  return status;
}

async function chooseTemplate(page,label){
  await page.locator('#templateButton').click();
  await page.locator('.template-option').filter({hasText:label}).click();
  await page.waitForFunction(()=>{
    const s=document.querySelector('#pdfStatus')?.textContent||'';
    return /已更新|已是最新/.test(s) && !/正在/.test(s);
  },null,{timeout:120000});
  await page.waitForTimeout(120);
}
async function pageAspect(page,index=1){
  const pages=page.locator('.typst-page');
  assert.ok((await pages.count())>index,'missing Typst page '+(index+1));
  return await pages.nth(index).locator('svg').evaluate(svg=>{
    const vb=(svg.getAttribute('viewBox')||'').trim().split(/[ ,]+/).map(Number);
    if(vb.length===4&&vb[2]>0&&vb[3]>0)return vb[2]/vb[3];
    const r=svg.getBoundingClientRect();
    return r.width/r.height;
  });
}
function near(actual,expected,tolerance=.035){
  assert.ok(Math.abs(actual-expected)<=tolerance,`aspect ${actual} not near ${expected}`);
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
    const firstTypstStatus=await waitForTypst(page);
    assert.match(firstTypstStatus,/Typst|实时|精确预览/);
    assert.ok((await page.locator('.typst-page').count())>=1);
    assert.notEqual(await page.locator('#previewPageIndicator').innerText(),'— / —');

    // Physical paper modes: the first page is the fixed A4 cover; inspect the first body page.
    await chooseTemplate(page,'A3 双栏试卷');
    assert.equal(await page.locator('body').getAttribute('data-layout'),'a3');
    near(await pageAspect(page,1),420/297);

    await chooseTemplate(page,'A4/A3 混排试卷');
    assert.equal(await page.locator('body').getAttribute('data-layout'),'mixed');
    near(await pageAspect(page,1),420/297);

    await chooseTemplate(page,'一题一页');
    assert.equal(await page.locator('body').getAttribute('data-layout'),'single');
    near(await pageAspect(page,1),210/297);

    await chooseTemplate(page,'平板横版（200×150 mm）');
    assert.equal(await page.locator('body').getAttribute('data-layout'),'padl');
    near(await pageAspect(page,1),200/150);

    await chooseTemplate(page,'平板竖版（200×250 mm）');
    assert.equal(await page.locator('body').getAttribute('data-layout'),'padp');
    near(await pageAspect(page,1),200/250);

    // Return to Book standard for header persistence + responsive tests.
    await chooseTemplate(page,'标准版');

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
    await page.screenshot({path:'test-results/editor-desktop-texpage.png',fullPage:true});

    // Navigator collapse on wide desktop.
    await page.locator('#navigatorToggleButton').click();
    assert.equal(await page.locator('body').evaluate(el=>el.classList.contains('navigator-collapsed')),true);
    await page.locator('#navigatorToggleButton').click();

    // Persistence + PDF download.
    await page.reload({waitUntil:'domcontentloaded'});
    await page.locator('#settingsTabButton').click();
    assert.equal(await page.locator('#headerInput').inputValue(),'数学练习');

    const dl=page.waitForEvent('download',{timeout:120000}).then(download=>({kind:'download',download}));
    const pdfFailure=page.waitForFunction(()=>{
      const status=document.querySelector('#pdfStatus')?.textContent||'';
      return /PDF.+失败|生成或保存失败|Typst.+失败|异常|Error/i.test(status);
    },null,{timeout:120000}).then(async()=>({kind:'failure',status:await page.locator('#pdfStatus').innerText()}));
    await page.locator('#printButton').click();
    const pdfResult=await Promise.race([dl,pdfFailure]);
    if(pdfResult.kind==='failure')throw new Error('PDF export failed: '+pdfResult.status);
    await pdfResult.download.saveAs('test-results/editor.pdf');
    assert.equal(fs.readFileSync('test-results/editor.pdf').subarray(0,5).toString(),'%PDF-');

    // Tablet: navigator becomes drawer; editor and preview stay split.
    await page.setViewportSize({width:834,height:1112});
    await page.waitForTimeout(180);
    await waitForTypst(page);
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

    await page.locator('#navigatorToggleButton').click();
    assert.equal(await page.locator('body').evaluate(el=>el.classList.contains('navigator-open')),true);
    await page.locator('#workbenchBackdrop').click({position:{x:370,y:400}});
    assert.equal(await page.locator('body').evaluate(el=>el.classList.contains('navigator-open')),false);

    await page.locator('#previewModeButton').click();
    await waitForTypst(page);
    assert.equal(await page.locator('.texpage-editor-pane').isVisible(),false);
    assert.equal(await page.locator('.texpage-preview-pane').isVisible(),true);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    const pageWidth=await page.locator('.typst-page').first().evaluate(el=>el.getBoundingClientRect().width);
    assert.ok(pageWidth<=390);
    await page.screenshot({path:'test-results/editor-mobile-texpage.png',fullPage:true});

    await page.locator('#editModeButton').click();
    assert.equal(await page.locator('.texpage-editor-pane').isVisible(),true);

    assert.deepEqual(errors,[]);
    console.log('PASS ['+browserName+']: TeXPage-style desktop/tablet/mobile editor, live Typst preview, local PDF download');
  }finally{
    await browser.close();
  }
})().catch(e=>{console.error(e);process.exit(1)});

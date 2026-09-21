const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');

(async()=>{
  const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  try{
    const page=await browser.newPage({viewport:{width:1440,height:1000},acceptDownloads:true});
    page.on('console',m=>{if(m.type()==='error')console.log('BROWSER:',m.text())});
    const errors=[];
    page.on('pageerror',e=>errors.push(e.message));

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

    await page.locator('#questionEditor textarea').fill('修改后的题干 $x^2$');
    assert.match(await page.locator('#paperQuestions').innerText(),/修改后的题干/);

    await page.locator('#templateButton').click();
    await page.locator('.template-option').filter({hasText:'标准版'}).click();
    assert.equal(await page.locator('body').getAttribute('data-template'),'book');
    await page.locator('#headerInput').fill('数学练习');

    await page.locator('#previewModeButton').click();
    await page.locator('#typstPreview svg').waitFor({state:'visible',timeout:240000});
    assert.match(await page.locator('#pdfStatus').innerText(),/Typst 精确预览已更新|精确预览已是最新/);
    assert.equal(await page.locator('.editor-sidebar').isVisible(),false);
    assert.equal(await page.locator('.editor-topbar').isVisible(),true);
    await page.screenshot({path:'test-results/editor-typst-preview.png',fullPage:true});

    await page.locator('#editModeButton').click();
    assert.equal(await page.locator('.editor-sidebar').isVisible(),true);

    await page.reload({waitUntil:'domcontentloaded'});
    assert.equal(await page.locator('#headerInput').inputValue(),'数学练习');

    const dl=page.waitForEvent('download',{timeout:240000});
    await page.locator('#printButton').click();
    const download=await dl;
    await download.saveAs('test-results/editor.pdf');
    assert.equal(fs.readFileSync('test-results/editor.pdf').subarray(0,5).toString(),'%PDF-');
    assert.match(await page.locator('#pdfStatus').innerText(),/PDF 已在本机生成|PDF 已交给浏览器保存|未使用服务器编译/);

    await page.locator('#editModeButton').click();
    await page.setViewportSize({width:1440,height:1000});
    await page.waitForTimeout(120);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await page.screenshot({path:'test-results/editor-desktop.png',fullPage:true});

    await page.setViewportSize({width:834,height:1112});
    await page.waitForTimeout(120);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await page.screenshot({path:'test-results/editor-tablet.png',fullPage:true});

    await page.setViewportSize({width:390,height:844});
    await page.waitForTimeout(120);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await page.screenshot({path:'test-results/editor-mobile.png',fullPage:true});

    await page.locator('#templateButton').click();
    await page.locator('.template-option').filter({hasText:'A3 横向双栏'}).click();
    await page.waitForTimeout(120);
    assert.equal(await page.locator('body').getAttribute('data-layout'),'a3');
    assert.equal(await page.evaluate(()=>{
      const r=document.querySelector('#paperSheet').getBoundingClientRect();
      return r.left>=-1 && r.right<=innerWidth+1;
    }),true);
    await page.screenshot({path:'test-results/editor-mobile-a3.png',fullPage:true});

    await page.locator('#previewModeButton').click();
    await page.locator('#typstPreview svg').waitFor({state:'visible',timeout:240000});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    const svgWidth=await page.locator('#typstPreview svg').evaluate(el=>el.getBoundingClientRect().width);
    assert.ok(svgWidth<=390);
    await page.screenshot({path:'test-results/editor-mobile-typst-a3.png',fullPage:true});

    assert.deepEqual(errors,[]);
    console.log('PASS: desktop/tablet/mobile edit layout, A3 mobile scaling, Typst SVG preview, local PDF download');
  }finally{
    await browser.close();
  }
})().catch(e=>{console.error(e);process.exit(1)});

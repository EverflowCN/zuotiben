const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');

async function waitForSettled(page,timeout=120000){
  await page.waitForFunction(()=>{
    const s=document.querySelector('#pdfStatus')?.textContent||'';
    const pages=document.querySelectorAll('#typstPreview .typst-page');
    return pages.length>=2 && /分页已完成/.test(s) && !/正在/.test(s);
  },null,{timeout});
}
async function choose(page,label,layout){
  const before=await page.locator('#typstPreview').innerHTML();
  await page.locator('#templateButton').click();
  await page.locator('.template-option').filter({has:page.getByText(label,{exact:true})}).click();
  await page.waitForFunction(expectedLayout=>document.body.dataset.layout===expectedLayout,layout,{timeout:30000});
  await page.waitForFunction(oldHtml=>{
    const status=document.querySelector('#pdfStatus')?.textContent||'';
    const current=document.querySelector('#typstPreview')?.innerHTML||'';
    return current!==oldHtml && /分页已完成/.test(status) && !/正在/.test(status);
  },before,{timeout:120000});
}
async function ratio(page,index=1){
  return page.locator('#typstPreview > section.typst-page').nth(index).evaluate(wrap=>{
    const box=wrap.getBoundingClientRect();
    return box.width/box.height;
  });
}
function near(actual,expected,t=.035){
  assert.ok(Math.abs(actual-expected)<=t,`aspect ${actual} != ${expected}`);
}

(async()=>{
  const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  try{
    const page=await browser.newPage({viewport:{width:1440,height:1000}});
    const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.addInitScript(()=>{
      localStorage.setItem('zuotiben-local-paper-v1',JSON.stringify({
        title:'物理版式验证',coverTitle:'物理版式验证',template:'exam',layout:'a4',
        questions:[
          {id:'q1',section:'一、选择题',content:'设 $f(x)=x^2$，求导数。',options:['$x$','$2x$','$x^2$','$2$'],showOptions:true},
          {id:'q2',section:'二、解答题',content:'设矩阵\n$$\\begin{bmatrix}1&2\\\\\n3&4\\end{bmatrix}$$\n(1) 求行列式；\nⅠ 说明条件\nⅡ 给出结论。',options:[],showOptions:false}
        ]
      }));
    });
    await page.goto('http://127.0.0.1:8765/paper/editor/',{waitUntil:'domcontentloaded',timeout:120000});
    await waitForSettled(page);

    const initialRatio=await ratio(page,1);
    near(initialRatio,210/297);
    assert.ok(await page.locator('.browser-paper-column [data-question-id="q2"] math[display="block"]').count());
    assert.ok(await page.locator('.browser-paper-column [data-question-id="q2"] .semantic-row.roman').count()>=2);
    await page.evaluate(()=>document.body.classList.add('browser-print-active'));
    await page.emulateMedia({media:'print'});
    assert.equal(await page.locator('#paperStage').evaluate(el=>getComputedStyle(el).display),'none');
    assert.equal(await page.locator('#typstPreview').evaluate(el=>getComputedStyle(el).position),'static');
    near(await ratio(page,1),210/297,.001);
    const printPdf=await page.pdf({preferCSSPageSize:true,printBackground:true});
    assert.equal(printPdf.subarray(0,5).toString(),'%PDF-');
    await page.emulateMedia({media:'screen'});
    await page.evaluate(()=>document.body.classList.remove('browser-print-active'));
    console.log('PASS MODE A4 试卷 a4 ratio',initialRatio,'chip',await page.locator('#pageSizeChip').innerText());

    const cases=[
      ['A3 双栏试卷','a3',420/297],
      ['A4/A3 混排试卷','mixed',420/297],
      ['紧凑版','compact',210/297],
      ['标准版','standard',210/297],
      ['宽松版','loose',210/297],
      ['一题一页','single',210/297],
      ['平板横版（200×150 mm）','padl',200/150],
      ['平板竖版（200×250 mm）','padp',200/250],
    ];
    for(const [label,layout,expected] of cases){
      await choose(page,label,layout);
      const actual=await ratio(page,1);
      const size=await page.locator('#pageSizeChip').innerText();
      console.log('MODE GEOMETRY',label,layout,'ratio',actual,'expected',expected,'chip',size);
      near(actual,expected);
      console.log('PASS MODE',label);
    }
    // A3 two-column stress test with the eight Math-II demonstration questions.
    // This reproduces the reported "question 8 below 50%" class of failures.
    const raw=JSON.parse(fs.readFileSync('paper/test/example.json','utf8'));
    const questions=raw.questions.map((entry,i)=>{
      const q=entry.question;
      return {
        id:'regression-'+i,
        content:q.stem,
        section:entry.section_title,
        options:Object.values(q.options||{}),
        type:Object.keys(q.options||{}).length?'选择题':'解答题',
        gap:0,showOptions:!!Object.keys(q.options||{}).length
      };
    });
    await page.evaluate(qs=>localStorage.setItem('zuotiben-local-paper-v1',JSON.stringify({
      title:'A3 数学二八题回归测试',coverTitle:'A3 数学二八题回归测试',template:'exam',layout:'a3',questions:qs
    })),questions);
    await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>{
      const txt=document.querySelector('#pdfStatus')?.textContent||'';
      return /分页已完成|浏览器分页失败/.test(txt);
    },null,{timeout:45000});
    const regressionStatus=await page.locator('#pdfStatus').innerText();
    assert.match(regressionStatus,/分页已完成/,'A3 math-II eight-question layout failed: '+regressionStatus);
    assert.equal(await page.locator('#typstPreview .browser-paper-page').count()>0,true);
    console.log('PASS A3 8-question sample:',regressionStatus);
    assert.deepEqual(errors,[]);
    console.log('PASS: all physical paper modes and A3 math-II sample');
  }finally{
    await browser.close();
  }
})().catch(e=>{console.error(e);process.exit(1)});

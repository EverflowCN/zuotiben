const {chromium}=require('playwright');
const assert=require('node:assert/strict');

async function waitForSettled(page,timeout=120000){
  await page.waitForFunction(()=>{
    const s=document.querySelector('#pdfStatus')?.textContent||'';
    const pages=document.querySelectorAll('#typstPreview .typst-page');
    return pages.length>=2 && /已更新|已是最新/.test(s) && !/正在/.test(s);
  },null,{timeout});
}
async function choose(page,label,layout){
  await page.locator('#templateButton').click();
  await page.locator('.template-option').filter({hasText:label}).click();
  await page.waitForFunction(expected=>document.body.dataset.layout===expected,layout,{timeout:30000});
  await waitForSettled(page);
}
async function ratio(page,index=1){
  return page.locator('.typst-page').nth(index).locator('svg').evaluate(svg=>{
    const vb=(svg.getAttribute('viewBox')||'').trim().split(/[ ,]+/).map(Number);
    if(vb.length===4&&vb[2]>0&&vb[3]>0)return vb[2]/vb[3];
    const box=svg.getBoundingClientRect();
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
          {id:'q2',section:'二、解答题',content:'求 $\\int_0^1 x^2\\,dx$。',options:[],showOptions:false}
        ]
      }));
    });
    await page.goto('http://127.0.0.1:8765/paper/editor/',{waitUntil:'domcontentloaded',timeout:120000});
    await waitForSettled(page);

    const cases=[
      ['A4 试卷','a4',210/297],
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
      near(await ratio(page,1),expected);
      const size=await page.locator('#pageSizeChip').innerText();
      console.log('PASS MODE',label,layout,'ratio',await ratio(page,1),'chip',size);
    }
    assert.deepEqual(errors,[]);
    console.log('PASS: all physical paper modes');
  }finally{
    await browser.close();
  }
})().catch(e=>{console.error(e);process.exit(1)});

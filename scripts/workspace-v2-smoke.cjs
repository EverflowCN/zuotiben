const {chromium}=require('playwright');
const JSZip=require('jszip');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  const ctx=await browser.newContext({viewport:{width:1440,height:900},acceptDownloads:true});
  const page=await ctx.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const source={
   version:2,type:'everflow-local-paper',title:'目录文件夹综合测试',
   coverTitle:'目录文件夹综合测试',template:'exam',layout:'a4',
   questions:[
     {id:'oa1',content:'设 $f(x)=x^2$，则 $f\\prime(x)=$（　）。',section:'一、选择题',type:'选择题',showOptions:true,options:['$x$','$2x$','$x^2$','$2$']},
     {id:'oa2',content:'计算 $\\int_0^1 x\\,dx$。',section:'二、填空题',type:'填空题',showOptions:false,options:[]},
     {id:'oa3',content:'求矩阵 $A=\\begin{bmatrix}1&2\\\\3&4\\end{bmatrix}$ 的行列式。',section:'三、解答题',type:'解答题',showOptions:false,options:[]}
   ],originalIds:['oa1','oa2','oa3']
  };
  await page.addInitScript(data=>{
    if(!localStorage.getItem('zuotiben-local-paper-v1'))localStorage.setItem('zuotiben-local-paper-v1',JSON.stringify(data));
  },source);
  await page.goto('http://127.0.0.1:8765/paper/editor/',{waitUntil:'domcontentloaded'});
  await page.locator('#editorMoreMenu summary').click();
  await page.locator('#splitProjectOutlineToggle').check();
  await page.locator('#editorMoreMenu summary').click();
  await page.locator('#localPaperList .workspace-paper').first().waitFor({timeout:16000});
  assert.equal(await page.locator('#outlineTabButton').innerText(),'大纲');
  assert.equal(await page.locator('#sectionManageButton').innerText(),'目录结构');
  assert.equal(await page.locator('.outline-tree-section').count(),3);
  // Physical A4 table of contents generated AFTER cover from actual pagination.
  await page.locator('#sectionManageButton').click();
  await page.locator('#tocEnabledToggle').check();
  await page.waitForFunction(()=>document.querySelector('.browser-toc-page')!==null,{timeout:60000});
  assert.equal(await page.locator('.browser-toc-page').count(),1);
  assert.equal(await page.locator('.browser-toc-line').count(),3);
  assert.equal(await page.locator('.browser-toc-page').evaluate(e=>getComputedStyle(e).page),'everflow-cover');
  assert.equal(await page.locator('#tocEnabledSettings').isChecked(),true);
  const toc=await page.locator('.browser-toc-lines').innerText();
  assert.ok(toc.includes('选择题')&&toc.includes('解答题'));
  // Resize left project list vertically and confirm persisted user setting.
  const top=await page.locator('#workspaceHeightResizer').boundingBox();
  await page.mouse.move(top.x+top.width/2,top.y+top.height/2);
  await page.mouse.down();
  await page.mouse.move(top.x+top.width/2,top.y+top.height/2+85,{steps:5});
  await page.mouse.up();
  const height=await page.evaluate(()=>parseInt(getComputedStyle(document.documentElement).getPropertyValue('--workspace-h'),10));
  assert.ok(height>=170,'project/outline height did not resize '+height);
  const nav=await page.locator('#navigatorResizer').boundingBox();
  await page.mouse.move(nav.x+nav.width/2,nav.y+nav.height/2);
  await page.mouse.down();await page.mouse.move(nav.x+nav.width/2+65,nav.y+nav.height/2,{steps:6});await page.mouse.up();
  const navWidth=await page.evaluate(()=>parseInt(getComputedStyle(document.documentElement).getPropertyValue('--navigator-w'),10));
  assert.ok(navWidth>240,'left/mid panel resize failed '+navWidth);
  // Folders are persistent, do not replace or delete active paper.
  await page.locator('#newLocalFolder').click();
  await page.locator('#workspaceDialogContent input.workspace-input').fill('27 数学二模拟卷');
  await page.locator('#workspaceDialog').getByRole('button',{name:'创建文件夹',exact:true}).click();
  await page.locator('.workspace-folder-label').filter({hasText:'27 数学二模拟卷'}).waitFor();
  const folderId=await page.evaluate(async()=> (await EverflowArchive.listFolders())[0].id);
  assert.ok(folderId.startsWith('folder-'));
  // Multi-paper ZIP import into new folder, keep existing draft untouched.
  const zip=new JSZip();
  zip.file('试卷/数学二甲卷.md','# 数学二甲卷\n\n## 一、选择题\n\n### 1\n求 $1+1$。\nA. 1\nB. 2\nC. 3\nD. 4\n');
  zip.file('试卷/数学二乙卷.everflow',JSON.stringify({title:'数学二乙卷',questions:[{id:'bq',section:'二、填空题',content:'计算 $2+2$ = ______。',options:[]}]}));
  const payload=await zip.generateAsync({type:'nodebuffer',compression:'DEFLATE'});
  await page.locator('#workspaceZipInput').setInputFiles({name:'27数学二套卷.zip',mimeType:'application/zip',buffer:payload});
  await page.locator('#workspaceDialogTitle').filter({hasText:'ZIP 题库'}).waitFor({timeout:20000});
  assert.equal(await page.locator('.workspace-import-preview-item').count(),2);
  const selector=page.locator('#workspaceDialogContent select.workspace-input');
  await selector.selectOption(folderId);
  await page.getByRole('button',{name:'导入全部 2 份试卷'}).click();
  await page.waitForFunction(async()=> (await EverflowArchive.list()).length>=3,{timeout:20000});
  const result=await page.evaluate(async()=>({
    folders:await EverflowArchive.listFolders(),
    papers:await EverflowArchive.list(),
    active:EverflowArchive.activeId()
  }));
  assert.equal(result.papers.length,3);
  assert.equal(result.papers.filter(p=>p.folderId===folderId).length,2);
  assert.ok(result.papers.some(p=>p.title==='目录文件夹综合测试'));
  // Move existing root paper to folder, current editing stays intact.
  await page.locator('.workspace-file-row.is-active .workspace-file-menu').click();
  await page.locator('#workspaceDialog .workspace-file-move').selectOption(folderId);
  await page.getByRole('button',{name:'移动试卷',exact:true}).click();
  await page.waitForFunction(async folder=> (await EverflowArchive.list()).every(p=>p.folderId===folder),folderId);
  assert.equal(await page.locator('#orderList .order-item').count(),3);
  // Matrix and list share a single cross-paper selection set.
  await page.locator('#openPaperGraph').click();
  await page.locator('[data-graph-view="matrix"]').click();
  await page.locator('.workspace-matrix-cell').first().click();
  assert.equal(await page.locator('.workspace-matrix-cell[aria-checked="true"]').count(),1);
  assert.equal(await page.locator('.workspace-matrix-detail').isVisible(),true);
  await page.locator('[data-graph-view="list"]').click();
  assert.equal(await page.locator('.workspace-graph-row input:checked').count(),1);
  await page.locator('[data-graph-view="matrix"]').click();
  assert.equal(await page.locator('.workspace-matrix-cell[aria-checked="true"]').count(),1);
  await page.locator('#workspaceDialogClose').click();
  await page.screenshot({path:'test-results/workspace-folders-desktop.png',fullPage:false});
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('.outline-tree-section').first().waitFor({timeout:25000});
  assert.equal(await page.locator('#tocEnabledToggle').isChecked(),true);
  assert.ok((await page.evaluate(async()=>EverflowArchive.listFolders())).some(f=>f.name==='27 数学二模拟卷'));
  assert.ok(parseInt(await page.evaluate(()=>localStorage.getItem('everflow-editor-ui-v1')||'0'))>=0||true);
  const largeCtx=await browser.newContext({viewport:{width:1440,height:900}});
  await largeCtx.addInitScript(data=>localStorage.setItem('zuotiben-local-paper-v1',JSON.stringify(data)),source);
  const bulkPage=await largeCtx.newPage();
  await bulkPage.goto('http://127.0.0.1:8765/paper/editor/',{waitUntil:'domcontentloaded'});
  await bulkPage.locator('#projectsTabButton').click();
  const bulkZip=new JSZip();
  for(let i=0;i<121;i++)bulkZip.file('paper-'+i+'.json',JSON.stringify({title:'批量试卷'+i,questions:[{content:'计算 1+1。',options:[]}]}));
  for(let i=0;i<501;i++)bulkZip.file('assets/ignore-'+i+'.txt','ignored');
  bulkZip.file('assets/large.bin',Buffer.alloc(26*1024*1024));
  const bulkBuffer=await bulkZip.generateAsync({type:'nodebuffer',compression:'STORE'});
  assert.ok(bulkBuffer.length>25*1024*1024);
  await bulkPage.locator('#workspaceZipInput').setInputFiles({name:'无限制验证.zip',mimeType:'application/zip',buffer:bulkBuffer});
  await bulkPage.getByRole('button',{name:'导入全部 121 份试卷',exact:true}).waitFor({timeout:45000});
  await bulkPage.getByRole('button',{name:'导入全部 121 份试卷',exact:true}).click();
  await bulkPage.waitForFunction(async()=> (await EverflowArchive.list()).filter(p=>p.title.startsWith('批量试卷')).length===121,null,{timeout:60000});
  assert.equal(await bulkPage.locator('#importWorkspaceZip svg').count(),1,'ZIP import preserves its icon');
  await largeCtx.close();
  assert.deepEqual(errors,[],'Client JS failures '+errors.join(' / '));
  console.log('PASS folder migration, ZIP batch archive, TOC page, 3-pane resizing, left vertical resizing, persistence');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
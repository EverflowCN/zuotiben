const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--disable-dev-shm-usage'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto('https://zuotiben.top/latex/?local=1', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.getByTestId('browser-compile').waitFor({ timeout: 30000 });
    const editor = page.locator('.code-pane [contenteditable="true"][aria-label="main.tex"]');
    await page.locator('.editor-shell .toolbar').waitFor();
    // The empty preview is lightweight; PDF.js is mounted only after a PDF exists.
    await page.locator('.editor-shell .browser-aldine__preview').waitFor();
    await page.getByRole('tab', { name: '文件' }).waitFor();
    await editor.fill([
      '\\documentclass[12pt]{article}',
      '\\begin{document}',
      'Hello from browser-only XeLaTeX.',
      '\\end{document}'
    ].join('\n'));
    // Validate that the native Aldine preflight works without a compiler or
    // uploading the user's sources to any remote service.
    await page.getByTestId('preflight-open').click();
    const audit = page.getByTestId('preflight-panel');
    await audit.waitFor({ timeout: 10000 });
    const auditText = await audit.textContent();
    if (!auditText?.includes('LaTeX 模板依赖检查') || !auditText.includes('普通 LaTeX 工程')) {
      throw new Error('Unexpected local template dependency preflight report: ' + auditText);
    }
    await page.waitForFunction(() => {
      const text = document.querySelector('[data-testid="preflight-coverage"]')?.textContent || '';
      return text.includes('归属核对') || text.includes('未在三套目录') || text.includes('无法加载');
    }, null, { timeout: 15000 });
    const coverage = await page.getByTestId('preflight-coverage').textContent();
    console.log('Package manifest coverage:', coverage?.slice(0, 1300));
    if (coverage?.includes('无法加载')) throw new Error('Website could not serve required TeX Live package metadata');
    await audit.getByRole('button', { name: '关闭' }).click();
    console.log('PASS: Offline LaTeX dependency preflight matched source packages to hosted TeX Live manifests.');
    await page.getByTestId('browser-compile').click();
    const status = page.getByRole('status');
    // Watch for either completion state instead of blindly waiting until timeout.
    await page.waitForFunction(() => {
      const v = document.querySelector('[role=status]')?.textContent || '';
      return v.includes('编译成功') || v.includes('编译失败') || v.includes('浏览器编译失败');
    }, null, { timeout: 240000 });
    const result = await status.textContent();
    const log = await page.getByTestId('browser-compile-log').textContent().catch(() => '(log unavailable)');
    console.log('Status:', result);
    console.log('Log tail:', (log || '').slice(-3500));
    if (!result?.includes('编译成功')) throw new Error('Browser XeLaTeX smoke test did not compile: ' + result);
    if (!(await page.getByRole('link', { name: '下载 PDF' }).count())) throw new Error('PDF download link is missing');

    // Second pass: Chinese font discovery + mathematical formula.
    await editor.fill([
      '\\documentclass[12pt,a4paper]{ctexart}',
      '\\usepackage{amsmath}',
      '\\begin{document}',
      '\\section*{中文 XeLaTeX 测试}',
      '这是一份浏览器生成的数学试卷。',
      '\\[',
      '\\int_0^1 x^2\\,dx = \\frac13.',
      '\\]',
      '\\end{document}'
    ].join('\n'));
    await page.getByTestId('browser-compile').click();
    await page.waitForFunction(() => {
      const v = document.querySelector('[role=status]')?.textContent || '';
      return v.includes('编译成功') || v.includes('编译失败') || v.includes('浏览器编译失败');
    }, null, { timeout: 240000 });
    const chineseStatus = await status.textContent();
    const chineseLog = await page.getByTestId('browser-compile-log').textContent().catch(() => '(log unavailable)');
    console.log('Chinese + math status:', chineseStatus);
    console.log('Chinese log tail:', (chineseLog || '').slice(-2800));
    if (!chineseStatus?.includes('编译成功')) throw new Error('Chinese ctexart + amsmath browser compile failed: ' + chineseStatus);
    console.log('PASS: XeLaTeX CJK text and mathematical formula also generated a PDF.');

    // Validate CJK at the PDF output level rather than merely checking
    // BusyTeX success and nonempty PDF bytes. This catches font embedding,
    // Unicode conversion and PDF.js preview regressions.
    const pdfBytes = await page.evaluate(async () => {
      const url = document.querySelector('a[download$=".pdf"]')?.href;
      if (!url) throw Error('Missing PDF blob URL');
      return [...new Uint8Array(await (await fetch(url)).arrayBuffer())];
    });
    const pdfFile = '/tmp/everflow-cjk-font-test.pdf';
    require('fs').writeFileSync(pdfFile, Buffer.from(pdfBytes));
    const { execFileSync } = require('child_process');
    const extractedText = execFileSync('pdftotext', ['-layout', pdfFile, '-'], { encoding: 'utf8' });
    const fonts = execFileSync('pdffonts', [pdfFile], { encoding: 'utf8' });
    console.log('CJK PDF pdftotext:', JSON.stringify(extractedText));
    console.log('CJK PDF embedded fonts:', fonts.slice(0, 2400));
    if (!extractedText.includes('中文') || !extractedText.includes('这是一份')) {
      throw new Error('Real Chinese glyphs missing from PDF or its Unicode map, despite XeLaTeX reporting success.');
    }
    // The default CJK-safe mode uses browser PDFium instead of Aldine PDF.js.
    // PDF.js can silently omit subsetted CID/OpenType Chinese glyphs.
    await page.locator('iframe[data-testid="pdf-native"]').waitFor({ timeout: 25000 });
    const mode = page.getByRole('combobox', { name: 'PDF 预览模式' });
    if ((await mode.inputValue()) !== 'native') throw new Error('Chinese-compatible native PDF viewer is not the default');
    if (!(await page.locator('iframe[data-testid="pdf-native"]').getAttribute('src'))?.startsWith('blob:')) {
      throw new Error('Native PDF preview did not load the compiled PDF blob');
    }
    await mode.selectOption('pdfjs');
    await page.locator('.pdf-pane .pdf-page').first().waitFor({ timeout: 25000 });
    await mode.selectOption('native');
    await page.locator('iframe[data-testid="pdf-native"]').waitFor({ timeout: 25000 });
    console.log('PASS: PDF has extractable Chinese glyphs; native browser PDF preview is default and switchable.');


    // Round-trip the entire local LaTeX project through a real ZIP download/upload.
    const zipDownloadPromise = page.waitForEvent('download', { timeout: 30000 });
    await page.getByRole('button', { name: '导出 ZIP' }).first().click();
    const zipDownload = await zipDownloadPromise;
    if (!zipDownload.suggestedFilename().endsWith('.zip')) throw new Error('ZIP export has unexpected name');
    const zipFile = await zipDownload.path();
    page.on('dialog', (dialog) => dialog.accept());
    await page.locator('input[type="file"][accept*="application/zip"]').setInputFiles(zipFile);
    await page.waitForFunction(() => (document.querySelector('[role=status]')?.textContent || '').includes('ZIP 已导入'), null, { timeout: 30000 });
    if (!((await editor.textContent()) || '').includes('这是一份浏览器生成的数学试卷')) {
      throw new Error('ZIP import did not restore the Chinese LaTeX project');
    }
    console.log('PASS: Exported full workspace ZIP and successfully re-imported it.');
    // Check that heavyweight assets survive a full page restart, not merely
    // that the in-memory BusyTeX instance can compile twice in one tab.
    await page.waitForFunction(async () => {
      const wasm = await caches.match('/latex/browser-test/core/busytex/busytex.wasm');
      return !!wasm;
    }, null, { timeout: 30000 });
    const cacheBefore = await page.evaluate(async () => ({
      controlled: Boolean(navigator.serviceWorker?.controller),
      wasm: Boolean(await caches.match('/latex/browser-test/core/busytex/busytex.wasm')),
      data: Boolean(await caches.match('/latex/browser-test/core/busytex/texlive-basic.data')),
      store: await caches.keys()
    }));
    console.log('Cache after first visit:', JSON.stringify(cacheBefore));
    if (!cacheBefore.controlled || !cacheBefore.wasm) {
      const diagnostics = await page.evaluate(async () => {
        const script = await fetch('/latex/busytex-sw.js', { cache: 'no-store' }).catch((e) => ({ error: String(e) }));
        const helper = await fetch('/latex/busytex-cache.mjs', { cache: 'no-store' }).catch((e) => ({ error: String(e) }));
        return {
          location: location.href,
          serviceWorkerAvailable: 'serviceWorker' in navigator,
          swStatus: script?.status,
          swContentType: script?.headers?.get?.('content-type'),
          swHead: script?.text ? (await script.text()).slice(0, 150) : String(script?.error),
          helperStatus: helper?.status,
          helperContentType: helper?.headers?.get?.('content-type'),
          regs: 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistrations().then((regs) => regs.map((r) => ({ scope: r.scope, active: r.active?.state, installing: r.installing?.state }))).catch((e) => String(e)) : [],
        };
      });
      console.log('Service worker diagnostics:', JSON.stringify(diagnostics));
      throw new Error('Persistent SW/WASM cache not installed.');
    }
    // Reproduce a returning user's stale pipeline while retaining the large core.
    await page.evaluate(async () => {
      const cache = await caches.open('everflow-busytex-core-v1.4.0-46ebb621-v1');
      await cache.put('/latex/browser-test/core/busytex/busytex_pipeline.js', new Response('throw Error("stale resolver sentinel")', {headers:{'Content-Type':'text/javascript'}}));
      localStorage.setItem('everflow.busytex.runtime-code', 'old-resolver');
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByTestId('browser-compile').waitFor({ timeout: 30000 });
    const afterReload = await page.evaluate(async () => ({
      controlled: Boolean(navigator.serviceWorker?.controller),
      wasm: Boolean(await caches.match('/latex/browser-test/core/busytex/busytex.wasm')),
      data: Boolean(await caches.match('/latex/browser-test/core/busytex/texlive-basic.data'))
    }));
    console.log('Cache after page reload:', JSON.stringify(afterReload));
    if (!afterReload.wasm || !afterReload.controlled) throw new Error('Browser cache lost after page reload.');
    await page.waitForFunction(() => (document.querySelector('.code-pane [contenteditable="true"][aria-label="main.tex"]')?.textContent || '').includes('这是一份浏览器生成的数学试卷'), null, { timeout: 30000 });
    await page.getByTestId('browser-compile').click();
    await page.waitForFunction(() => {
      const v = document.querySelector('[role=status]')?.textContent || '';
      return v.includes('编译成功') || v.includes('编译失败') || v.includes('浏览器编译失败');
    }, null, { timeout: 240000 });
    const reopened = await page.getByRole('status').textContent();
    console.log('After reload compilation:', reopened);
    if (!reopened?.includes('编译成功')) throw new Error('Second-visit cached browser compilation failed.');
    console.log('PASS: Persistent BusyTeX WASM cache survives reload and XeLaTeX compiles again.');
    console.log('PASS: Returning browser repairs stale compiler scripts without deleting cached WASM or project files.');


    // Synthetic Everflow fixture: check the REAL published TeX Live file index
    // without uploading or committing the user's private 173-file template.
    const fixture = await page.evaluate(async () => {
      const zip = await import('/latex/browser-test/fflate.mjs');
      const encoder = new TextEncoder();
      const source = [
        '\\documentclass{ctexart}',
        '\\usepackage{ctex,tikz,fontspec,xeCJK,multirow}',
        '\\begin{document}',
        '数学与中文测试',
        '\\end{document}',
      ].join('\n');
      const files = {
        'Everflow-Exam.tex': encoder.encode(source),
        'Everflow-Book.tex': encoder.encode(source.replace('ctex,tikz,fontspec,xeCJK,multirow', 'ctex,fontspec')),
        'Everflow-Public.tex': encoder.encode(source),
        'core/everflow/everflow-fonts.sty': encoder.encode('\\ProvidesPackage{everflow-fonts}'),
      };
      return [...zip.zipSync(files)];
    });
    const fixturePath = '/tmp/everflow-preflight-fixture.zip';
    require('fs').writeFileSync(fixturePath, Buffer.from(fixture));
    await page.locator('input[type="file"][accept*="application/zip"]').setInputFiles(fixturePath);
    await page.getByTestId('preflight-panel').waitFor({ timeout: 10000 });
    await page.waitForFunction(() => {
      const t = document.querySelector('[data-testid="preflight-coverage"]')?.textContent || '';
      return t.includes('归属核对') || t.includes('未在三套目录') || t.includes('无法加载');
    }, null, { timeout: 20000 });
    const fixtureText = await page.getByTestId('preflight-panel').textContent();
    console.log('Synthetic Everflow report:', fixtureText?.slice(0, 1800));
    if (!fixtureText?.includes('已识别 Everflow 原版工程')) throw new Error('Everflow project not recognized');
    if (!fixtureText.includes('tikz') || !fixtureText.includes('xeCJK') || !fixtureText.includes('multirow')) {
      throw new Error('Source package dependencies not extracted');
    }
    if (!fixtureText.includes('建议资源：扩展')) {
      throw new Error('Everflow recommended tier must reflect the real TeX Live Extra file index');
    }
    const coverageSummary = await page.getByTestId('preflight-coverage').textContent();
    if (coverageSummary?.includes('无法加载')) throw new Error('GitHub hosted file inventory was not available');
    console.log('PASS: ZIP auto-preflight recognizes Everflow and classifies TeX Live file/package assets.');
    const pgfFixture = await page.evaluate(async () => {
      const zip = await import('/latex/browser-test/fflate.mjs');
      const enc = new TextEncoder();
      return [...zip.zipSync({
        'main.tex': enc.encode(String.raw`\documentclass{ctexart}
\usepackage{project-style}
\begin{document}
中文与 PGF 浮点依赖测试。
\begin{tikzpicture}\draw (0,0) rectangle (2,1);\end{tikzpicture}
\pgfmathparse{1.25+2.5}\pgfmathresult
\end{document}`),
        'project-style.sty': enc.encode(String.raw`\ProvidesPackage{project-style}
\RequirePackage{tikz}
\input{pgfmathfloat.code.tex}`)
      })];
    });
    await page.locator('input[accept*="application/zip"]').setInputFiles({name:'pgf-regression.zip',mimeType:'application/zip',buffer:Buffer.from(pgfFixture)});
    await page.waitForFunction(() => document.querySelector('.browser-aldine__status-text')?.textContent.includes('ZIP 已导入'));
    await page.getByRole('combobox', {name:'TeX Live 资源包'}).selectOption('basic');
    await page.locator('.browser-aldine__settings summary').click();
    await page.getByRole('checkbox', {name:'自动获取缺失宏包'}).uncheck();
    await page.getByTestId('browser-compile').click();
    await page.waitForFunction(() => /编译成功|编译失败|浏览器编译失败/.test(document.querySelector('.browser-aldine__status-text')?.textContent || ''), null, {timeout:300000});
    const pgfStatus = await page.locator('.browser-aldine__status-text').textContent();
    if (!pgfStatus.includes('编译成功')) {
      console.log('PGF regression log:', (await page.getByTestId('browser-compile-log').textContent()).slice(-10000));
      throw Error('PGF nested dependency regression failed: ' + pgfStatus);
    }
    console.log('PASS: PGF internal pgfmathfloat.code.tex compiles through nested .sty, automatic tier selection, and no remote package fallback.');

    // Import a completely SYNTHETIC multi-entry Everflow-like ZIP (not the
    // user's private template). Ensure its real Exam entrypoint is selected,
    // not an unrelated helper file or the Book/Public alternate entrypoint.
    const rootFixture = await page.evaluate(async () => {
      const zip = await import('/latex/browser-test/fflate.mjs');
      const encoder = new TextEncoder();
      const items = {
        '00-user-config/settings.tex': encoder.encode('% settings fixture\n'),
        'questions/first.tex': encoder.encode('A synthetic question.'),
        'Everflow-Book.tex': encoder.encode('\\documentclass{article}\n\\begin{document}book\\end{document}'),
        'Everflow-Public.tex': encoder.encode('\\documentclass{article}\n\\begin{document}public\\end{document}'),
        'Everflow-Exam.tex': encoder.encode('\\documentclass{article}\n\\input{questions/first}\n\\begin{document}exam\\end{document}')
      };
      return Array.from(zip.zipSync(items, { level: 0 }));
    });
    await page.locator('input[type="file"][accept*="application/zip"]').setInputFiles({
      name: 'everflow-fixture.zip', mimeType: 'application/zip', buffer: Buffer.from(rootFixture)
    });
    await page.waitForFunction(() => (document.querySelector('.browser-aldine__status-text')?.textContent || '').includes('ZIP 已导入'), null, { timeout: 30000 });
    const root = await page.getByRole('combobox', { name: '主文档' }).inputValue();
    console.log('Synthetic Everflow ZIP chosen root:', root);
    if (root !== 'Everflow-Exam.tex') throw Error('ZIP root heuristic did not select Everflow-Exam.tex');
    await page.getByTestId('preflight-panel').waitFor({ timeout: 20000 });
    console.log('PASS: ZIP import selects Everflow-Exam.tex and automatically opens dependency preflight.');

    if (errors.length) console.log('Nonfatal browser console errors:', errors.slice(0, 8));
    console.log('PASS: Real Aldine fork UI called BusyTeX WASM and returned a PDF.');
  } finally {
    await browser.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });

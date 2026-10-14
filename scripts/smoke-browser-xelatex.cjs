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
    await page.locator('.editor-shell .pdf-pane').waitFor();
    await page.getByRole('tab', { name: '文件' }).waitFor();
    await editor.fill([
      '\\documentclass[12pt]{article}',
      '\\begin{document}',
      'Hello from browser-only XeLaTeX.',
      '\\end{document}'
    ].join('\n'));
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

    if (errors.length) console.log('Nonfatal browser console errors:', errors.slice(0, 8));
    console.log('PASS: Real Aldine fork UI called BusyTeX WASM and returned a PDF.');
  } finally {
    await browser.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });

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
    const editor = page.getByRole('textbox', { name: 'main.tex' });
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
    if (errors.length) console.log('Nonfatal browser console errors:', errors.slice(0, 8));
    console.log('PASS: Real Aldine fork UI called BusyTeX WASM and returned a PDF.');
  } finally {
    await browser.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });

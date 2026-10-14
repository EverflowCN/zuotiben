/**
 * Public synthetic probe for the Everflow-like LaTeX dependency stack.
 * NEVER imports or publishes the user's private Everflow template.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const { execFileSync } = require('child_process');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-dev-shm-usage', '--js-flags=--max-old-space-size=4096'],
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1460, height: 920 } });
    const errorEvents = [];
    const requestedData = [];
    page.on('pageerror', (e) => errorEvents.push(e.message));
    page.on('response', (response) => {
      if (/texlive-(?:extra|recommended)\.data/.test(response.url())) {
        requestedData.push({ url: response.url(), status: response.status(), source: 'response' });
        console.log('GitHub-hosted collection response:', response.status(), response.url());
      }
    });
    await page.goto('https://zuotiben.top/latex/?local=1', {
      waitUntil: 'domcontentloaded', timeout: 60000,
    });
    await page.getByTestId('browser-compile').waitFor({ timeout: 30000 });
    const tier = page.getByRole('combobox', { name: 'TeX Live 资源包' });
    await tier.selectOption('extra');
    if (await tier.inputValue() !== 'extra') throw Error('Extra TeX Live tier not selected');
    console.log('Selected GitHub-hosted Basic + Recommended + Extra tier.');
    const source = [
      '\\documentclass[12pt,a4paper]{ctexart}',
      '\\usepackage{amsmath,amssymb}',
      '\\usepackage{tikz}',
      '\\usepackage{multirow}',
      '\\begin{document}',
      '\\section*{数学二：浏览器编译测试}',
      '中文字体、公式、图形和表格都应该显示。',
      '\\[',
      '\\int_0^1 x^2\\,\\mathrm{d}x=\\frac{1}{3}',
      '\\]',
      '\\begin{tikzpicture}',
      '\\draw (0,0) rectangle (2,1);',
      '\\draw (0,0) -- (2,1);',
      '\\end{tikzpicture}',
      '\\begin{tabular}{|c|c|}',
      '\\hline',
      '\\multirow{2}{*}{测试}& A \\\\',
      '\\cline{2-2}',
      '& B \\\\',
      '\\hline',
      '\\end{tabular}',
      '\\end{document}'
    ].join('\n');
    await page.locator('.code-pane [contenteditable="true"][aria-label="main.tex"]').fill(source);
    await page.getByTestId('browser-compile').click();
    await page.waitForFunction(() => {
      const status = document.querySelector('.browser-aldine__status-text')?.textContent || '';
      return status.includes('编译成功') || status.includes('编译失败') || status.includes('浏览器编译失败');
    }, { timeout: 600000 });
    const status = await page.locator('.browser-aldine__status-text').textContent();
    await page.getByRole('button', { name: /日志/ }).last().click().catch(() => {});
    const log = await page.getByTestId('browser-compile-log').textContent().catch(() => '');
    console.log('Compilation status:', status);
    console.log('Compilation log tail:', log?.slice(-5500));
    console.log('Collection responses:', JSON.stringify(requestedData));
    console.log('Page errors:', JSON.stringify(errorEvents.slice(0, 8)));
    if (!requestedData.some(x => x.url.includes('texlive-extra.data') && x.status === 200)) {
      throw Error('Explicit Extra tier was not downloaded; resolver might still prune user-selected bundles.');
    }
    if (!status?.includes('编译成功')) {
      throw Error('Synthetic Everflow-like XeLaTeX compile failed: ' + status);
    }
    const pdf = await page.evaluate(async () => {
      const link = document.querySelector('a[download$=".pdf"]');
      if (!link?.href) throw Error('Missing generated PDF link');
      return [...new Uint8Array(await (await fetch(link.href)).arrayBuffer())];
    });
    const file = '/tmp/everflow-like-extra.pdf';
    fs.writeFileSync(file, Buffer.from(pdf));
    const extracted = execFileSync('pdftotext', ['-layout', file, '-'], { encoding: 'utf8' });
    const fonts = execFileSync('pdffonts', [file], { encoding: 'utf8' });
    console.log('Chinese extracted from PDF:', JSON.stringify(extracted.slice(0, 1500)));
    console.log('Embedded fonts:', fonts.slice(0, 1800));
    if (!extracted.includes('数学二') || !extracted.includes('中文字体')) {
      throw Error('PDF missing expected Chinese glyphs or Unicode mapping');
    }
    console.log('PASS: Extra TeX Live requested from GitHub Pages, synthetic CJK+TikZ+multirow PDF compiled with embedded text.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
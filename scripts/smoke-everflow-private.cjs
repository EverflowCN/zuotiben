/**
 * Private, temporary E2E verification of the user's original Everflow ZIP.
 * Loads source only inside a GitHub-hosted ephemeral browser process.
 * The source, LaTeX logs, PDF and screenshots are NEVER published/artifacted.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const { execFileSync } = require('child_process');
const file = process.env.PRIVATE_TEMPLATE_ZIP;
if (!file || !fs.existsSync(file)) throw Error('Private template file unavailable in ephemeral runner storage');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-dev-shm-usage', '--js-flags=--max-old-space-size=4096'],
  });
  let pageCrashed = false;
  try {
    const page = await browser.newPage({ viewport: { width: 1470, height: 910 }, acceptDownloads: true });
    page.on('crash', () => { pageCrashed = true; });
    page.on('dialog', d => d.accept());
    await page.goto('https://zuotiben.top/latex/?local=1', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.getByTestId('browser-compile').waitFor({ timeout: 45000 });
    await page.locator('input[type="file"][accept*="application/zip"]').setInputFiles({
      name: 'Everflow-template-private.zip',
      mimeType: 'application/zip',
      buffer: fs.readFileSync(file)
    });
    await page.waitForFunction(() => {
      const status = document.querySelector('.browser-aldine__status-text')?.textContent || '';
      return status.includes('ZIP 已导入') || status.includes('ZIP 导入失败');
    }, null, { timeout: 90000 });
    const zipStatus = await page.locator('.browser-aldine__status-text').textContent();
    if (!zipStatus?.includes('ZIP 已导入')) {
      console.log('Private ZIP import: FAILED (details redacted)');
      throw Error('Could not load user ZIP into local browser workspace');
    }
    const root = page.getByRole('combobox', { name: '主文档' });
    const entryOptions = await root.locator('option').allTextContents();
    if (!entryOptions.some(x => x.trim() === 'Everflow-Exam.tex')) throw Error('No Exam entrypoint in private input');
    const preferredAutomatically = await root.inputValue() === 'Everflow-Exam.tex';
    if (!preferredAutomatically) await root.selectOption('Everflow-Exam.tex');
    console.log('Private ZIP imported; Exam root auto-selection:', preferredAutomatically ? 'yes' : 'manual fallback');

    await page.getByRole('combobox', { name: '编译器' }).selectOption('xelatex');
    await page.getByRole('combobox', { name: 'TeX Live 资源包' }).selectOption('extra');
    const compileButton = page.getByTestId('browser-compile');
    await compileButton.click();
    console.log('Started original private Exam mode with GitHub-hosted Extra resources; no source disclosed.');
    await page.waitForFunction(() => {
      const status = document.querySelector('.browser-aldine__status-text')?.textContent || '';
      return status.includes('编译成功') || status.includes('编译失败') || status.includes('浏览器编译失败');
    }, null, { timeout: 16 * 60 * 1000 });
    const status = await page.locator('.browser-aldine__status-text').textContent();
    const successful = Boolean(status?.includes('编译成功'));
    console.log('Original Everflow Exam compile success:', successful);
    if (!successful) {
      const log = await page.getByTestId('browser-compile-log').textContent().catch(() => '');
      const categories = {
        missingTexAsset: /(?:File .* not found|cannot find file|kpsewhich|not found)/i.test(log),
        fontError: /(?:fontspec error|font .* not found|missing character|cannot find font)/i.test(log),
        memoryError: /(?:out of memory|memory access out of bounds|wasm.*abort|TeX capacity exceeded)/i.test(log),
        generalLaTeXError: /(?:Emergency stop|undefined control sequence|Fatal error)/i.test(log),
        browserCrashed: pageCrashed,
      };
      console.log('Private compile diagnostics (only booleans, no source/log text):', JSON.stringify(categories));
      throw Error('Full private Everflow Exam not confirmed compatible with BusyTeX; details redacted');
    }

    const pdfDownload = page.waitForEvent('download', { timeout: 45000 });
    await page.getByRole('link', { name: '下载 PDF' }).first().click();
    const download = await pdfDownload;
    const pdfPath = await download.path();
    if (!pdfPath) throw Error('Compiled private PDF not downloaded');
    const info = execFileSync('pdfinfo', [pdfPath], { encoding: 'utf8' });
    const pages = Number(info.match(/^Pages:\s+(\d+)/m)?.[1] || 0);
    const extracted = execFileSync('pdftotext', ['-layout', pdfPath, '-'], { encoding: 'utf8', maxBuffer: 25 * 1024 * 1024 });
    const readableCJK = /[\u3400-\u9fff]{3,}/u.test(extracted);
    const fonts = execFileSync('pdffonts', [pdfPath], { encoding: 'utf8' }).split(/\r?\n/);
    console.log(JSON.stringify({
      mode: 'Exam', successful: true, pages, readableChinese: readableCJK,
      embeddedFontRecords: Math.max(0, fonts.length - 3),
      expectedFromFullLocalTexLive: 58,
      pageCountMatchesLocalBaseline: pages === 58,
    }));
    if (!readableCJK) throw Error('Private PDF produced, but Chinese text was not extractable');
    if (pages < 3) throw Error('Private PDF did not contain a plausibly complete exam');
    console.log('PASS: Original private Everflow Exam compiled to a nontrivial Chinese PDF entirely in the browser.');
  } finally {
    await browser.close();
  }
})().catch((err) => {
  // Never dump TeX source, compile log, PDF, upload path or browser console.
  console.error('Private template test:', err.message);
  process.exitCode = 1;
});
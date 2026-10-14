import { BusyTexRunner, XeLatex } from './busytex-lib.mjs';

const el = (id) => document.getElementById(id);
const source = el('source');
const status = el('status');
const log = el('log');
const button = el('compile');
const preview = el('preview');
const download = el('download');

source.value = [
  '\\documentclass[12pt,a4paper]{article}',
  '\\usepackage{amsmath,amssymb}',
  '\\begin{document}',
  '\\section*{Everflow Browser XeLaTeX}',
  'A browser-generated PDF with a mathematical formula:',
  '\\[',
  '  \\int_0^1 x^2\\,dx = \\frac{1}{3}.',
  '\\]',
  '\\end{document}'
].join('\n');

let runner = null;
let compiler = null;
let pdfUrl = null;
let busy = false;
function note(message) { status.textContent = message; }
async function ensureEngine() {
  if (compiler) return;
  const base = '/latex/browser-test/core/busytex';
  note('正在下载 XeLaTeX WebAssembly 和基础宏包（首次约 120 MB）…');
  runner = new BusyTexRunner({
    busytexBasePath: base,
    preloadDataPackages: [base + '/texlive-basic.js'],
    engineMode: 'combined',
    onDownloadProgress: ({ percent }) => note('正在准备 TeX Live：' + percent + '%')
  });
  await runner.initialize(true);
  compiler = new XeLatex(runner);
  note('本地编译引擎已加载。');
}
button.addEventListener('click', async () => {
  if (busy) return;
  busy = true;
  button.disabled = true;
  download.hidden = true;
  log.textContent = '准备编译…';
  try {
    await ensureEngine();
    note('正在本机执行 XeLaTeX…');
    const result = await compiler.compile({
      input: source.value,
      rerun: true,
      verbose: 'info',
      remoteEndpoint: el('remote').checked ? 'https://texlive2026.texlyre.org' : undefined
    });
    log.textContent = result.log || JSON.stringify(result.logs || [], null, 2);
    if (!result.success || !result.pdf?.length) {
      note('编译失败：请检查字体、宏包或 LaTeX 语法。');
      return;
    }
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    pdfUrl = URL.createObjectURL(new Blob([result.pdf], { type: 'application/pdf' }));
    preview.src = pdfUrl;
    download.hidden = false;
    note('编译成功！PDF 在浏览器本机生成。');
  } catch (e) {
    log.textContent = e?.stack || String(e);
    note('编译器加载或运行失败；请检查浏览器内存和下方日志。');
  } finally {
    busy = false;
    button.disabled = false;
  }
});
el('file').addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  if (file.size > 1024 * 1024) { note('文件超过 1 MB，请使用较小的 .tex 文件。'); return; }
  source.value = await file.text();
  note('已载入 ' + file.name + '，可以开始编译。');
});
download.addEventListener('click', () => {
  if (!pdfUrl) return;
  const a = document.createElement('a');
  a.href = pdfUrl;
  a.download = 'everflow-browser-xelatex.pdf';
  a.click();
});
window.addEventListener('pagehide', () => {
  if (pdfUrl) URL.revokeObjectURL(pdfUrl);
  runner?.terminate();
});

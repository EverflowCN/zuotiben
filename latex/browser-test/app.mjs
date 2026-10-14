import { BusyTexRunner, XeLatex, isPackageCached } from './busytex-lib.mjs';
import { prepareBusyTeXCache, getBusyTeXCacheStatus } from '../busytex-cache.mjs';

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

const cacheInit = prepareBusyTeXCache((progress) => {
  if (progress.phase === 'evicted') note('检测到缓存缺失，正在自动恢复…');
  if (progress.phase === 'repairing') note('正在恢复本地编译资源：' + (progress.file || ''));
  if (progress.phase === 'restored') note('已自动恢复被清理的编译资源。');
  if (progress.phase === 'repair-failed') note('自动恢复未完成，下次编译将重新下载缺失资源。');
  if (progress.phase === 'persistence' && progress.granted) note('已获得浏览器持久存储授权，无需手动设置。');
}).catch(() => null);
let runner = null;
let compiler = null;
let pdfUrl = null;
let busy = false;
function note(message) { status.textContent = message; }
async function ensureEngine() {
  if (compiler) return;
  const base = '/latex/browser-test/core/busytex';
  const cache = await cacheInit;
  const basicCached = await isPackageCached(base + '/texlive-basic.js').catch(() => false);
  note(cache?.coreCached || basicCached ? '本地缓存已找到，正在重新初始化 XeLaTeX…' : '首次使用需获取约 120 MB 资源，成功后将保存于浏览器缓存…');
  runner = new BusyTexRunner({
    busytexBasePath: base,
    preloadDataPackages: [base + '/texlive-basic.js'],
    engineMode: 'combined',
    onDownloadProgress: ({ percent }) => note('正在准备 TeX Live：' + percent + '%')
  });
  await runner.initialize(true);
  compiler = new XeLatex(runner);
  const cacheStatus = await getBusyTeXCacheStatus();
  note(cacheStatus.coreCached
    ? cacheStatus.persistent ? '编译器已就绪，持久存储已授权。' : '编译器已就绪，资源已缓存；浏览器可能限制长期存储。'
    : '编译器已就绪；缺失资源将自动补齐并缓存。');
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

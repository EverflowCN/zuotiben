/* Everflow BusyTeX persistent runtime cache.
 * Scope: /latex/ only. Never intercepts user projects, auth, API, or HTML.
 * Cache key is tied to the pinned upstream BusyTeX WebAssembly release.
 */
const CACHE_NAME = 'everflow-busytex-core-v1.4.0-46ebb621-v1';
const PREFIX = '/latex/browser-test/core/busytex/';
const TEXLIVE_REMOTE_ORIGIN = 'https://texlive2026.texlyre.org';
const REMOTE_CACHE_NAME = 'everflow-busytex-remote-texlive2026-v1';
const CACHE_FILES = new Set([
  'busytex.wasm',
  'busytex.js',
  'busytex_worker.js',
  'busytex_pipeline.js',
  'busytex_biber.js',
  'texlive-basic.data',
  'texlive-basic.js',
  // Optional 190MB/330MB data packages are cached by Emscripten IndexedDB,
  // not duplicated in CacheStorage; cache only their small JS loaders here.
  'texlive-recommended.js',
  'texlive-extra.js',
  'dvipdfmx.cfg',
  'texmf.cnf',
  'updmap.cfg',
]);
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((n) => n.startsWith('everflow-busytex-core-') && n !== CACHE_NAME).map((n) => caches.delete(n)));
    await Promise.all(names.filter((n) => n.startsWith('everflow-busytex-remote-') && n !== REMOTE_CACHE_NAME).map((n) => caches.delete(n)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  // Extra LaTeX fonts/macros that are not covered by the GitHub Basic/Recommended/Extra
  // collections are requested as GET /<format>/<filename> from the official
  // TeX Live 2026 file endpoint. Keep successful CORS responses so closing
  // and reopening the editor does not re-download the same missing packages.
  // Never cache user documents, third-party arbitrary URLs, or 301 "not found".
  if (url.origin === TEXLIVE_REMOTE_ORIGIN &&
      /^\\/\\d{1,3}\\/[a-zA-Z0-9_.+%-]{1,240}$/.test(url.pathname) &&
      !url.search && !url.hash && request.credentials !== 'include') {
    event.respondWith((async () => {
      const cache = await caches.open(REMOTE_CACHE_NAME);
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      const length = Number(response.headers.get('content-length') || 0);
      if (response.ok && response.type === 'cors' &&
          Number.isFinite(length) && length <= 16 * 1024 * 1024) {
        event.waitUntil(cache.put(request, response.clone()).catch((e) => {
          console.warn('[Everflow] Optional TeX Live file cache unavailable:', String(e));
        }));
      }
      return response;
    })());
    return;
  }
  if (url.origin !== self.location.origin || !url.pathname.startsWith(PREFIX)) return;
  const filename = url.pathname.slice(PREFIX.length);
  if (!CACHE_FILES.has(filename)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const match = await cache.match(request);
    if (match) return match;
    const response = await fetch(request);
    if (response.ok && response.type === 'basic') {
      // CacheStorage is best-effort; quota/storage-policy failures must not break compilation.
      event.waitUntil(cache.put(request, response.clone()).catch((e) => {
        console.warn('[Everflow] BusyTeX offline cache unavailable:', String(e));
      }));
    }
    return response;
  })());
});

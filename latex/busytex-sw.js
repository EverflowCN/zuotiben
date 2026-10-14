/* Everflow BusyTeX persistent runtime cache.
 * Scope: /latex/ only. Never intercepts user projects, auth, API, or HTML.
 * Cache key is tied to the pinned upstream BusyTeX WebAssembly release.
 */
const CACHE_NAME = 'everflow-busytex-core-v1.4.0-46ebb621-v1';
const PREFIX = '/latex/browser-test/core/busytex/';
const CACHE_FILES = new Set([
  'busytex.wasm',
  'busytex.js',
  'busytex_worker.js',
  'busytex_pipeline.js',
  'busytex_biber.js',
  'texlive-basic.data',
  'texlive-basic.js',
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
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
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

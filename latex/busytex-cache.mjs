/** Persistent browser cache status for BusyTeX, independent of Aldine server API. */
export const BUSYTEX_CACHE_NAME = 'everflow-busytex-core-v1.4.0-46ebb621-v1';
const ROOT = '/latex/browser-test/core/busytex/';
const DATA_URL = ROOT + 'texlive-basic.data';
const WASM_URL = ROOT + 'busytex.wasm';
let registering = null;
let statusPromise = null;
export async function getBusyTeXCacheStatus() {
  if (!('caches' in window)) return { supported: false, coreCached: false, dataCached: false, wasmCached: false, persistent: false };
  try {
    const [data, wasm] = await Promise.all([caches.match(DATA_URL), caches.match(WASM_URL)]);
    const persistent = 'storage' in navigator && 'persisted' in navigator.storage
      ? await navigator.storage.persisted().catch(() => false)
      : false;
    return { supported: true, dataCached: Boolean(data), wasmCached: Boolean(wasm), coreCached: Boolean(data && wasm), persistent };
  } catch {
    return { supported: false, coreCached: false, dataCached: false, wasmCached: false, persistent: false };
  }
}
export async function prepareBusyTeXCache() {
  if (!('serviceWorker' in navigator) || !('caches' in window)) return await getBusyTeXCacheStatus();
  if (!registering) {
    registering = (async () => {
      try {
        const registration = await navigator.serviceWorker.register('/latex/busytex-sw.js', {
          scope: '/latex/',
          updateViaCache: 'none'
        });
        await navigator.serviceWorker.ready;
        if (!navigator.serviceWorker.controller) {
          await new Promise((resolve) => {
            let completed = false;
            const finish = () => {
              if (completed) return;
              completed = true;
              navigator.serviceWorker.removeEventListener('controllerchange', finish);
              clearTimeout(timer);
              resolve();
            };
            const timer = setTimeout(finish, 5500);
            navigator.serviceWorker.addEventListener('controllerchange', finish);
            if (navigator.serviceWorker.controller) finish();
          });
        }
        return Boolean(registration.active && navigator.serviceWorker.controller);
      } catch (err) {
        console.warn('[Everflow] Service worker cache unavailable:', err);
        return false;
      }
    })();
  }
  const controlling = await registering;
  const status = await getBusyTeXCacheStatus();
  return { ...status, controlling };
}
export async function requestBusyTeXPersistentStorage() {
  if (!navigator.storage || !navigator.storage.persist) return false;
  try { return await navigator.storage.persist(); } catch { return false; }
}

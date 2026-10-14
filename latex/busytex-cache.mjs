/**
 * Everflow BusyTeX cache manager.
 *
 * Automatically requests persistent origin storage (best effort); verifies
 * Cache Storage on every entry; and self-heals assets that were previously
 * cached but have since been evicted. There is NO web API which can promise
 * truly permanent storage, bypass a browser permission prompt, or prevent
 * someone from clearing site data.
 */
export const BUSYTEX_CACHE_NAME = 'everflow-busytex-core-v1.4.0-46ebb621-v1';
const ROOT = '/latex/browser-test/core/busytex/';
const VERSION_MARKER = 'everflow.busytex.cached.' + BUSYTEX_CACHE_NAME;
const PERSIST_ATTEMPT = 'everflow.busytex.persist-attempt';
const RETRY_INTERVAL_MS = 14 * 24 * 60 * 60 * 1000;
const ASSETS = [
  'busytex_worker.js', 'busytex_pipeline.js', 'busytex.js',
  'busytex.wasm', 'busytex_biber.js',
  'texlive-basic.js', 'texlive-basic.data',
  'texmf.cnf', 'dvipdfmx.cfg', 'updmap.cfg',
];
let registering = null;
let repairing = null;

function stored(key) {
  try { return window.localStorage.getItem(key); }
  catch { return null; }
}
function remember(key, value) {
  try { window.localStorage.setItem(key, value); }
  catch { /* Private browsing and storage-disabled browsers may reject writes. */ }
}
async function persisted() {
  try { return Boolean(await navigator.storage?.persisted?.()); }
  catch { return false; }
}

/** May be refused, or show browser-managed permission UI (e.g. Firefox). */
export async function requestBusyTeXPersistentStorage() {
  if (!navigator.storage?.persist) return false;
  if (await persisted()) return true;
  const last = Number(stored(PERSIST_ATTEMPT) || 0);
  // Do not repeatedly nag Firefox users who declined the permission prompt.
  if (last > 0 && Date.now() - last < RETRY_INTERVAL_MS) return false;
  remember(PERSIST_ATTEMPT, String(Date.now()));
  try { return Boolean(await navigator.storage.persist()); }
  catch { return false; }
}

export async function getBusyTeXCacheStatus() {
  if (!('caches' in window)) {
    return {
      supported: false, persistent: await persisted(), coreCached: false,
      wasmCached: false, dataCached: false, wasEvicted: false,
      missing: [...ASSETS]
    };
  }
  try {
    const cached = await Promise.all(ASSETS.map((name) => caches.match(ROOT + name)));
    const missing = ASSETS.filter((_, i) => !cached[i]);
    const wasmCached = Boolean(cached[ASSETS.indexOf('busytex.wasm')]);
    const dataCached = Boolean(cached[ASSETS.indexOf('texlive-basic.data')]);
    const coreCached = missing.length === 0;
    const wasEvicted = Boolean(stored(VERSION_MARKER)) && !coreCached;
    if (coreCached) remember(VERSION_MARKER, String(Date.now()));
    return {
      supported: true, persistent: await persisted(),
      coreCached, wasmCached, dataCached, wasEvicted, missing,
    };
  } catch {
    return {
      supported: false, persistent: await persisted(), coreCached: false,
      wasmCached: false, dataCached: false, wasEvicted: false,
      missing: [...ASSETS],
    };
  }
}

/**
 * Cache only the missing files, sequentially to reduce iOS memory pressure.
 * This is called automatically ONLY after a previous complete cache is found
 * missing. First-time downloads remain lazy, on the first compile.
 */
export async function repairBusyTeXCache(onProgress = () => {}) {
  if (repairing) return repairing;
  repairing = (async () => {
    if (!('caches' in window)) throw Error('Browser Cache Storage is unavailable');
    const cache = await caches.open(BUSYTEX_CACHE_NAME);
    let repaired = 0;
    for (const name of ASSETS) {
      const url = ROOT + name;
      if (await cache.match(url)) continue;
      onProgress({ phase: 'repairing', file: name, completed: repaired, total: ASSETS.length });
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok || response.type !== 'basic') throw Error('Cannot restore ' + name + ': HTTP ' + response.status);
      // Best effort against quota; if put fails, original compilation can
      // still use the successfully fetched bytes on demand.
      await cache.put(url, response);
      repaired++;
    }
    const state = await getBusyTeXCacheStatus();
    if (!state.coreCached) throw Error('Some BusyTeX runtime files remain missing');
    onProgress({ phase: 'restored', completed: repaired, total: ASSETS.length });
    return state;
  })();
  try { return await repairing; } finally { repairing = null; }
}

export async function prepareBusyTeXCache(onProgress = () => {}) {
  // A new visit must verify actual Cache Storage entries; a localStorage
  // "ready" flag alone would be wrong after eviction or partial downloads.
  if ('serviceWorker' in navigator && 'caches' in window) {
    if (!registering) {
      registering = (async () => {
        try {
          const registration = await navigator.serviceWorker.register('/latex/busytex-sw.js', {
            scope: '/latex/',
            updateViaCache: 'none',
          });
          await navigator.serviceWorker.ready;
          if (!navigator.serviceWorker.controller) {
            await new Promise((resolve) => {
              let done = false;
              const finish = () => {
                if (done) return;
                done = true;
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
          console.warn('[Everflow] Service Worker unavailable:', err);
          return false;
        }
      })();
    }
    await registering;
  }

  // Automatic, no bespoke "Keep cache" button; browser may still deny or
  // prompt because persistence is a browser-controlled permission.
  void requestBusyTeXPersistentStorage().then((granted) => {
    onProgress({ phase: 'persistence', granted });
  });
  let cache = await getBusyTeXCacheStatus();

  if (cache.wasEvicted && navigator.onLine !== false) {
    onProgress({ phase: 'evicted', missing: cache.missing });
    try {
      cache = await repairBusyTeXCache(onProgress);

    } catch (err) {
      onProgress({ phase: 'repair-failed', message: String(err) });
      console.warn('[Everflow] BusyTeX cache self-heal deferred until compilation:', err);
    }
  }
  return cache;
}

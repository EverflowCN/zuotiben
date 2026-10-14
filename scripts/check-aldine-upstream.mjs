/**
 * Verify a real Aldine API before allowing Cloudflare to route /latex/* to it.
 * Requires ALDINE_ORIGIN (e.g., https://aldine-origin.example.com).
 * Never uses the author's shared demo instance.
 */
const raw = process.env.ALDINE_ORIGIN;
if (!raw) throw Error('Missing ALDINE_ORIGIN. Configure a real self-hosted Aldine backend.');
const origin = new URL(raw);
if (origin.protocol !== 'https:' || origin.pathname !== '/' ||
    origin.username || origin.password || origin.search || origin.hash ||
    ['zuotiben.top', 'www.zuotiben.top', 'demo.aldine.dev'].includes(origin.hostname.toLowerCase())) {
  throw Error('ALDINE_ORIGIN must be an independent HTTPS Aldine server origin, not the main site or public demo.');
}
async function probe(route) {
  const url = new URL(route, origin);
  const response = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(10000), redirect: 'error' });
  if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) {
    throw Error(route + ' did not return a successful JSON response (' + response.status + ')');
  }
  return await response.json();
}
const health = await probe('/api/health');
const proxiedHealth = await probe('/latex/api/health');
const auth = await probe('/latex/api/auth/me');
if (health?.ok !== true || health?.name !== 'aldine' ||
    proxiedHealth?.ok !== true || proxiedHealth?.name !== 'aldine') {
  throw Error('Upstream is not an Aldine backend running with ALDINE_BASE_PATH=/latex.');
}
if (auth?.authEnabled !== true) {
  throw Error('Refusing to expose Aldine publicly without AUTH_ENABLED=1.');
}
console.log('Aldine verified: root health, /latex/ API health, login enabled.');

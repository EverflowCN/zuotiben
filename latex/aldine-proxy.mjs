/**
 * Everflow /latex → unmodified Aldine HTTP + WebSocket reverse proxy.
 * Aldine itself must be running separately with ALDINE_BASE_PATH=/latex.
 * All configuration is server-side. Never accept the target URL from the browser.
 */
export async function forwardAldine(request, env, fallback) {
  if (env?.ALDINE_PUBLIC_READY !== '1' || !env?.ALDINE_ORIGIN) {
    return fallback();
  }

  const inbound = new URL(request.url);
  if (inbound.pathname !== '/latex' && !inbound.pathname.startsWith('/latex/')) {
    return fallback();
  }
  if (inbound.pathname === '/latex') {
    return Response.redirect(inbound.origin + '/latex/' + inbound.search, 308);
  }

  let origin;
  try {
    origin = new URL(env.ALDINE_ORIGIN);
    if (origin.protocol !== 'https:' || origin.pathname !== '/' ||
        origin.search || origin.hash || origin.username || origin.password ||
        origin.origin === inbound.origin) {
      throw new Error('Invalid Aldine origin');
    }
  } catch {
    return new Response('Aldine upstream configuration is invalid.', {
      status: 503, headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' }
    });
  }

  // Preserve the public /latex prefix: Aldine is configured with the same base path.
  const upstream = new URL(inbound.pathname + inbound.search, origin);
  try {
    const outgoing = new Request(upstream.toString(), request);
    // Cloudflare Workers fetch() supports WebSocket upgrades via Request cloning.
    const response = await fetch(outgoing, { redirect: 'manual' });

    // Rewrite same-upstream redirects to keep navigation on zuotiben.top.
    const location = response.headers.get('location');
    if (location && response.status >= 300 && response.status < 400) {
      const destination = new URL(location, upstream);
      if (destination.origin === origin.origin) {
        destination.protocol = inbound.protocol;
        destination.host = inbound.host;
        const headers = new Headers(response.headers);
        headers.set('location', destination.toString());
        return new Response(response.body, { status: response.status, headers });
      }
    }
    return response;
  } catch {
    return new Response('Aldine service is not reachable. Please check the backend.', {
      status: 502, headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' }
    });
  }
}

import { forwardAldine } from './aldine-proxy.mjs';

/**
 * Deploy as a separate Cloudflare Worker and bind zone route:
 * zuotiben.top/latex*
 *
 * Bind ALDINE_ORIGIN (https://your-aldine-origin.example.com/)
 * and ALDINE_PUBLIC_READY=1 *only after* Aldine login and
 * ALDINE_BASE_PATH=/latex have been verified.
 *
 * Not deployed automatically by the GitHub Pages workflow.
 */
export default {
  fetch(request, env) {
    return forwardAldine(request, env, () => new Response(
      'Aldine reverse proxy has not been enabled.', {
        status: 503,
        headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' }
      }
    ));
  }
};

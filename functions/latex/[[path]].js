import { forwardAldine } from '../../latex/aldine-proxy.mjs';

/** /latex/*: API, assets, deep links and WebSocket collaboration. */
export function onRequest(context) {
  return forwardAldine(context.request, context.env, () => context.next());
}

import { forwardAldine } from '../latex/aldine-proxy.mjs';

/** /latex and /latex/: forward to Aldine only when explicitly enabled. */
export function onRequest(context) {
  return forwardAldine(context.request, context.env, () => context.next());
}

const supportsTypst = () =>
  typeof WebAssembly === "object" &&
  typeof Worker === "function" &&
  typeof URL === "function";

let worker = null;
let serial = 0;
const pending = new Map();

function ensureWorker() {
  if (!supportsTypst()) throw new Error("当前浏览器不支持本地 Typst WASM");
  if (worker) return worker;
  worker = new Worker(new URL("./typst-worker.js?v=20260921-worker8", import.meta.url), { type: "module", name: "everflow-typst" });
  worker.onmessage = event => {
    const msg = event.data || {};
    const item = pending.get(msg.id);
    if (!item) return;
    pending.delete(msg.id);
    if (msg.ok) item.resolve(msg);
    else item.reject(new Error(msg.error || "Typst 本地编译失败"));
  };
  worker.onerror = error => {
    for (const item of pending.values()) item.reject(new Error(error.message || "Typst Worker 异常"));
    pending.clear();
    worker?.terminate();
    worker = null;
  };
  return worker;
}

function request(op, state, spec, extra = {}) {
  const w = ensureWorker();
  const id = "typst-" + Date.now().toString(36) + "-" + (++serial).toString(36);
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    w.postMessage({ id, op, state, spec, ...extra });
  });
}

export function typstSupported() {
  return supportsTypst();
}

export async function compileTypstPdf(state, spec, sourceHash) {
  const result = await request("pdf", state, spec, { sourceHash });
  return new Blob([result.pdf], { type: "application/pdf" });
}

export async function compileTypstSvg(state, spec, sourceHash) {
  const result = await request("svg", state, spec, { sourceHash });
  return result.svg;
}

export async function compileTypstBoth(state, spec, sourceHash) {
  const result = await request("both", state, spec, { sourceHash });
  return {
    svg: result.svg,
    pdf: new Blob([result.pdf], { type: "application/pdf" }),
  };
}

export async function getTypstSource(state, spec) {
  const result = await request("source", state, spec);
  return result.source;
}

export function disposeTypstWorker() {
  if (worker) worker.terminate();
  worker = null;
  for (const item of pending.values()) item.reject(new Error("Typst Worker 已关闭"));
  pending.clear();
}

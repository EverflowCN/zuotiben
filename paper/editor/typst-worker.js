import { $typst, TypstSnippet, FetchAccessModel } from "../assets/vendor/typst/typst-all-in-one-lite.js";
import { buildTypstSource } from "./typst-template.js";

let readyPromise = null;

function assetUrl(path) {
  return new URL("../assets/" + path.replace(/^\/+/, ""), import.meta.url).href;
}

function editorUrl(path) {
  return new URL(path, import.meta.url).href;
}

function bytesToBase64(bytes) {
  let out = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    out += String.fromCharCode(...bytes.subarray(i, Math.min(bytes.length, i + chunk)));
  }
  return btoa(out);
}

async function mapWatermark() {
  const response = await fetch(assetUrl("watermark/water.png"), { cache: "force-cache" });
  if (!response.ok) throw new Error("无法加载固定水印");
  const bytes = new Uint8Array(await response.arrayBuffer());
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="175" height="900" viewBox="0 0 175 900">' +
    '<image href="data:image/png;base64,' + bytesToBase64(bytes) +
    '" width="175" height="900" opacity="0.09" preserveAspectRatio="xMidYMid meet"/></svg>';
  await $typst.mapShadow("/watermark/water-9.svg", new TextEncoder().encode(svg));
}

async function addMotherTemplate() {
  const response = await fetch(editorUrl("./everflow-template.typ"), { cache: "no-cache" });
  if (!response.ok) throw new Error("无法加载 Everflow Typst 母版");
  await $typst.addSource("/everflow-template.typ", await response.text());
}

async function initTypst() {
  if (readyPromise) return readyPromise;
  readyPromise = (async () => {
    $typst.setCompilerInitOptions({
      getModule: () => assetUrl("vendor/typst/typst_ts_web_compiler_bg.wasm"),
    });
    $typst.setRendererInitOptions({
      getModule: () => assetUrl("vendor/typst/typst_ts_renderer_bg.wasm"),
    });

    const root = new URL("../assets", import.meta.url).href.replace(/\/$/, "");
    $typst.use(
      TypstSnippet.withAccessModel(new FetchAccessModel(root)),
      TypstSnippet.disableDefaultFontAssets(),
      TypstSnippet.preloadFonts([
        assetUrl("vendor/typst/fonts/FandolSong-Regular.otf"),
        assetUrl("vendor/typst/fonts/FandolSong-Bold.otf"),
        assetUrl("vendor/typst/fonts/FandolHei-Regular.otf"),
        assetUrl("vendor/typst/fonts/FandolHei-Bold.otf"),
        assetUrl("vendor/typst/fonts/FandolKai-Regular.otf"),
        assetUrl("vendor/typst/fonts/TeXGyreTermesX-Regular.otf"),
        assetUrl("vendor/typst/fonts/TeXGyreTermesX-Bold.otf"),
        assetUrl("vendor/typst/fonts/TeXGyreTermesX-Italic.otf"),
        assetUrl("vendor/typst/fonts/XITS-Regular.otf"),
        assetUrl("vendor/typst/fonts/XITS-Bold.otf"),
        assetUrl("vendor/typst/fonts/XITSMath-Regular.otf"),
      ]),
    );

    await $typst.getCompiler();
    await Promise.all([addMotherTemplate(), mapWatermark()]);
    return true;
  })();
  return readyPromise;
}

function transferableCopy(data) {
  const src = data instanceof Uint8Array ? data : new Uint8Array(data);
  const copy = new Uint8Array(src.byteLength);
  copy.set(src);
  return copy;
}

async function renderSvg(source) {
  const vector = await $typst.vector({ mainContent: source });
  return await $typst.svg({ vectorData: vector });
}

self.onmessage = async event => {
  const msg = event.data || {};
  const id = msg.id;
  try {
    if (!id) throw new Error("missing request id");
    await initTypst();
    const source = buildTypstSource(msg.state || {}, msg.spec || {});

    if (msg.op === "source") {
      self.postMessage({ id, ok: true, source });
      return;
    }

    if (msg.op === "svg") {
      const svg = await renderSvg(source);
      self.postMessage({ id, ok: true, svg, sourceHash: msg.sourceHash || null });
      return;
    }

    if (msg.op === "pdf") {
      const bytes = transferableCopy(await $typst.pdf({ mainContent: source }));
      self.postMessage({ id, ok: true, pdf: bytes.buffer, sourceHash: msg.sourceHash || null }, [bytes.buffer]);
      return;
    }

    if (msg.op === "both") {
      const svg = await renderSvg(source);
      const bytes = transferableCopy(await $typst.pdf({ mainContent: source }));
      self.postMessage(
        { id, ok: true, svg, pdf: bytes.buffer, sourceHash: msg.sourceHash || null },
        [bytes.buffer],
      );
      return;
    }

    throw new Error("unsupported Typst worker operation");
  } catch (error) {
    self.postMessage({
      id,
      ok: false,
      error: error && error.message ? error.message : String(error),
      stack: error && error.stack ? error.stack : "",
    });
  }
};

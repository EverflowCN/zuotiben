import { $typst, TypstSnippet, FetchAccessModel } from "../assets/vendor/typst/typst-all-in-one-lite.js";
import { buildTypstSource } from "./typst-template.js";

let readyPromise = null;

function assetUrl(path) {
  return new URL("../assets/" + path.replace(/^\/+/, ""), import.meta.url).href;
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
        assetUrl("vendor/typst/fonts/XITS-Regular.otf"),
        assetUrl("vendor/typst/fonts/XITS-Bold.otf"),
        assetUrl("vendor/typst/fonts/XITSMath-Regular.otf"),
      ]),
    );

    // Force compiler initialization now so failures are reported before first edit.
    await $typst.getCompiler();
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
      const svg = await $typst.svg({ mainContent: source });
      self.postMessage({ id, ok: true, svg, sourceHash: msg.sourceHash || null });
      return;
    }
    if (msg.op === "pdf") {
      const bytes = transferableCopy(await $typst.pdf({ mainContent: source }));
      self.postMessage({ id, ok: true, pdf: bytes.buffer, sourceHash: msg.sourceHash || null }, [bytes.buffer]);
      return;
    }
    if (msg.op === "both") {
      const svg = await $typst.svg({ mainContent: source });
      const bytes = transferableCopy(await $typst.pdf({ mainContent: source }));
      self.postMessage({ id, ok: true, svg, pdf: bytes.buffer, sourceHash: msg.sourceHash || null }, [bytes.buffer]);
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

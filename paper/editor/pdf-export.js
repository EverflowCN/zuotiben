import React from "https://esm.sh/react@19.1.1";
import {
  Document, Page, Text, View, Image, Font, StyleSheet, pdf
} from "https://esm.sh/@react-pdf/renderer@4.9.0?deps=react@19.1.1";
import { Math as PdfMath } from "https://esm.sh/@react-pdf/math@6.0.0?deps=react@19.1.1,@react-pdf/renderer@4.9.0";
import QRCode from "https://esm.sh/qrcode@1.5.4";

const h = React.createElement;
const MM = 72 / 25.4;
let fontsRegistered = false;
let qrPromise = null;

const FONT_URLS = {
  termesRegular: "https://cdn.jsdelivr.net/gh/fred-wang/MathFonts@98197e063ef6f61c8232b9ade256c6b4107641c6/TeXGyreTermes/texgyretermes-regular.woff",
  termesBold: "https://cdn.jsdelivr.net/gh/fred-wang/MathFonts@98197e063ef6f61c8232b9ade256c6b4107641c6/TeXGyreTermes/texgyretermes-bold.woff",
  termesItalic: "https://cdn.jsdelivr.net/gh/fred-wang/MathFonts@98197e063ef6f61c8232b9ade256c6b4107641c6/TeXGyreTermes/texgyretermes-italic.woff",
  termesBoldItalic: "https://cdn.jsdelivr.net/gh/fred-wang/MathFonts@98197e063ef6f61c8232b9ade256c6b4107641c6/TeXGyreTermes/texgyretermes-bolditalic.woff",
  notoSerifRegular: "https://cdn.jsdelivr.net/npm/@fontsource/noto-serif-sc@5.2.9/files/noto-serif-sc-chinese-simplified-400-normal.woff",
  notoSerifBold: "https://cdn.jsdelivr.net/npm/@fontsource/noto-serif-sc@5.2.9/files/noto-serif-sc-chinese-simplified-700-normal.woff",
  notoSansRegular: "https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-sc@5.2.5/files/noto-sans-sc-chinese-simplified-400-normal.woff",
  notoSansBold: "https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-sc@5.2.5/files/noto-sans-sc-chinese-simplified-700-normal.woff"
};

function registerFonts() {
  if (fontsRegistered) return;
  Font.register({
    family: "EverflowTermes",
    fonts: [
      { src: FONT_URLS.termesRegular, fontWeight: 400 },
      { src: FONT_URLS.termesBold, fontWeight: 700 },
      { src: FONT_URLS.termesItalic, fontStyle: "italic", fontWeight: 400 },
      { src: FONT_URLS.termesBoldItalic, fontStyle: "italic", fontWeight: 700 }
    ]
  });
  Font.register({
    family: "EverflowNotoSerif",
    fonts: [
      { src: FONT_URLS.notoSerifRegular, fontWeight: 400 },
      { src: FONT_URLS.notoSerifBold, fontWeight: 700 }
    ]
  });
  Font.register({
    family: "EverflowNotoSans",
    fonts: [
      { src: FONT_URLS.notoSansRegular, fontWeight: 400 },
      { src: FONT_URLS.notoSansBold, fontWeight: 700 }
    ]
  });
  Font.registerHyphenationCallback(word => [word]);
  fontsRegistered = true;
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 16 * MM,
    paddingRight: 20 * MM,
    paddingBottom: 12 * MM,
    paddingLeft: 20 * MM,
    backgroundColor: "#ffffff",
    color: "#111111",
    fontSize: 10.5,
    lineHeight: 1.76
  },
  header: {
    position: "absolute",
    top: 4.4 * MM,
    left: 20 * MM,
    right: 20 * MM,
    height: 4.5 * MM,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center"
  },
  title: {
    marginTop: 3.5 * MM,
    marginBottom: 3 * MM,
    textAlign: "center",
    fontSize: 13,
    lineHeight: 1.2,
    fontWeight: 700
  },
  question: { marginBottom: 2.95 * MM },
  questionRow: { flexDirection: "row", alignItems: "flex-start" },
  questionNumber: {
    width: 2.25 * 10.5,
    paddingRight: 0.55 * 10.5,
    fontFamily: "EverflowTermes",
    fontWeight: 700,
    fontSize: 10.5,
    lineHeight: 1.76
  },
  questionBody: { flexGrow: 1, flexShrink: 1, minWidth: 0 },
  paragraph: { fontSize: 10.5, lineHeight: 1.76, marginBottom: 1.8 * MM },
  inlineRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "baseline",
    marginBottom: 1.8 * MM
  },
  optionArea: { marginTop: 2.95 * MM, marginLeft: (2.25 + 0.55) * 10.5 },
  optionRow: { flexDirection: "row", width: "100%" },
  optionCell: { paddingRight: 8, paddingBottom: 2 },
  footer: {
    position: "absolute",
    left: 20 * MM,
    right: 20 * MM,
    bottom: 3.6 * MM,
    height: 4 * MM,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center"
  },
  qrWrap: {
    position: "absolute",
    left: 3 * MM,
    bottom: 5.8 * MM,
    width: 15 * MM,
    alignItems: "center"
  },
  qr: { width: 13 * MM, height: 13 * MM },
  qrLabel: { marginTop: 0.7 * MM, fontSize: 5.8, lineHeight: 1 },
  watermark: {
    position: "absolute",
    right: 13 * MM,
    bottom: 30 * MM,
    width: 6.62 * MM,
    height: 34 * MM,
    opacity: 0.09
  }
});

function isCjkChar(ch) {
  const cp = ch.codePointAt(0);
  return cp > 0x7f;
}

function splitFontRuns(text) {
  const chars = Array.from(String(text || ""));
  if (!chars.length) return [];
  const out = [];
  let current = chars[0];
  let cjk = isCjkChar(chars[0]);
  for (let i = 1; i < chars.length; i++) {
    const nextCjk = isCjkChar(chars[i]);
    if (nextCjk === cjk) current += chars[i];
    else {
      out.push({ text: current, cjk });
      current = chars[i];
      cjk = nextCjk;
    }
  }
  out.push({ text: current, cjk });
  return out;
}

function mixedText(text, options = {}) {
  const {
    key = "mixed",
    size = 10.5,
    lineHeight = 1.76,
    bold = false,
    sans = false,
    style = {}
  } = options;
  const runs = splitFontRuns(text);
  return h(
    Text,
    { key, style: [{ fontSize: size, lineHeight }, style] },
    ...runs.map((run, i) =>
      h(
        Text,
        {
          key: `${key}-${i}`,
          style: {
            fontFamily: run.cjk ? (sans ? "EverflowNotoSans" : "EverflowNotoSerif") : "EverflowTermes",
            fontWeight: bold ? 700 : 400
          }
        },
        run.text
      )
    )
  );
}

function parseInlineMath(line) {
  const text = String(line || "");
  const re = /(\$[^$\n]+\$|\\\([^]*?\\\))/g;
  const parts = [];
  let last = 0;
  let match;
  while ((match = re.exec(text))) {
    if (match.index > last) parts.push({ type: "text", value: text.slice(last, match.index) });
    const raw = match[0];
    parts.push({
      type: "math",
      value: raw.startsWith("$") ? raw.slice(1, -1) : raw.slice(2, -2)
    });
    last = match.index + raw.length;
  }
  if (last < text.length) parts.push({ type: "text", value: text.slice(last) });
  return parts;
}

function renderInlineLine(line, key, prefix = "") {
  const parts = parseInlineMath(line);
  if (!parts.some(p => p.type === "math")) {
    return mixedText(prefix + line, { key, style: styles.paragraph });
  }
  const children = [];
  if (prefix) children.push(mixedText(prefix, { key: `${key}-prefix` }));
  parts.forEach((part, i) => {
    if (part.type === "math") {
      children.push(h(PdfMath, {
        key: `${key}-m-${i}`,
        inline: true,
        height: 10.5,
        color: "#111111"
      }, part.value));
    } else if (part.value) {
      children.push(mixedText(part.value, { key: `${key}-t-${i}` }));
    }
  });
  return h(View, { key, style: styles.inlineRow }, ...children);
}

function contentBlocks(text) {
  const source = String(text || "");
  const re = /(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\])/g;
  const out = [];
  let last = 0;
  let m;
  while ((m = re.exec(source))) {
    if (m.index > last) out.push({ type: "text", value: source.slice(last, m.index) });
    const raw = m[0];
    out.push({
      type: "displayMath",
      value: raw.startsWith("$$") ? raw.slice(2, -2) : raw.slice(2, -2)
    });
    last = m.index + raw.length;
  }
  if (last < source.length) out.push({ type: "text", value: source.slice(last) });
  return out;
}

function renderQuestionBody(content, qIndex) {
  const nodes = [];
  let serial = 0;
  contentBlocks(content).forEach(block => {
    if (block.type === "displayMath") {
      nodes.push(h(View, {
        key: `q${qIndex}-display-${serial++}`,
        style: { marginBottom: 1.8 * MM, alignItems: "center" }
      }, h(PdfMath, { height: 20, color: "#111111" }, block.value.trim())));
      return;
    }
    block.value.split(/\n+/).forEach(line => {
      if (!line.trim()) return;
      nodes.push(renderInlineLine(line.trim(), `q${qIndex}-line-${serial++}`));
    });
  });
  return nodes.length ? nodes : [mixedText("（空题干）", { key: `q${qIndex}-empty`, style: styles.paragraph })];
}

function optionColumns(options) {
  const max = options.reduce((m, o) => Math.max(m, String(o || "").replace(/\s+/g, "").length), 0);
  return max <= 14 ? 4 : max <= 34 ? 2 : 1;
}

function renderOptions(options, qIndex) {
  if (!options || !options.length) return null;
  const cols = optionColumns(options);
  const rows = [];
  for (let i = 0; i < options.length; i += cols) {
    const cells = [];
    for (let j = 0; j < cols; j++) {
      const idx = i + j;
      if (idx >= options.length) {
        cells.push(h(View, { key: `q${qIndex}-blank-${j}`, style: [{ width: `${100 / cols}%` }, styles.optionCell] }));
        continue;
      }
      const prefix = `${String.fromCharCode(65 + idx)}. `;
      cells.push(h(
        View,
        {
          key: `q${qIndex}-opt-${idx}`,
          style: [{ width: `${100 / cols}%` }, styles.optionCell]
        },
        renderInlineLine(String(options[idx] || ""), `q${qIndex}-optline-${idx}`, prefix)
      ));
    }
    rows.push(h(View, { key: `q${qIndex}-row-${i}`, style: styles.optionRow }, ...cells));
  }
  return h(View, { style: styles.optionArea }, ...rows);
}

function renderQuestion(q, index) {
  const hasOptions = Array.isArray(q.options) && q.options.length > 0;
  return h(
    View,
    {
      key: q.id || `q-${index}`,
      style: styles.question,
      wrap: false
    },
    h(
      View,
      { style: styles.questionRow },
      h(Text, { style: styles.questionNumber }, `${index + 1}.`),
      h(View, { style: styles.questionBody }, ...renderQuestionBody(q.content, index))
    ),
    hasOptions ? renderOptions(q.options, index) : null
  );
}

function getWatermarkDataUri() {
  try {
    const el = document.querySelector(".paper-watermark");
    if (!el) return null;
    const bg = getComputedStyle(el).backgroundImage || "";
    const match = bg.match(/url\(["']?(data:image\/png;base64,[^"')]+)["']?\)/i);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

function getQrDataUri() {
  if (!qrPromise) {
    qrPromise = QRCode.toDataURL("https://zuotiben.top/", {
      errorCorrectionLevel: "M",
      margin: 0,
      width: 256,
      color: { dark: "#111111", light: "#ffffff" }
    });
  }
  return qrPromise;
}

function sanitizeFileName(name) {
  const safe = String(name || "Everflow-试卷").replace(/[\\/:*?"<>|]+/g, "-").trim();
  return safe || "Everflow-试卷";
}

function headerNode() {
  return h(
    View,
    { fixed: true, style: styles.header },
    mixedText("Everflow·彼时流年若水", { key: "header", size: 8, lineHeight: 1 })
  );
}

function footerNode() {
  return h(
    View,
    { fixed: true, style: styles.footer },
    mixedText("第 ", { key: "foot-a", size: 8, lineHeight: 1 }),
    h(Text, {
      key: "foot-page",
      style: { fontFamily: "EverflowTermes", fontSize: 8, lineHeight: 1 },
      render: ({ pageNumber }) => String(pageNumber)
    }),
    mixedText(" 页（共 ", { key: "foot-b", size: 8, lineHeight: 1 }),
    h(Text, {
      key: "foot-pages",
      style: { fontFamily: "EverflowTermes", fontSize: 8, lineHeight: 1 },
      render: ({ totalPages }) => String(totalPages)
    }),
    mixedText(" 页）", { key: "foot-c", size: 8, lineHeight: 1 })
  );
}

function buildDocument(state, assets) {
  const title = state.title || "试卷";
  const questions = Array.isArray(state.questions) ? state.questions : [];
  const fixedNodes = [
    headerNode(),
    footerNode(),
    assets.watermark ? h(Image, { fixed: true, key: "watermark", src: assets.watermark, style: styles.watermark }) : null,
    assets.qr ? h(
      View,
      { fixed: true, key: "qr-wrap", style: styles.qrWrap },
      h(Image, { src: assets.qr, style: styles.qr }),
      mixedText("zuotiben.top", { key: "qr-label", size: 5.8, lineHeight: 1, style: styles.qrLabel })
    ) : null
  ].filter(Boolean);

  return h(
    Document,
    {
      title,
      author: "Everflow·彼时流年若水",
      subject: "Everflow local paper",
      creator: "zuotiben.top"
    },
    h(
      Page,
      { size: "A4", style: styles.page, wrap: true },
      ...fixedNodes,
      mixedText(title, {
        key: "title",
        size: 13,
        lineHeight: 1.2,
        bold: true,
        sans: true,
        style: styles.title
      }),
      ...questions.map(renderQuestion)
    )
  );
}

export async function downloadPdf(state, hooks = {}) {
  registerFonts();
  const { onStatus = () => {} } = hooks;
  onStatus("正在准备字体与模板…");

  const [qr, watermark] = await Promise.all([
    getQrDataUri(),
    Promise.resolve(getWatermarkDataUri())
  ]);

  onStatus("正在生成 PDF…");
  const doc = buildDocument(state, { qr, watermark });
  const blob = await pdf(doc).toBlob();

  onStatus("正在下载…");
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${sanitizeFileName(state.title)}.pdf`;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);

  onStatus("done");
  return blob;
}

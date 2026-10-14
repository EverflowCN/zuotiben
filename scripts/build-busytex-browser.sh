#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p latex/browser-test/core/busytex
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
git clone --depth 1 --branch main https://github.com/EverflowCN/texlyre-busytex.git "$tmp/busytex"
(
 cd "$tmp/busytex"
 npm ci --no-audit --no-fund
 npm run build
)
cp "$tmp/busytex/dist/index.js" latex/browser-test/busytex-lib.mjs
# Small client-only ZIP reader/writer; needed for complete multi-file Everflow templates.
# Install only in temporary build checkout. Do not commit node_modules.
(
  cd "$tmp/busytex"
  npm install --no-save --no-package-lock --no-audit --no-fund fflate@0.8.2
)
cp "$tmp/busytex/node_modules/fflate/esm/browser.js" latex/browser-test/fflate.mjs
cp "$tmp/busytex/node_modules/fflate/LICENSE" latex/browser-test/LICENSE.fflate

cp "$tmp/busytex/LICENSE" latex/browser-test/LICENSE.busytex
git -C "$tmp/busytex" rev-parse HEAD > latex/browser-test/busytex-source-rev.txt
tag="build_wasm_46ebb6216a5c1fe63dd1dc885831d1a8cef2dc86_31802832436_1"
base="https://github.com/TeXlyre/texlyre-busytex-build/releases/download/$tag"
dest="latex/browser-test/core/busytex"
for file in busytex_worker.js busytex_pipeline.js busytex.js busytex.wasm busytex_biber.js texlive-basic.js texlive-basic.data texmf.cnf dvipdfmx.cfg updmap.cfg; do
 if [[ ! -s "$dest/$file" ]]; then
   curl --fail --location --retry 3 --retry-delay 3 --silent --show-error "$base/$file" -o "$dest/$file"
 fi
 test -s "$dest/$file"
done
echo "BusyTeX browser test bundle and WASM assets staged successfully."

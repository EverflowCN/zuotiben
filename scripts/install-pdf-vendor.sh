#!/usr/bin/env bash
set -euo pipefail
# Install deterministic, public client-side libraries into the static deployment.
# Source is npmjs.org; the published site never loads third-party CDNs.
VENDOR_DIR="${RUNNER_TEMP:-/tmp}/everflow-pdf-dependencies"
npm install --prefix "$VENDOR_DIR" --no-save --ignore-scripts --no-audit --no-fund --silent \
  jspdf@2.5.2 html-to-image@1.11.13 html2canvas@1.4.1 pdf-lib@1.17.1 pdf-fontkit@1.8.9
mkdir -p paper/editor/vendor
cp "$VENDOR_DIR/node_modules/jspdf/dist/jspdf.umd.min.js" paper/editor/vendor/jspdf.umd.min.js
cp "$VENDOR_DIR/node_modules/html-to-image/dist/html-to-image.js" paper/editor/vendor/html-to-image.js
cp "$VENDOR_DIR/node_modules/html2canvas/dist/html2canvas.min.js" paper/editor/vendor/html2canvas.min.js
cp "$VENDOR_DIR/node_modules/pdf-lib/dist/pdf-lib.min.js" paper/editor/vendor/pdf-lib.min.js
cp "$VENDOR_DIR/node_modules/pdf-fontkit/dist/fontkit.umd.min.js" paper/editor/vendor/fontkit.umd.min.js
for file in paper/editor/vendor/*.js; do
  if [ ! -s "$file" ]; then echo "Missing PDF runtime: $file" >&2;exit 1;fi
  sha256sum "$file"
done

python3 -m pip install --quiet fonttools==4.61.1
python3 scripts/build-pdf-fonts.py

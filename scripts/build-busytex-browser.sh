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
# Large TeX Live collections are hosted with the deployed GitHub Pages
# artifact, not committed to git history. They are OPTIONAL in the browser.
# Never force every visitor to download ~528 MiB on top of Basic.
#
# Same pinned TeX Live 2026 release as the Basic WASM files above.
# Verify source release SHA-256 before publishing to prevent mixed versions
# or incomplete downloads from silently corrupting compilation.
cat > "$dest/texlive-optional.sha256" <<'SHA256'
7a912aa15f9e534b1948566771bf2510ca704fab3c3fdece7f75bc6558525a92  texlive-recommended.data
4354ad2040462400ca856e595cec970509c95f8d2ac87fb3e06e0e17ffc9033a  texlive-recommended.js
9ae117b8fd7eacc13430296278d63603070f083c6f1e647937a6866874c726ae  texlive-extra.data
6c935b358ababde879aa2c62b48601d6e6be4ee7f3f9ed86c7f49136b803d618  texlive-extra.js
SHA256
for file in texlive-recommended.data texlive-recommended.js texlive-extra.data texlive-extra.js; do
  expected="$(awk -v f="$file" '$2==f {print $1}' "$dest/texlive-optional.sha256")"
  if [[ -s "$dest/$file" ]] && echo "$expected  $dest/$file" | sha256sum -c --status; then
    echo "Using verified GitHub Actions cache: $file"
    continue
  fi
  rm -f "$dest/$file"
  curl --fail --location --retry 4 --retry-delay 3 --silent --show-error "$base/$file" -o "$dest/$file.tmp"
  mv "$dest/$file.tmp" "$dest/$file"
  echo "$expected  $dest/$file" | sha256sum -c --status
  echo "Verified and staged GitHub-hosted optional bundle: $file"
done
# Ship tiny TeX Live \ProvidesPackage manifests to let the browser identify
# exactly which GitHub-hosted collection contains each macro package.
for file in texlive-basic.js.providespackage.txt texlive-recommended.js.providespackage.txt texlive-extra.js.providespackage.txt texlive-basic.txt texlive-recommended.txt texlive-extra.txt; do
  if [[ ! -s "$dest/$file" ]]; then
    curl --fail --location --retry 3 --retry-delay 3 --silent --show-error "$base/$file" -o "$dest/$file"
  fi
  test -s "$dest/$file"
done
# Upstream BusytexPipeline.compile() auto-prunes optional dataPackagesJs
# based only on \\usepackage in the entry .tex. Everflow's dependencies live
# inside custom .cls/.sty files, so this can silently DISCARD a bundle that
# the user explicitly selected. Preserve those explicit GitHub-hosted URLs.
# Patch the release file during the Pages build (do not modify upstream files).
python3 - "$dest/busytex_pipeline.js" <<'PY'
import sys
from pathlib import Path
p=Path(sys.argv[1])
s=p.read_text(encoding='utf8')
before="        const resolved = await this.data_package_resolver.resolve(files, main_tex_path, data_packages_js);"
after=("        // Everflow: do not prune user-selected Recommended/Extra bundles just because "
       "the dependencies appear in included .sty/.cls files.\\n"
       "        const explicitly_requested_bundles = Array.isArray(data_packages_js) ? [...data_packages_js] : [];\\n"
       "        const resolved = await this.data_package_resolver.resolve(files, main_tex_path, data_packages_js);")
# Build real newlines: source below stores a JS program, not literal \\n escapes.
after=after.replace('\\n','\n')
patched_marker = "const explicitly_requested_bundles = Array.isArray(data_packages_js)"
selected_patch = "data_packages_js = Array.from(new Set([...explicitly_requested_bundles, ...filter_map("
unresolved_patch = "data_packages_js = Array.from(new Set([...explicitly_requested_bundles, ...this.data_package_resolver.data_packages_js])).sort();"
if patched_marker not in s:
    if s.count(before)!=1:
        raise SystemExit('BusyTeX resolver anchor changed; refusing to build unverified JavaScript')
    s=s.replace(before,after)
    needle="data_packages_js = Array.from(new Set(filter_map(v => v.used && v.source != 'local' && v.source != null, false))).sort();"
    new="data_packages_js = Array.from(new Set([...explicitly_requested_bundles, ...filter_map(v => v.used && v.source != 'local' && v.source != null, false)])).sort();"
    if s.count(needle)!=1:
        raise SystemExit('BusyTeX selected bundle anchor changed')
    s=s.replace(needle,new)
    old="data_packages_js = this.data_package_resolver.data_packages_js;"
    if s.count(old)!=1:
        raise SystemExit('BusyTeX unresolved bundle anchor changed')
    s=s.replace(old,unresolved_patch)
else:
    print('BusyTeX pipeline already patched in Actions cache; verifying patch invariants.')
if s.count(patched_marker)!=1 or s.count(selected_patch)!=1 or s.count(unresolved_patch)!=1:
    raise SystemExit('BusyTeX pipeline patch invariants failed')
p.write_text(s,encoding='utf8')
print('Pinned BusyTeX pipeline patched to preserve explicitly requested TeX Live collection URLs.')
PY
echo "BusyTeX Basic + optional Recommended/Extra are staged as static GitHub Pages files."
echo "BusyTeX browser test bundle and WASM assets staged successfully."

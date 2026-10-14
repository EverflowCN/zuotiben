/**
 * Builds real Aldine React HTML from latex/aldine into the site's /latex/ directory.
 * Full Aldine API/compile still requires a separately running backend and TeX Live.
 */
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('latex');
const dist = path.join(root, 'aldine/apps/web/dist');
const index = path.join(dist, 'index.html');
if (!fs.existsSync(index)) throw new Error('Aldine web frontend build missing');
const assets = path.join(root, 'assets');
fs.rmSync(assets, { recursive: true, force: true });
fs.cpSync(path.join(dist, 'assets'), assets, { recursive: true });

let html = fs.readFileSync(index, 'utf8');
if (!html.includes('id="root"')) throw new Error('Unexpected frontend: missing React root');
html = html.replace('<head>', '<head>\n    <meta name="aldine-base-path" content="/latex/" />');
html = html.replace('<title>Aldine</title>', '<title>LaTeX 编辑器 · Everflow Aldine</title>');
html = html.replace('</body>', '    <script defer src="./frontend-health.js"></script>\n</body>');
fs.writeFileSync(path.join(root, 'index.html'), html);
console.log('Built /latex/ frontend from ' + fs.readFileSync(path.join(root, '.aldine-source-rev'), 'utf8').trim());

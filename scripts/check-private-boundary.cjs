// Public GitHub Pages uploads the checked-out working tree.
// Reject any accidentally copied Everflow PRIVATE source, including nested paths.
// This checks file NAMES only and never fetches GitHub secrets or private files.
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");

// Match protected filenames at any depth (including private source in /latex or /paper).
const protectedPaths = [
  /(?:^|\/)Everflow-(?:Exam|Book|Public)\.tex$/i,
  /(?:^|\/)00-user-config\/01-快速设置\.tex$/i,
  /(?:^|\/)90-core\/everflow-(?:engine|question-core|cover-spread-core|mixed-core)\.sty$/i,
  /(?:^|\/)core\/examzh\/exam-zh(?:-font)?\.(?:cls|sty)$/i,
  /(?:^|\/)core\/exbook\/ExBook\.cls$/i,
  /(?:^|\/)config\/cover-common-config\.tex$/i,
  /(?:^|\/)template-source\.zip$/i,
  /(?:^|\/)Everflow_(?:私有仓库B_待补齐完整母版|原版母版_ExamBookPublic_multirow修复版)\.zip$/i,
];
const skipDirs = new Set([".git", "node_modules", ".venv", "__pycache__"]);

let checkedFiles = 0;
const leaked = [];
const pending = [{ dir: root, rel: "" }];
while (pending.length) {
  const { dir, rel } = pending.pop();
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const child = path.join(dir, item.name);
    const relative = rel ? rel + "/" + item.name : item.name;
    if (item.isSymbolicLink()) {
      // Reject potentially external source mounts even if their names are innocuous.
      // Avoid publishing files outside the audited checkout.
      const target = fs.realpathSync(child);
      if (target !== root && !target.startsWith(root + path.sep)) {
        leaked.push(relative);
      }
      continue;
    }
    if (item.isDirectory()) {
      if (!skipDirs.has(item.name)) pending.push({ dir: child, rel: relative });
      continue;
    }
    if (!item.isFile()) continue;
    checkedFiles++;
    if (protectedPaths.some(pattern => pattern.test(relative))) leaked.push(relative);
  }
}
if (leaked.length) {
  console.error(`ERROR: ${leaked.length} protected source path(s) detected in public build.`);
  console.error("Public Pages upload refused; do not publish the private LaTeX mother template.");
  process.exit(1);
}
console.log(`PASS: audited ${checkedFiles} public files; no protected private source paths.`);

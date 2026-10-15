// The public Pages upload includes the entire checked-out working directory.
// Fail closed if the protected Everflow master ever lands in this public tree.
// This only examines filenames: never fetch private source or read secrets.
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");

const blocked = [
  "Everflow-Exam.tex",
  "Everflow-Book.tex",
  "Everflow-Public.tex",
  "00-user-config/01-快速设置.tex",
  "90-core/everflow-engine.sty",
  "90-core/everflow-question-core.sty",
  "core/examzh/exam-zh.cls",
  "core/exbook/ExBook.cls",
  "config/cover-common-config.tex",
  "template-source.zip",
  "Everflow_私有仓库B_待补齐完整母版.zip",
];

const leaked = blocked.filter(rel => fs.existsSync(path.join(root, rel)));
if (leaked.length > 0) {
  console.error("ERROR: Protected template source detected in PUBLIC Pages build input.");
  console.error("Do not upload this Pages artifact. Remove private material from the PUBLIC tree.");
  process.exit(1);
}
console.log("PASS: Protected private master files are absent from public Pages root.");

# Everflow 原版模板：BusyTeX 静态依赖预检（2026-10-15）

**检查对象**：用户原始母版 `Everflow·彼时流年若水_TeXPage专用版_mixed-A4填写区上移版.zip`，以及只修复 `multirow` 的版本。源码已由本地 ZIP 直接提取；**不是** BusyTeX 浏览器完整编译成功的证明。

## 实际统计

| 检查项目 | 结果 |
|---|---:|
| ZIP 文件条目 | 173 |
| 解压总大小 | 约 14.3 MiB |
| .tex | 69 |
| 工程自带 .sty | 10 |
| 工程自带 .cls | 2 |
| 引入的宏包名（全工程静态扫描） | 54 |
| 图片 | 90 |
| 需考察的显式字体候选 | 28（含 exam-zh 可选分支） |

三种编译入口分别是 `Everflow-Exam.tex` / `Everflow-Book.tex` / `Everflow-Public.tex`。**本地完整版 XeLaTeX** 已分别生成 58、102、110 页，但 **BusyTeX WebAssembly 尚未实际通过完整三模式验证**。

## 引入的宏包

`adjustbox, afterpage, amsmath, amssymb, array, bbding, bm, calc, caption, ctex, enumitem, eso-pic, etoolbox, expl3, fancyhdr, filehook, fontawesome5, fontspec, geometry, graphicx, hyperref, iftex, keyval, lastpage, listings, multicol, multirow, needspace, newtxmath, newunicodechar, pgffor, pgfkeys, pgfmath, pifont, qrcode, romannum, tabularx, tikz, tikzpagenodes, titlesec, titletoc, titling, truncate, unicode-math, varwidth, xcolor, xeCJK, xeCJKfntef, xfp, xkeyval, xparse, zhnumber`；以及工程内的 `core/examzh/exam-zh-font`、`everflow-fonts`（不应当被错误地当成公共 TeX Live 宏包）。

字体需要留意 `Times New Roman`（本机商业系统字体不可从浏览器直接读取）、`TeXGyreTermesX`、`XITSMath-Regular.otf`、`Asana-Math.otf`、`NewCMSans10`、`NewCMMono10`、`SimSun`、`SimHei` 等不同模板分支。某些是备用选项，并不表示编译时一定全部加载。

## 官网托管分层

- GitHub Pages 同域提供 BusyTeX 引擎、TeX Live Basic（默认），不会要求每位用户加载全部宏包。
- Recommended（额外约 192 MiB）与 Extra（再额外约 326 MiB）按需选择，从本站下载并缓存；**不能据此承诺所有 54 个宏包与所需字体已经齐备**。
- 如超出这三个集合，仍有可能需要 TeXlyre 第三方宏包服务。TeX Live 外部程序依赖不能仅靠上传宏包修复。

## 已加入网站的辅助检查

Aldine 中文编辑器左侧文件栏 / 顶部工具栏现有「**检查模板依赖**」：在本地扫描导入的 ZIP 所包含的自定义类/包、宏包、字体候选、图片、三大入口、静态引用路径，并提示兼容风险。不上传用户文件，属于 **预检**，不是编译结果。

## 下一阶段实际验证

先导入修复版原母版 ZIP，再从 **Exam** 入口使用 XeLaTeX 完整编译、查看日志及 PDF 中文和页数；通过后测试 Book、Public。不要盲目把字体或商用字体包提交至仓库，也不要因编译失败而删掉原题。

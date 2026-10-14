# 浏览器 XeLaTeX 技术验证（非正式版）

访问路径：/latex/browser-test/ 。此页面独立于现有 Aldine 编辑器 /latex/ ，不修改 /paper/ 。

## 代码和资源

- npm/TypeScript API：每次 Pages 构建从 https://github.com/EverflowCN/texlyre-busytex 的 main 分支克隆，运行 npm ci + npm run build ，复制 dist/index.js 到 busytex-lib.mjs。
- WASM Engine 和基础 TeX Live：从 TeXlyre/texlyre-busytex-build 上游发布的与 v1.4.x 匹配的固定 release tag 获取，并放在 core/busytex/ 下。这些资源约 120MB。
- 下载仅发生在 GitHub Actions 构建及用户首次加载时，用户无需安装软件。GitHub Pages 工件包含运行时二进制，但源仓库不提交体积很大的 .wasm/.data。
- 可选使用 texlive2026.texlyre.org 按需提供缺失宏包/字体；这是第三方静态/资源服务，而不是在线编译服务器。

## 验证范围

页面可以粘贴单份 main.tex、导入单份 .tex、在浏览器中执行 XeLaTeX，并预览/下载成功生成的 PDF。首次加载较慢，手机端可能因内存不足而失败。请先尝试默认英文公式示例，再尝试中文和你的 Everflow 原模板。

当前不支持完整 Aldine 项目持久化、多人协作、ZIP 图片工程、用户身份或自动检测根文件。此实验成功后再设计 Aldine 的浏览器编译适配器；不要把实验结果直接当作完整 Aldine 已上线。

后端并未启动或获得免费服务器。第三方项目的 AGPL-3.0 许可证应保留并遵守。

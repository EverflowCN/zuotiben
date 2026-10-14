# /latex/ — 完整复刻 Aldine 同步与前端接入

此目录将拥有两部分：

- latex/aldine/ — 从 https://github.com/EverflowCN/aldine 复制的完整仓库文件，包含前端、Node.js 后端、Docker 编译服务、原始 LICENSE（AGPL-3.0）和第三方许可声明。仓库历史没有复制。
- latex/index.html、latex/assets/ — 由上述源码构建的真实 React 编辑器，展示在 https://zuotiben.top/latex/ 。

自动化入口为 scripts/sync-aldine.sh、scripts/aldine-build-preview.mjs 和 .github/workflows/pages.yml。用户在 **EverflowCN/aldine** 内修改代码后，网站每 12 小时定时同步，也可手动运行 GitHub Actions 的 Deploy GitHub Pages；同步后在 zuotiben 的 latex/aldine 内会保留一份完整源码。latex/.aldine-source-rev 保存当前同步的源提交。

**注意**：GitHub Pages 只能运行网站前端，不会运行仓库里包含的 Node.js 和 Docker。页面出现 Aldine 界面并不代表可编译；需要另外部署应用 + TeX Live 编译容器，配置 ALDINE_BASE_PATH=/latex、ALDINE_PUBLIC_URL=https://zuotiben.top/latex 并将 Cloudflare /latex* 路由反代到该服务。未部署后端时前端提示不可用，不会伪造 PDF。

保留原 zuotiben /paper/ 及网站功能；许可证归属按各自项目管理，Aldine 仍遵循 AGPL-3.0-only。

## 自托管服务器与 Cloudflare 接入

已加入 [完整部署配置](./deploy/README.md)：双容器 Docker Compose、从复刻源码构建的覆盖配置、TeX Live Full 和 Cloudflare Worker 路由。部署配置不会自动开通或免费获得远程服务器。请勿将真实 .env 放进网站仓库。

## 无服务器浏览器编译 · 新增本地工作区

正式 Aldine 编辑器入口 /latex/ 的工具栏已新增「浏览器编译 · 免费」，也可以访问：

    https://zuotiben.top/latex/?local=1

这是由 `EverflowCN/aldine` 复刻源码实现的浏览器模式，而不是另一个编辑器截图，也不再调用 Aldine Node.js API。浏览器从 /latex/browser-test/ 加载由 `EverflowCN/texlyre-busytex` 编译出来的 BusyTeX JavaScript SDK 和静态 WebAssembly 引擎；首次下载大量静态资源，但 **无需购买服务器或由用户安装 LaTeX**。

第一阶段实现：本机 IndexedDB 持久化工程、根 .tex 文件选择、编译引擎切换、单文件/多文件与图片导入、ZIP 工程导入/导出、PDF 预览/下载、编译日志、中文兼容测试样例。ZIP 使用独立打包的 fflate MIT 库，未使用公共在线编译服务。

**限制：**未实测 Everflow ExamA4 完整模板；中文字体或特殊宏包可能依赖 TeXlyre 资源下载服务，浏览器内存不足会失败。此模式无 Aldine 的多人在线协作、账户、服务器 Git 历史或云同步。本地 IndexedDB 可能被用户清理，应通过导出 ZIP 定期备份。原来的 Node.js + Docker 部署方案仍在 /latex/deploy/，互不影响。

## 自动保存编译器资源（无需点按钮）

- 首次成功加载 BusyTeX 后，Service Worker 默认将 XeLaTeX WebAssembly 与基础 TeX Live 文件保存到 Cache Storage，Emscripten 也可以使用 IndexedDB 缓存宏包。
- 每次进入本地工作区，自动检查实际资源条目而非单凭“已安装”标记；发现曾经完整缓存的文件缺失时，在有网络的情况下尝试自动补齐。首次编译仍需下载约 120MB 的初始资源。
- 默认尝试调用 `navigator.storage.persist()` 请求浏览器长期保留 **整个 zuotiben.top 源站**的缓存与本地工程；无需专门点击“保留缓存”。浏览器可根据自身规则允许、拒绝或显示原生权限提示。自动尝试会限频以避免重复提示。
- **无法保证真正永久**：用户手动清理网站数据、隐私/无痕模式、浏览器不允许或移动端存储政策可能移除资源和 IndexedDB 工程；清除整个源站数据后，网站无法保留“先前缓存过”的记录。请定期使用“导出 ZIP”备份重要工程。

## GitHub 托管的 TeX Live 编译资源（三档，按需下载）

构建阶段通过 `scripts/build-busytex-browser.sh` 从同一个上游固定的 TeX Live 2026 BusyTeX release 下载并 SHA-256 验证：

| 浏览器 UI 资源档位 | 文件（上传到本站 GitHub Pages 工件，**不写进 Git 历史**） | 首次数据量 | 功能 |
| --- | --- | ---: | --- |
| 基础 | `texlive-basic.js/.data` + `busytex.wasm` | 约 120 MiB | 默认、普通 LaTeX 编译 |
| 推荐 | 再下载 `texlive-recommended.js/.data` | 约 196 MiB | 较多标准宏包、字体 |
| 扩展 | 再下载 `texlive-extra.js/.data` | 约 333 MiB | TikZ、CTeX 或出版类工程可能用到的更多资源 |

网页 UI 中的「本地宏包」档位只在用户主动切换时加载较大的推荐/扩展包；不要求所有访客首次下载所有包。Emscripten 将包缓存到 IndexedDB；编译器 wasm 核心继续由原有 Service Worker 缓存。用户文件绝不会因上传这些公共 TeX Live 资源而被上传。

**重要边界：**Basic、Recommended、Extra 三组共约 637 MiB，并不等于 TeX Live 的 full 全部包与字体。未覆盖的资源仍可通过 TeXlyre 第三方按需字体/宏包资源服务获取。浏览器不支持执行大部分本机 shell-escape 外部程序，某些工程即使宏包齐全也无法复现本地完整 TeX Live 的输出。

GitHub 的源文件大小限制意味着大 `.data` 文件不能直接 `git add` 提交。当前方案是 **GitHub Actions 临时拉取 → 验证校验和 → 发布到 GitHub Pages 同源静态文件**。不要把完整 TeX Live 多 GB 的 `texmf-dist` 上传 Pages：发布站点有 1 GB 规模限制及每月 100 GB 软带宽上限。GitHub Releases 可以存档更大的分卷，但归档文件不能等同于提供 TeX Live 的逐文件/字体实时 API。为 Everflow 原版模板建议先测试「推荐」档位，若仍缺资源再选择「扩展」或远程按需补全；手机端注意内存和下载成本。

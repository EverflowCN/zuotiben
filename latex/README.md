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

## Everflow 原版母版宏包与字体预检

- Aldine 中文编辑器新增 `检查模板依赖`，支持扫描本地导入 ZIP 的包、字体候选、图片、引用路径、外部程序风险，以及 Everflow 的 Exam/Book/Public 入口。
- 导入 ZIP 后**自动执行预检**，没有编译器下载行为，也不会上传用户源文件。
- 预检时读取本站发布的 `texlive-basic/recommended/extra.js.providespackage.txt` 小型目录，为宏包标注归属和建议档位；大型 Recommended/Extra 数据包仍仅在用户选择并编译时才下载。
- 原版母版 173 文件、54 个直接引用包，详细参见 [原版母版兼容审查](./deploy/EVERFLOW_COMPATIBILITY_AUDIT.md)。
- 注意：静态包名归属不能保证 XeLaTeX WASM 兼容、中文字体可用、PDF 分页与本地一致；需继续进行完整工程端到端编译验证。

**2026-10-15 实测清单补充：**对先前上传的 173 文件 Everflow 原版母版进行静态扫描后，三个本地资源档位中的宏包索引识别为 Basic 20、Recommended 11、Extra 15、工程内 2、索引暂未直接列出 6（`bbding`、`ctex`、`newtxmath`、`xeCJK`、`xeCJKfntef`、`zhnumber`）。用户打开「检查模板依赖」看到的**资源建议来自实际 TeX Live 文件索引**，并非仅按包名猜测。未列出不等于编译一定失败，仍保留按需下载宏包的选项。上述结果并非原版母版 BusyTeX WASM 编译通过的证明。

## 多文件工程与可选宏包资源包修复

Aldine 浏览器工作区导入 ZIP 时优先将 `Everflow-Exam.tex` 识别为入口，避免将子目录中的辅助 `.tex` 错认成主文档。BusyTeX 的固定发行版 `busytex_pipeline.js` 在站点构建时打上小范围兼容补丁：**用户明确选择 Recommended/Extra 时，即使实际 `\usepackage` 写在 `.sty`/`.cls` 中，也不会被上游默认的包名推断逻辑自动裁掉。** CI 检查补丁锚点，如版本更新导致不匹配则拒绝静默发布。新增不含私人原版模板内容的 CJK/TikZ/multirow 合成文档测试，验证大体积资源包实际加载和浏览器编译。

## 原版模板浏览器端兼容性验证

已增加单独的合成测试（中文、TikZ、multirow），验证用户手动选择 Extra 时完整加载 GitHub 静态资源包，并确认 PDF 中文可以提取。另设一次性私有工程验证：通过已有只读凭据从私有仓库下载到 GitHub Actions 临时空间，浏览器本地导入，不将原始 ZIP、LaTeX 日志或生成 PDF 提交、公开展示、上传为 Actions 工件。**本地完整 TeX Live 编译成功，不代表同一模板已通过 BusyTeX WebAssembly 验证。** BusyTeX 界面已改为显示每个编译阶段的 TeX、字体与标准错误日志，以便定位不完整的编译结果。

## 复杂工程编译超时保护

原版 BusyTeX Worker 默认以 180 秒作为浏览器编译截止时间，会误终止仍在计算的多文件文档。Aldine 中文版已按工程规模调整：小文档沿用默认限制，30 个及以上文件或有大体积 .tex 的工程使用 BusyTeX 允许的 15 分钟上限。**这只是防止提前中止，并不保证复杂模板一定编译成功。** 已通过私有工程临时减量题源试验（不公开原始 ZIP），完整页数仍须单独验证。

**运行时进展（2026-10-15）：**在仅缩减题目正文、保留原版母版所有布局与配置的私有临时测试中，BusyTeX 已成功生成包含中文的 8 页 PDF。完整试卷首次验证触发了默认 180 秒编译截止时间，因此仅对复杂工程启用较长 Worker 截止时间；完整页数及浏览器内存兼容性仍在独立验证，不能声称全部通过。

## 2026-10-15 · 本地编译预计时长与 PDF 恢复

- 编译前显示基于项目大小、资源档位和已缓存编译记录的预估区间；编译中按秒显示已用时长、预计剩余区间、依赖检查／加载／初始化／XeLaTeX／整理阶段。预估值不是承诺的完成时间。
- 默认先使用静态依赖检查的最低档位，避免清单访问超时时，Everflow/TikZ/CTeX 误退回 Basic。
- BusyTeX 若返回退出码 0、却没有最终 PDF，则自动尝试一次单轮生成 PDF；仍失败时保留详细日志，不把中间结果假称编译成功。
- 已将下载资源与预热编译时间区别记录；本地时长统计不包含 LaTeX 源文件，完整模板继续保持在私有 B 仓库。
- **兼容性说明：** 本地浏览器编译仍不等于原生 XeLaTeX；大型工程受浏览器内存、字体/宏包及 BusyTeX 限制。应按原版逐份验证分页与字体，不承诺任何 ZIP 都能成功。

### 2026-10-15 · 连续编译缺陷修复

- 已定位第一次生成 PDF 后第二次编译按钮被忽略的直接原因：编译互斥锁未在 `compile()` 的 `finally` 中释放。现已确保成功、失败与异常路径均释放该锁。
- 增加在同一个浏览器工作区连续两次编译、修改源码后验证 PDF 更新的自动回归，并保留中文 XeLaTeX 实际 PDF 内容校验。
- 仅调整公开编辑器代码和测试，原 ZIP 项目和私有模板均未修改。

## 2026-10-15 · 简单工程慢编译的根因与改进

- **根因 1：历史宏包档位被跨项目全局保存。** 原本为 Everflow/TikZ 自动升到 Recommended 后，新建仅九行的 `article + amsmath` 仍需要加载附加的约 192 MB。编辑器现改为每个工程默认“自动（按当前工程）”，不再把自动升级写入全局设置。用户手动指定档位只对当前工作区有效。
- **根因 2：无条件读取宏包清单。** 对基础且已知的 `amsmath`、`amssymb`、`graphicx` 等，不再在开始编译时查询全部在线 TeX Live 三档清单。未知宏包仍会检查其具体档位。
- **根因 3：无条件两轮 XeLaTeX。** 普通无目录与引用的工程改为单轮编译；多文件大型工程、目录、交叉引用和参考文献保留多轮处理。
- **首次冷启动的真实成本：** 即使只有一行文字，浏览器第一次使用也要加载基础 XeLaTeX WASM 与 TeX Live 数据（约 120 MB，具体版本和网络速度决定耗时）。缓存保留后可避免重新下载，但引擎仍需初始化。预估是区间，不是 PDF 生成速度的承诺。
- 检验：提供单元测试与 Chromium 浏览器测试，强制模拟历史 Recommended 全局缓存，要求小工程只加载 Basic，既不请求 Recommended/Extra 包，也不做多轮编译。

## 2026-10-15 · 小工程仍显示 56 秒的实际原因与修复

- **问题本质：** 计时器展示的是从用户点击“编译”起的总时长，而“生成 PDF”阶段只表示当前阶段。网页先前根据“编译器资源文件已缓存”就按“运行时已初始化”估算，忽略每次页面重新打开后仍要重新实例化 WASM/恢复 TeX Live 文件系统的开销，故即使小工程也会过早提示“超过预计上限”。这不是判断源码错误的依据。
- **修复进度展示：** 增加当前阶段用时与总计时间，真实初始化完成后把测得的准备耗时计入余下排版预计时长；PDF 生成成功后分列“资源检查和引擎初始化”与“XeLaTeX 实际排版”的时间。
- **修复历史数据：** 编译历史耗时版本升级到 v2，只记录实际排版阶段，不把以前下载资源或启动 WASM 的总耗时错误用于推算下一份试卷的排版成本。
- **基础工程加速：** 普通 article/book/report 且宏包全部被 Basic 资源覆盖时，禁用不必要的在线 TeX Live 回退探测。CTeX、TikZ、复杂母版及未知宏包仍允许按需获取依赖，避免破坏原工程兼容性。
- **注意：** WebAssembly 和 TeX Live 数据即使已缓存，在新打开的网页中仍需初始化；低性能电脑、磁盘慢、浏览器内存紧张时可能耗时几十秒，不能保证每个设备在固定时长内出 PDF。编译器原有 180 秒默认运行超时仍保留，避免小设备无限等待。
- **回归：** 生产构建浏览器端测试覆盖“缓存存在但初始化较慢”的计时分解；真实浏览器冒烟测试新增普通工程不得请求远程宏包服务器的断言。

### 2026-10-15 · TikZ/PGF 复杂工程回归修正

- 首轮小工程加速已在 Chromium 验证；真实 PDF 回归发现自定义 `.sty` 内的 TikZ 可能位于 TeX Live Extra，如果把这类宏包视作固定 Recommended，会导致 `tikz.sty not found`。已收紧跳过清单查询的范围：**仅基础宏包可跳过，TikZ/PGF/CTeX 等仍查询官方本机包清单并按需要选择 Extra**。
- **保持简单工程的优化**：`article + amsmath` 仍使用 Basic、无外部宏包查询、单轮 XeLaTeX、无远程宏包回退；复杂母版保留完整依赖解析。

### 2026-10-15 · 复杂宏包 BusyTeX 多轮补充

- 不再假定 TikZ/PGF、CTeX 等在所有 BusyTeX 资源档位下都能安全使用单轮编译。**仅 Basic 标准工程采用快速单轮**；Recommended/Extra 工程保留 BusyTeX 的宏包解析与多轮编译流程，以规避 `tikz.sty not found` 等首次导入资源问题。
- 宏包所在档位依然按实际安装清单解析，不再把 TikZ 固定视作推荐档位；这项修正与简单文档的耗时分段展示相互独立。

## 2026-10-15 · 用户提供的 TeXPage 两份 HTML 对标界面

- 工程首页基于用户提供的“主页 - TeXPage.html”视觉参考重新排版：50px 浅色顶部栏、280px 项目分类栏、信息提示、工程列表/搜索/排序、星标、回收站、原 ZIP 缓存下载与删除。
- 编译页面基于用户提供的“www.texpagex工程例子.html”参考重新排版：约 40px 深色顶部栏、文件目录图标快捷操作、文件树与文件大纲、中间白底源码、右侧 PDF/日志、拖动分栏、底部状态栏。
- 图标：使用 Everflow 仓库内独立 SVG 图标，不调用 TeXPage 自有 iconfont、脚本或网络资源；首页和编辑器的实际操作已绑定原有功能。
- CodeMirror 编辑器补充真实的撤销、重做、查找、切换注释、插入数学环境按钮；添加拆分显示/仅编辑器/仅 PDF 的视图切换。
- 三端适配：移动端保留编译器和资源档位设置入口，避免紧凑顶部栏隐藏必要功能。
- **隐私**：未上传或公开用户原始 HTML 文件；页面视觉重构不复制其中的私人账号配置与第三方脚本。源码和工程 ZIP 继续留在本机 IndexedDB。
- 依旧为浏览器本地编译，保持 GitHub Pages 静态部署方案，每月 0 元；不是 TeXPage 私有云编译服务复制品。

# /latex/ — 完整复刻 Aldine 同步与前端接入

此目录将拥有两部分：

- latex/aldine/ — 从 https://github.com/EverflowCN/aldine 复制的完整仓库文件，包含前端、Node.js 后端、Docker 编译服务、原始 LICENSE（AGPL-3.0）和第三方许可声明。仓库历史没有复制。
- latex/index.html、latex/assets/ — 由上述源码构建的真实 React 编辑器，展示在 https://zuotiben.top/latex/ 。

自动化入口为 scripts/sync-aldine.sh、scripts/aldine-build-preview.mjs 和 .github/workflows/pages.yml。用户在 **EverflowCN/aldine** 内修改代码后，网站每 12 小时定时同步，也可手动运行 GitHub Actions 的 Deploy GitHub Pages；同步后在 zuotiben 的 latex/aldine 内会保留一份完整源码。latex/.aldine-source-rev 保存当前同步的源提交。

**注意**：GitHub Pages 只能运行网站前端，不会运行仓库里包含的 Node.js 和 Docker。页面出现 Aldine 界面并不代表可编译；需要另外部署应用 + TeX Live 编译容器，配置 ALDINE_BASE_PATH=/latex、ALDINE_PUBLIC_URL=https://zuotiben.top/latex 并将 Cloudflare /latex* 路由反代到该服务。未部署后端时前端提示不可用，不会伪造 PDF。

保留原 zuotiben /paper/ 及网站功能；许可证归属按各自项目管理，Aldine 仍遵循 AGPL-3.0-only。

## 自托管服务器与 Cloudflare 接入

已加入 [完整部署配置](./deploy/README.md)：双容器 Docker Compose、从复刻源码构建的覆盖配置、TeX Live Full 和 Cloudflare Worker 路由。部署配置不会自动开通或免费获得远程服务器。请勿将真实 .env 放进网站仓库。

# Everflow /latex — Aldine 原生编辑器接入

目标：在 zuotiben.top/latex/ 打开 **原版** Aldine（复刻仓库： https://github.com/EverflowCN/aldine ），同时保留原有 /paper/。这里没有声称浏览器能直接跑原版 XeLaTeX。

## 当前提交实现的部分

- /latex/ 没有后端时显示如实的接入检查页，而不是假的编辑器。
- latex/aldine-proxy.mjs 是 HTTP + WebSocket 反代核心。
- functions/latex.js 和 functions/latex/[[path]].js 是 **Cloudflare Pages Functions** 挂载层。只有 zuotiben 网站实际部署于 Cloudflare Pages 时才会执行，纯 GitHub Pages 不运行这些函数。
- latex/aldine-gateway-worker.mjs 是 **独立 Cloudflare Worker** 入口，适合现有 GitHub Pages + Cloudflare 代理域名的架构。需要单独部署 Worker 并绑定路由 zuotiben.top/latex*，不能只上传脚本到 GitHub 就生效。
- _routes.json 限定 Pages Functions 仅处理 /latex 与 /latex/*，避免影响其他静态页面。

## 使其真正运行的部署步骤

1. 在能运行 Docker Compose 的服务器（也可以是一直开机并通过 Cloudflare Tunnel 暴露的个人电脑）拉取 https://github.com/EverflowCN/aldine 。
2. 将本目录中的 docker-compose.override.example.yml 复制到 aldine 仓库根目录，命名为 docker-compose.override.yml。它为 app 设置 ALDINE_BASE_PATH=/latex、ALDINE_PUBLIC_URL=https://zuotiben.top/latex、AUTH_ENABLED=1。
3. 使用完整 TeX Live 镜像以包含 CJK：在 aldine 的 .env 中设置 ALDINE_TEXLIVE=-full，然后运行 docker compose up -d。镜像很大，需准备充足存储与内存；编译计算仍在 Docker 主机上，不会移到浏览器。
4. 给该 Docker 应用创建可公网访问的 HTTPS **专用上游域名**（例如 https://aldine-origin.example.com/），注意上游本身的 /latex/ 路径也必须能访问。不要把 ALDINE_ORIGIN 指向 https://zuotiben.top，会造成反代循环。
5. 若 zuotiben 实际使用 Cloudflare Pages：在 Pages 项目的 Production/Preview Variables 中配置 ALDINE_ORIGIN=https://aldine-origin.example.com/。若实际托管在 GitHub Pages：部署独立 Worker 脚本并在 Cloudflare zone 的 Worker Routes 绑定 zuotiben.top/latex*，给 Worker 配置相同变量。
6. 先在上游验证账户注册/登录、WebSocket、上传、PDF 编译与文件持久化。确认权限和访问控制生效后，额外配置 ALDINE_PUBLIC_READY=1 启用代理。
7. 打开 https://zuotiben.top/latex/ 试编译。基础文档通过后，再测试自定义 XeLaTeX 母版、ctex、TikZ、字体、PDF 一致性。

## 验证清单

- GET /latex/api/health 返回 JSON {"ok":true,"name":"aldine"}，不是 HTML 首页。
- /latex/ 能展示 Aldine 的真实项目列表；登录启用；未授权用户看不到别人文件。
- /latex/p/:id 直接打开和刷新可用；WebSocket /latex/collab 连接正常。
- 上传带图片的 ZIP 可正常导入；编译完成可生成、下载 PDF，PDF 与源文件持久化。
- 禁止把含有未隔离 LaTeX 执行环境的服务直接面向陌生用户开放。

## 重要限制

Aldine 是 AGPL-3.0、基于 Node.js + TeX Live 的自托管服务，不能仅把 React 源码复制到 GitHub Pages / Cloudflare Pages 就运行。本站只是做了可用的路径接入与代理代码，没有替你购买机器、部署 Docker 容器或声称编译测试已通过。复制 Aldine 代码进行实质性修改和网络提供服务时，请遵守 AGPL-3.0 的相应义务。

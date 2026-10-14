# Everflow /latex - Aldine 服务器配置

本目录提供 trahloff/Aldine 的可复用服务器配置，作用于已经同步的完整复刻源码 EverflowCN/aldine。开源许可 AGPL-3.0 允许按条件免费自托管；这不是作者免费提供给个人网站使用的公共编译服务器。官方 demo.aldine.dev 仅供演示，不应被当成生产编译 API。

## 文件

- docker-compose.yml：Aldine Node.js app + XeLaTeX/TeX Live Full 编译服务，两个 Docker 容器。
- docker-compose.build.yml：从 zuotiben/latex/aldine 复制的自己的源代码构建 app 与 compiler，而不是使用作者预编译的镜像。
- .env.example：环境参数示例，不包含密码、令牌或服务器。
- wrangler.jsonc：Cloudflare Worker /latex* 反向代理声明；默认 ALDINE_PUBLIC_READY=0，未开放转发。
- ../aldine-gateway-worker.mjs 及 ../aldine-proxy.mjs：此前已提供的 HTTP/WebSocket 同域代理代码。

## 1. 在本机或有 Docker 的宿主机启动

需要 Docker Engine / Compose，建议参照 Aldine 上游的生产要求准备 2+ vCPU、8 GB RAM、40 GB 空闲磁盘；TeX Live Full 镜像非常大，需要下载。独立电脑可以免费自托管，但电脑需要一直开机才能供其他人访问。

进入 zuotiben 仓库目录执行：

    mkdir -p "$HOME/.config/everflow-aldine"
    cp latex/deploy/.env.example "$HOME/.config/everflow-aldine/aldine.env"
    # 编辑上面的外置配置，填入 ALDINE_ADMIN_EMAILS 等参数
    cd latex/deploy
    docker compose --env-file "$HOME/.config/everflow-aldine/aldine.env" up -d
    curl http://127.0.0.1:8080/api/health

默认使用官方公开的 0.11.0 Docker 镜像，便于验证完整服务能否运行。若要编译自己复刻的 Aldine 源码，使用：

    docker compose --env-file "$HOME/.config/everflow-aldine/aldine.env" \
      -f docker-compose.yml -f docker-compose.build.yml up -d --build

本机访问 http://127.0.0.1:8080/latex/ 测试前端。配置的公开地址是 https://zuotiben.top/latex，因此注册登录所需 Secure Cookie 主要用于 HTTPS 生产环境，本机纯 HTTP 的账号测试可能受限。启动时不能仅通过静态网站加载来判断是否完成编译，必须实际上传一个 XeLaTeX 文档并得到 PDF。

Aldine 应用与编译器共享 aldine-data 卷；用户配置与认证数据放在另一个仅应用可见的 aldine-secrets 卷。编译器没有公开端口、网络仅内部访问，并保留 cap_drop、pids_limit、no-new-privileges 等隔离限制。不要删除这些安全设置。

## 2. 通过 Cloudflare 挂载到网站 /latex/

当前网站通过 GitHub Pages 发布，静态页面不能运行 Docker，也不能执行 Node.js 后端。需要另外启动上述两容器，再通过 Cloudflare Tunnel 或其他 HTTPS 反向代理为 127.0.0.1:8080 配置专用上游地址，例如 https://aldine-origin.zuotiben.top/。上游的 /latex/ 页面及应用健康检查必须可用。

Cloudflare Workers 单独部署 latex/deploy/wrangler.jsonc 所描述的 Worker，再为 Worker 配置 ALDINE_ORIGIN（上游 HTTPS 根地址，末尾带 /）。验证后手动将 ALDINE_PUBLIC_READY 改为 1。Worker Route 仅匹配 zuotiben.top/latex*；/paper/ 和网站其余路径不受影响。不要将上游配置为 https://zuotiben.top/，否则会递归代理。

启用时核查 https://zuotiben.top/latex/api/health 是否返回 JSON（ok=true、name=aldine），验证账户、ZIP 项目上传、XeLaTeX 编译、PDF 下载、WebSocket /latex/collab 和持久化。部署前应设置鉴权、合理限流、Cloudflare Access 或其他保护机制，避免其他人绕过入口滥用编译 CPU。请勿将编译器的 4020 端口公开。

特别注意：真正的 .env、密钥等不要保存到 zuotiben 仓库下的任何目录。站点 GitHub Pages workflow 发布整个工作目录，即使文件没有加入 Git，也可能在部署时被公开访问。将实际环境文件放在仓库之外的 ~/.config/everflow-aldine/ 下。

## 3. Railway

目前已有 Railway Everflow PDF Worker 是独立 PDF 服务，不是 Aldine 双容器部署；其运行环境没有和 Aldine 编译器共享的持久化项目卷。Railway 不会直接照搬 Docker Compose 部署所需双服务拓扑。本次没有修改、停止、重启原 Worker，也没有创建额外收费服务。若决定用 Railway，需单独解决 App 与 Compiler 共享目录的问题，不能仅设置 COMPILER_URL。

## 4. 源码与许可证

复刻源码位于 zuotiben/latex/aldine，并且继续从 EverflowCN/aldine 同步。Aldine 为 AGPL-3.0-only，保留原项目 LICENSE 和 THIRD-PARTY-NOTICES；向网络用户提供修改版服务时需满足对应源码提供义务。

源项目：https://github.com/trahloff/Aldine
复刻项目：https://github.com/EverflowCN/aldine

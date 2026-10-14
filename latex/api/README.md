# Aldine 原生 API：zuotiben.top/latex/api/

这里的接口不是新编写的假 API，而是 Aldine Node.js/Fastify 原始后端所提供的接口。完整路由源码已同步在 `latex/aldine/apps/server/src/routes.ts`，服务入口在 `latex/aldine/apps/server/src/index.ts`，编译器实现位于 `latex/aldine/apps/compiler/server.js`。

前端、接口及后端对应关系：

| 请求路径 | 说明 | 依赖 |
| --- | --- | --- |
| `GET /latex/api/health` | Aldine 应用健康检查 | Node.js App |
| `GET /latex/api/auth/me` | 当前登录状态 | Node.js App |
| `POST /latex/api/auth/login` | 用户登录 | Node.js App + 会话存储 |
| `GET /latex/api/projects` | 我的项目列表 | Node.js App + 持久化 |
| `POST /latex/api/projects/import` | 导入 ZIP | Node.js App + 项目存储 |
| `GET /latex/api/projects/:id/files` | 列出文件 | Node.js App + 项目存储 |
| `POST /latex/api/projects/:id/compile` | 请求编译 | Node.js App + TeX Live Compiler |
| `GET /latex/api/projects/:id/compile-status` | 查看编译状态 | Node.js App + Compiler |
| `GET /latex/api/projects/:id/output` | PDF 输出 | Node.js App + 生成 PDF |
| `GET /latex/api/templates` | 模板清单 | Node.js App |
| `/latex/collab`（WebSocket） | 多人协作 | Node.js App + WebSocket |

**目前状态**：这些接口的完整源码已经在网站 Git 仓库里，但 GitHub Pages 无法执行 Node.js、Git 和 TeX Live。因此源代码存在不等于生产域名会返回有效的 API 响应。直接把 /api 路由定义复制成网页文件，不能令 PDF 编译工作。

## 如何真正接入网站域名

1. 用 `latex/deploy/docker-compose.yml` 在受控主机上启动 App 和独立隔离的 TeX Live Compiler。确认 App 同时响应 `/api/health`、`/latex/api/health`，并启用 `AUTH_ENABLED=1`。
2. 用 Cloudflare Tunnel / HTTPS 反向代理为 App 建立专用上游 origin（例如 `https://aldine-origin.zuotiben.top/`），不要使用项目作者提供的 demo 服务。
3. 在 `EverflowCN/zuotiben` GitHub Actions secrets 设置 Cloudflare API Token 和 Account ID；在 Repository Variables 设置 `ALDINE_ORIGIN` 为真实 HTTPS 上游地址。
4. **手动运行** Actions 中的 `Activate Aldine API gateway`。该流程会验证后端健康检查、/latex 基础路径及开启的鉴权；不满足条件时拒绝修改 Cloudflare 线上路由。
5. 成功后，已有 `latex/aldine-gateway-worker.mjs` 将 `zuotiben.top/latex/*` 转发到独立 App；浏览器实际通过同域 `/latex/api/*` 和 `/latex/collab` 使用服务。静态网站其他目录不受影响。

重要：GitHub Actions 和 Worker 只是部署及入口转发，**不会替代常驻 Node.js + TeX Live 计算环境**。目前没有新购服务器，也没有改变旧 Railway PDF Worker。官方 Aldine 是 AGPL-3.0-only，修改并对外提供服务时须履行相应许可证义务。

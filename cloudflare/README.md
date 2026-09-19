# zuotiben.top Cloudflare backend

This directory contains the production backend for `zuotiben.top`:

- **Cloudflare Workers** — API
- **D1** — resources, versions, links, announcements, errata, experiences, settings, admin profiles and audit logs
- **External links** — 百度网盘、夸克网盘、直链、打印链接等；文件本体不存 Cloudflare
- **D1 session auth** — self-hosted administrator login, roles and sessions

## Security model

Public visitors only use:

- `GET /health`
- `GET /public/bootstrap`

All `/admin/*` routes fail closed unless Cloudflare Access authenticated the Worker request. The Worker reads the authenticated identity from native `ctx.access`; unauthenticated admin requests are rejected.

Do **not** expose Cloudflare API tokens or admin credentials to the browser. Public file downloads are stored as ordinary version/channel URLs in D1; file bytes remain on the external provider.

## First deployment

Requirements: Node.js 20+ and Wrangler 4.45+.

```bash
cd cloudflare
npm install
npx wrangler login
npx wrangler deploy
npx wrangler d1 migrations apply DB --remote
npx wrangler deploy
```

The D1 database is already provisioned and pinned in `wrangler.jsonc`. The first migration creates all tables and seeds the two current example resources.

After deployment, test the generated `workers.dev` URL:

```text
/health
/public/bootstrap
```

## Custom API domain

In Cloudflare, attach `api.zuotiben.top` as a Worker custom domain for `zuotiben-api`.

Recommended public endpoint:

```text
https://api.zuotiben.top/public/bootstrap
```

## Administrator authentication

Studio uses self-hosted authentication in the Worker and D1. It does not require Cloudflare Zero Trust.

Before the first Owner account is created, add a Worker Secret named:

```text
ADMIN_SETUP_TOKEN
```

Use a long random value. The Studio first-run screen asks for this token once. After the first Owner is created, the setup endpoint is disabled by database state.

Admin passwords are stored as PBKDF2-SHA-256 hashes with per-user random salts. Login sessions use random opaque tokens; D1 stores only their SHA-256 hashes. The browser receives an HttpOnly, Secure, SameSite=Lax cookie.

Production Studio should use:

```text
https://api.zuotiben.top
```

so the session cookie remains same-site with `https://zuotiben.top/studio/`.

## File delivery

This deployment intentionally does **not** use R2. Resource versions store download channels in D1 as URLs, such as 百度网盘、夸克网盘、直链、打印链接 or other custom links.

This keeps the initial deployment on the D1 + Workers free path without enabling an R2 billing subscription.

## GitHub Actions

`.github/workflows/cloudflare.yml` is manual by default. Add these GitHub repository secrets before running it:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

Use a scoped API token, not a Global API Key. It needs enough permission to deploy Workers and deploy Workers and access the D1 database used by this project.

# zuotiben.top Cloudflare backend

This directory contains the production backend for `zuotiben.top`:

- **Cloudflare Workers** — API
- **D1** — resources, versions, links, announcements, errata, experiences, settings, admin profiles and audit logs
- **External links** — 百度网盘、夸克网盘、直链、打印链接等；文件本体不存 Cloudflare
- **Cloudflare Access** — authentication in front of `/admin/*` (and the Studio URL)

## Security model

Public visitors only use:

- `GET /health`
- `GET /public/bootstrap`

All `/admin/*` routes fail closed unless both `ACCESS_TEAM_DOMAIN` and `ACCESS_AUD` are configured and a valid Cloudflare Access JWT is present. The Worker verifies the Access JWT signature, issuer, audience and expiry before any admin data is returned or changed.

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

## Cloudflare Access

Protect at minimum:

```text
api.zuotiben.top/admin/*
```

If the public site is proxied by Cloudflare, also protect:

```text
zuotiben.top/studio/*
```

Recommended login method for a small team: Cloudflare identity provider restricted to your Cloudflare account members. Alternatively, use One-time PIN and explicitly allow only administrator email addresses.

After creating the Access application, set these Worker variables:

```bash
npx wrangler secret put ACCESS_TEAM_DOMAIN
npx wrangler secret put ACCESS_AUD
```

`ACCESS_TEAM_DOMAIN` is the team name from `<team>.cloudflareaccess.com`.
`ACCESS_AUD` is the Access application Audience (AUD) tag.

## File delivery

This deployment intentionally does **not** use R2. Resource versions store download channels in D1 as URLs, such as 百度网盘、夸克网盘、直链、打印链接 or other custom links.

This keeps the initial deployment on the D1 + Workers free path without enabling an R2 billing subscription.

## GitHub Actions

`.github/workflows/cloudflare.yml` is manual by default. Add these GitHub repository secrets before running it:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

Use a scoped API token, not a Global API Key. It needs enough permission to deploy Workers and deploy Workers and access the D1 database used by this project.

# zuotiben.top Cloudflare backend

This directory contains the production backend for `zuotiben.top`:

- **Cloudflare Workers** — API
- **D1** — resources, versions, links, announcements, errata, experiences, settings, admin profiles and audit logs
- **R2** — PDF / ZIP / images / other files
- **Cloudflare Access** — authentication in front of `/admin/*` (and the Studio URL)

## Security model

Public visitors only use:

- `GET /health`
- `GET /public/bootstrap`
- `GET /files/<object-key>` for files explicitly marked public

All `/admin/*` routes fail closed unless both `ACCESS_TEAM_DOMAIN` and `ACCESS_AUD` are configured and a valid Cloudflare Access JWT is present. The Worker verifies the Access JWT signature, issuer, audience and expiry before any admin data is returned or changed.

Do **not** expose a D1 ID, R2 API credential or Cloudflare API token to the browser. D1 and R2 are accessed only through Worker bindings.

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

Wrangler supports automatic provisioning for D1/R2 bindings that have no resource ID. On the first authenticated deploy it can create and link the required resources automatically. The first migration creates all tables and seeds the two current example resources.

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

## R2 uploads

Admin upload endpoint:

```text
PUT /admin/files/<object-key>
```

Optional headers:

```text
X-File-Name
X-Resource-Id
X-Version-Id
X-Public: 1
Content-Type
```

Public files are streamed through:

```text
GET /files/<object-key>
```

The Worker checks the D1 `files.is_public` flag before returning an R2 object.

## GitHub Actions

`.github/workflows/cloudflare.yml` is manual by default. Add these GitHub repository secrets before running it:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

Use a scoped API token, not a Global API Key. It needs enough permission to deploy Workers and manage the D1/R2 resources used by this project.

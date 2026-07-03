# myPilotPost API

Cloudflare Workers backend for the myPilotPost platform.

- Runtime: Cloudflare Workers
- Database: Cloudflare D1 (SQLite), binding `mypilotpost`
- Storage: Cloudflare R2, binding `MEDIA_BUCKET`
- KV: `OAUTH_STATE` (OAuth flow state)
- Realtime: Durable Object `SupportChatRoom`
- Entry point: `src/server.js`

---

## Prerequisites

- Node.js 18+
- Wrangler CLI: `npm install -g wrangler`
- Cloudflare account with Workers and D1 access
- Run `wrangler login` before any remote commands

---

## Local Development

```sh
cd packages/api
wrangler dev
```

The worker starts at `http://localhost:8787`. D1 runs in local SQLite mode automatically.

Apply migrations to the local database before first use:

```sh
wrangler d1 migrations apply mypilotpost --local
```

---

## Environment Variables

Set in Cloudflare dashboard (Workers → Settings → Variables) or via `wrangler secret put`:

| Variable | Required | Description |
|---|---|---|
| `JWT_SECRET` | Yes | Secret for signing and verifying JWTs |
| `OPENAI_API_KEY` | Yes | Used by AI generation endpoints |
| `FREEPIK_API_KEY` | No | Media intelligence suggestions |
| `YOCO_SECRET_KEY` | No | Yoco payment webhook validation |
| `GOOGLE_CLIENT_SECRET` | No | Google OAuth |
| `FACEBOOK_CLIENT_SECRET` | No | Facebook/Instagram OAuth |
| `LINKEDIN_CLIENT_SECRET` | No | LinkedIn OAuth |
| `TIKTOK_CLIENT_SECRET` | No | TikTok OAuth |
| `PINTEREST_CLIENT_SECRET` | No | Pinterest OAuth |
| `DROPBOX_CLIENT_SECRET` | No | Dropbox OAuth |
| `CANVA_CLIENT_SECRET` | No | Canva OAuth |

Non-secret variables (CLIENT IDs, BASE_URL, ENVIRONMENT) are committed in `wrangler.toml`.

---

## Applying Migrations

### Local

```sh
wrangler d1 migrations apply mypilotpost --local
```

### Remote (Production)

```sh
wrangler d1 migrations apply mypilotpost --remote
```

Always check which migrations have already been applied before running against production:

```sh
wrangler d1 migrations list mypilotpost --remote
```

### Migration Notes

- 85 numbered migrations from `000_` to `085_`
- Two files share the `023_` prefix — see `migrations/023_COLLISION_NOTE.md`
- Numbers 029, 039, 040 are intentional gaps
- `phase4_admin_compat.sql` lacks a numeric prefix — apply manually if needed:
  ```sh
  wrangler d1 execute mypilotpost --file=migrations/phase4_admin_compat.sql --remote
  ```
- Next migration to create: `086_<description>.sql`

---

## Deployment

```sh
wrangler deploy
```

This deploys `src/server.js` to Cloudflare Workers. Confirm the entry point in `wrangler.toml`:

```toml
main = "src/server.js"
```

---

## Cron Behaviour

The Worker exports a `scheduled()` handler that Cloudflare calls on two cron schedules:

| Schedule | Expression | Purpose |
|---|---|---|
| Every minute | `* * * * *` | Delivery scheduler — picks up due `delivery_jobs` and executes them |
| Daily 3am UTC | `0 3 * * *` | Reserved for nightly intelligence/reporting engines |

Both cron expressions call the same `scheduled()` handler. The delivery scheduler is
idempotent — frequent calls are safe.

To confirm cron is active after deployment:
Cloudflare Dashboard → Workers & Pages → `mypilotpost-api` → Triggers → Cron Triggers

---

## Health Check

```sh
curl https://api.mypilotpost.com/api/health
```

Expected response:

```json
{ "status": "ok", "version": "1.1.1-qa" }
```

---

## Key Directories

```
src/
  server.js          # Worker entry point — all HTTP routes
  index.js           # Dormant Hono prototype — NOT the active entry point
  auth/              # JWT, middleware, OAuth provider handlers
  core/              # Business logic engines
    content/         # Social posts, blog posts, scheduling
    delivery/        # Scheduler, poster, retry logic, platform adapters
    analytics/       # Customer, executive, SEO analytics
    brands/          # Brand management, DNA, intelligence
    billing/         # Plan enforcement, Yoco webhook
    campaigns/       # Campaign engine V2
    intelligence/    # Brand audits, insights, weekly planner
    media/           # Media library, R2, provider imports
    onboarding/      # Onboarding V2, website/social ingest
  integrations/      # OAuth unified flow, provider registry
  routes/
    support.js       # Real-time support chat (SSE + Durable Objects)
    admin.ts         # Dormant — not used by server.js
    public.ts        # Dormant — not used by server.js
  lib/               # Shared utilities (db, jwt, crypto, rate-limit)
migrations/          # D1 SQL migration files
```

---

## Admin Trigger — Manual Delivery Run

For testing or emergency recovery, an admin can trigger delivery manually:

```sh
curl -X POST https://api.mypilotpost.com/api/internal/delivery/run \
  -H "Authorization: Bearer <admin-jwt>"
```

This processes all `status = 'scheduled'` jobs synchronously. Use only for debugging.

---

## API Documentation & Contracts

- [Content Studio & Template System API Documentation](../../docs/api/studio.md)
- [Unified API Contracts](../../docs/v1.1-api-contracts.md)


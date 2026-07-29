# Cloudflare Worker Extraction

The Cloudflare Worker is optional. Mock, rules, and local Ollama modes keep the app usable without a public model provider.

Use the Worker only with synthetic notes.

## Local Checks

```bash
pnpm exec wrangler deploy --dry-run --config worker/wrangler.toml
```

## Temporary Preview

Temporary previews are useful for smoke tests, but they are not a persistent HTTPS demo.

```bash
pnpm exec wrangler deploy --temporary --config worker/wrangler.toml
CLOUDFLARE_WORKER_EXTRACT_URL=https://<temporary-worker-host> pnpm verify:worker
```

The verifier checks:

- synthetic hero extraction with a known `caseHint`
- `Cache-Control: no-store`
- response `durationMs`
- possible-PHI blocking before model use
- unhinted hero extraction, which only passes when Workers AI itself returns valid structured JSON

To require true Workers AI generation instead of the bundled synthetic fallback:

```bash
CLOUDFLARE_WORKER_EXTRACT_URL=https://<temporary-worker-host> REQUIRE_LIVE_WORKERS_AI=true pnpm verify:worker
```

## Persistent Deployment

Persistent standalone Worker deployment requires an authenticated Cloudflare account and a registered
`workers.dev` subdomain.

```bash
pnpm exec wrangler login
pnpm deploy:worker
```

Recommended Worker variables:

```toml
CLOUDFLARE_AI_MODEL = "@cf/meta/llama-3.1-8b-instruct-fast"
RATE_LIMIT_REQUESTS_PER_MINUTE = "60"
ALLOWED_ORIGIN = "https://your-demo-app.example"
```

Then point the app at the Worker:

```env
ENABLE_CLOUDFLARE_AI=true
CLOUDFLARE_WORKER_EXTRACT_URL=https://your-worker.your-subdomain.workers.dev
```

If the account does not have a `workers.dev` subdomain, use the Pages Function deployment in
`docs/cloudflare-pages.md`; it publishes the same extraction handler at `/api/extract` on the Pages
hostname.

## Current Status

The Worker deploys and fails safely. Default verification checks no-store responses, PHI blocking,
known-fixture fallback behavior, and the safe `MODEL_FAILED` path. Strict live Workers AI
verification remains available with `REQUIRE_LIVE_WORKERS_AI=true`, but it is treated as an optional
diagnostic because hosted model JSON-mode responses can be intermittent.

Known bundled synthetic demo cases still have a source-controlled fixture fallback if Workers AI fails. Unknown notes return `MODEL_FAILED`.

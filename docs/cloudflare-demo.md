# Cloudflare Demo Extraction

Cloudflare extraction is optional and disabled by default. The app works without it in `mock` and `rules` mode.

Use Cloudflare mode only with synthetic notes.

## Pages Function

The persistent public demo uses a Cloudflare Pages Function at `/api/extract`. It reuses the same handler
as the standalone Worker.

The Pages Function and shared Worker handler live in:

```text
functions/api/extract.ts
worker/src/index.ts
wrangler.toml
```

Validate the Pages Function bundle:

```bash
pnpm exec wrangler pages functions build functions --compatibility-date 2026-06-27 --build-output-directory out
```

Deploy after authenticating Wrangler with the target Cloudflare account:

```bash
pnpm deploy:cloudflare-demo
```

Current persistent demo:

```text
https://ai-oto-surgical-diagrammer.pages.dev
https://ai-oto-surgical-diagrammer.pages.dev/api/extract
```

## Optional Standalone Worker

The standalone Worker lives in:

```text
worker/src/index.ts
worker/wrangler.toml
```

Validate the Worker bundle:

```bash
pnpm exec wrangler deploy --dry-run --config worker/wrangler.toml
```

Deploy after authenticating Wrangler with the target Cloudflare account:

```bash
pnpm deploy:worker
```

Persistent standalone Worker deployment requires the Cloudflare account to have a registered `workers.dev`
subdomain. Use the Pages Function path above when that account-level subdomain is not configured.

## App configuration

For the Pages Function demo, use the same-origin extraction endpoint:

```env
NEXT_PUBLIC_CLOUDFLARE_WORKER_EXTRACT_URL=/api/extract
```

For a standalone Worker deployment, set the deployed Worker URL:

```env
ENABLE_CLOUDFLARE_AI=true
CLOUDFLARE_WORKER_EXTRACT_URL=https://YOUR-WORKER.YOUR-SUBDOMAIN.workers.dev
NEXT_PUBLIC_CLOUDFLARE_WORKER_EXTRACT_URL=https://YOUR-WORKER.YOUR-SUBDOMAIN.workers.dev
```

Use `CLOUDFLARE_WORKER_EXTRACT_URL` for the Next.js API forwarding path. Use
`NEXT_PUBLIC_CLOUDFLARE_WORKER_EXTRACT_URL` for static Pages deployments where the browser calls the
Worker directly.

Restrict CORS before sharing a standalone Worker public demo:

```bash
pnpm exec wrangler secret put ALLOWED_ORIGIN --config worker/wrangler.toml
```

Use the exact app origin, such as `https://your-demo.pages.dev`. The Worker only returns
`Access-Control-Allow-Origin` for that configured origin. The default rate limit is 60 extraction
requests per minute per client IP and can be changed with `RATE_LIMIT_REQUESTS_PER_MINUTE`.

Check deployment readiness:

```bash
pnpm verify:providers
CLOUDFLARE_WORKER_EXTRACT_URL=https://ai-oto-surgical-diagrammer.pages.dev/api/extract pnpm verify:worker
```

To require true Workers AI JSON extraction with no fixture fallback, add `REQUIRE_LIVE_WORKERS_AI=true`.
That mode is a diagnostic for the optional hosted model path and may fail when the model provider is
temporarily unable to produce schema-valid JSON.

For public demo deployments, keep the default extractor as mock unless you intentionally want hosted model extraction:

```env
NEXT_PUBLIC_DEFAULT_EXTRACTOR=mock
NEXT_PUBLIC_ALLOW_PROVIDER_SWITCHER=false
```

## Worker safety behavior

- Rejects empty notes.
- Rejects notes over 12,000 characters.
- Runs PHI-like precheck before model calls.
- Returns `Cache-Control: no-store`.
- Restricts CORS to `ALLOWED_ORIGIN` when configured.
- Applies a basic per-client extraction rate limit.
- Uses Workers AI JSON schema mode.
- Uses a compact model-facing schema, then converts to the full `OperativeCase` object.
- Validates the full case with the app's Zod schema before returning it.
- Falls back to a bundled source-controlled synthetic fixture for known demo cases if JSON mode fails.
- Returns generic failure messages.

The synthetic fallback is only for known fixture IDs, includes an explicit warning in the response,
and keeps unknown notes on the safe `MODEL_FAILED` path.

## Not production PHI-ready

This is not a HIPAA production deployment path. Real ePHI requires institutional approval, HIPAA-compliant hosting arrangements, a BAA with providers handling ePHI, security risk analysis, audit logging, access control, retention policy, and legal review.

# Cloudflare Pages Static Demo

The lowest-cost hosted demo path is:

```text
Cloudflare Pages static UI -> same-origin Pages Function at /api/extract
```

This keeps the app usable without a Next.js server. Mock and rules mode still run in the browser, and
Cloudflare mode calls the Pages Function, which reuses the same safe extraction handler as the standalone
Worker.

## Build

Use the lightweight static build for Pages:

```bash
NEXT_PUBLIC_CLOUDFLARE_WORKER_EXTRACT_URL=/api/extract pnpm build:static
EXPECT_PUBLIC_WORKER_URL=/api/extract pnpm verify:static
pnpm verify:static:runtime
```

Output directory:

```text
out
```

Build command for Cloudflare Pages:

```bash
pnpm build:static
```

Environment variables for Pages:

```env
NEXT_PUBLIC_DEFAULT_EXTRACTOR=mock
NEXT_PUBLIC_ALLOW_PROVIDER_SWITCHER=true
NEXT_PUBLIC_CLOUDFLARE_WORKER_EXTRACT_URL=/api/extract
```

The static build includes the small, locally stored NIH BioArt and Servier Medical Art files declared
in `public/medical-art/manifest.json`. It contains no Stanford Oto Surgery Atlas files.

## Deploy

After authenticating Wrangler:

```bash
pnpm exec wrangler login
pnpm deploy:cloudflare-demo
```

The deployment script:

- builds the static Pages artifact with the extraction endpoint embedded
- verifies the static artifact
- smoke-tests the static artifact in a browser from a plain static server
- compiles the Pages Function wrapper around the Worker handler
- creates the Cloudflare Pages project if needed
- deploys Pages
- verifies true Workers AI extraction at the persistent Pages Function endpoint
- verifies Pages reachability

Preview the plan without deploying:

```bash
pnpm deploy:cloudflare-demo:dry-run
```

The static export includes `public/_headers`, which applies the production CSP and browser hardening
headers on Cloudflare Pages.

Current persistent demo:

```text
https://ai-oto-surgical-diagrammer.pages.dev
https://ai-oto-surgical-diagrammer.pages.dev/api/extract
```

## Optional Standalone Worker

The standalone Worker path is still supported for accounts that have registered a `workers.dev`
subdomain:

```bash
pnpm deploy:worker
CLOUDFLARE_WORKER_EXTRACT_URL=https://your-worker.your-subdomain.workers.dev pnpm verify:worker
```

Add `REQUIRE_LIVE_WORKERS_AI=true` when you specifically want strict hosted-model verification with
no synthetic fixture fallback.

# Otology Visual Summary

Synthetic-data-only proof of concept for converting otology operative-note-style text into a surgeon-reviewed, family-facing educational diagram.

The app is intentionally conservative:

- It uses mock and rules-based extraction first.
- It validates structured cases with Zod.
- It renders deterministic SVG components, not AI-generated images.
- It does not store raw note text.
- It repeatedly warns that real patient data must not be entered.

## Local development

```bash
pnpm install
pnpm dev
pnpm test
pnpm typecheck
pnpm e2e
```

## Stanford atlas assets

The scraper uses the public WordPress REST media API for `https://otosurgeryatlas.stanford.edu/` and writes a provenance manifest plus downloaded image files.

```bash
pnpm scrape:atlas
pnpm index:atlas
pnpm verify:atlas:remote
pnpm verify:atlas:pages
```

Downloaded binary files are ignored by git and can be regenerated.

## Optional providers

Mock and rules mode work without external services. To check live optional provider readiness:

```bash
pnpm verify:providers
pnpm verify:artifacts
pnpm verify:privacy
pnpm verify:ollama
```

For the optional Cloudflare Worker path, see `docs/cloudflare-worker.md` and run:

```bash
CLOUDFLARE_WORKER_EXTRACT_URL=https://your-worker.example pnpm verify:worker
```

For a persistent Cloudflare Pages demo with the same extraction handler deployed as a Pages Function, see
`docs/cloudflare-pages.md`:

```bash
pnpm deploy:cloudflare-demo
CLOUDFLARE_WORKER_EXTRACT_URL=https://ai-oto-surgical-diagrammer.pages.dev/api/extract pnpm verify:worker
```

Strict live Workers AI extraction can be checked separately with `REQUIRE_LIVE_WORKERS_AI=true`.

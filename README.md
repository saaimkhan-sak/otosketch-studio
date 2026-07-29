# OtoSketch Studio

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

## Medical illustration engine

OtoSketch composes finite, deterministic overlays on professional open medical
art. The current library uses:

- NIH BioArt `BIOART-000256`, a Public Domain vector created in Adobe Illustrator.
- Servier Medical Art auditory illustrations under CC BY 4.0.

The asset provenance and license details live beside each source in
`public/medical-art/`. No Stanford Oto Surgery Atlas artwork or tracing is used.

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

# Implementation Audit

Last updated: 2026-06-30

This audit maps the current implementation to the Codex product implementation guide. It is intentionally evidence-based: a requirement is only marked complete when there is a source file, generated artifact, or command result that proves it.

## Functional Requirements

| ID | Requirement | Status | Evidence |
|---|---|---|---|
| FR-001 | Synthetic input textarea with warning and 12,000 character limit | Complete | `src/components/app/NoteInput.tsx`, `src/components/app/SafetyBanner.tsx`, e2e hero workflow |
| FR-002 | At least six bundled synthetic cases | Complete | `src/fixtures/syntheticCases.ts`, `ExampleCasePicker.tsx`, `src/tests/schema.test.ts`, component test for six-case minimum and expected-case label |
| FR-003 | Provider abstraction with mock/rules first and optional model providers | Complete | `src/extractors/NoteExtractor.ts`, `providerRegistry.ts`, `mockExtractor.ts`, `rulesExtractor.ts`, `ollamaExtractor.ts`, `cloudflareExtractor.ts` |
| FR-004 | Structured extraction to typed case with Zod validation | Complete | `src/domain/schema.ts`, `normalize.ts`, `src/domain/evidence.ts`, `src/tests/schema.test.ts`, `src/tests/rulesExtractor.test.ts`; documented negative values such as `none`/`not_applicable` require evidence; rule-derived and model-derived evidence include validated/recovered character offsets |
| FR-005 | Deterministic diagram rendering from structured JSON | Complete | `src/domain/diagramMapping.ts`, `src/domain/atlasTemplates.ts`, `src/components/diagram/AtlasTemplateDiagram.tsx`, `src/tests/atlasTemplates.test.ts`, `e2e/diagram-visual.spec.ts`; unsupported cases render no diagram |
| FR-006 | Structured correction UI updates diagram and marks clinician edits | Complete | `src/components/app/CorrectionPanel.tsx`, `src/domain/editCase.ts`, component/e2e tests; manual edits return the case to draft and support undo/reset to generated output |
| FR-007 | Source evidence display and support badges | Complete | `src/components/app/EvidencePanel.tsx`, `FindingsPanel.tsx`, `ReviewIssuesPanel.tsx`, `buildFeatureMap()`, selectable-feature/evidence-map regression test |
| FR-008 | Deterministic patient-friendly explanation | Complete | `src/domain/patientText.ts`, `src/tests/patientText.test.ts` |
| FR-009 | Approval state and reviewed-for-demo workflow | Complete | `src/components/app/ApprovalPanel.tsx`, `src/domain/review.ts`, e2e hero workflow; unsupported claims and incomplete review checklist block reviewed state |
| FR-010 | Browser print/PDF and SVG export excluding raw note | Complete | `src/components/app/ExportPanel.tsx`, `src/domain/review.ts`, component/e2e tests, reviewed-state export gate, one-page Chromium PDF check |
| FR-011 | Safety banners, export disclaimer, cloud-provider warning | Complete | `SafetyBanner.tsx`, `ExportPanel.tsx`, `AppShell.tsx`, alert/status roles for dynamic warnings, cloud-mode e2e test |
| FR-012 | No storage of note text | Complete for MVP | No database/localStorage code; extraction responses use `Cache-Control: no-store`; tests cover API no-store; `pnpm verify:privacy` scans app/Worker source |
| Atlas integration | Searchable atlas browser plus template-backed diagram renderer | Complete | `src/components/app/AtlasBrowser.tsx`, `src/domain/atlas.ts`, `src/domain/atlasTemplates.ts`, `src/tests/atlas.test.tsx`, `src/tests/atlasTemplates.test.ts` |
| Deployment security | CSP, browser hardening headers, provider gating, Worker/Pages Function CORS/rate limit | Complete for MVP | `src/lib/securityHeaders.ts`, `next.config.ts`, `src/app/api/extract/route.ts`, `functions/api/extract.ts`, `worker/src/index.ts`, tests |

## Milestones

| Milestone | Status | Evidence |
|---|---|---|
| 0 Repo and foundations | Complete | `package.json`, configs, README, docs, green `pnpm lint/typecheck/test/build/e2e` |
| 1 Domain schema and fixtures | Complete | `src/domain/*`, `src/fixtures/*`, schema tests |
| 2 Mock extractor and first UI | Complete | `mockExtractor.ts`, picker/textarea/generate/findings UI |
| 3 SVG diagram renderer | Complete | two-panel atlas-backed SVG renderer with exact-template gating, per-panel atlas provenance, PORP/TORP support, incus erosion/IS separation support, and deterministic OtoMimix bone-cement overlay support |
| 4 Correction and evidence UI | Complete | correction controls, source evidence panel, approval blockers |
| 5 Rules extractor and adversarial tests | Complete | `rulesExtractor.ts`, `adversarialCases.ts`, rules tests, eight-case adversarial evaluator, `pnpm evaluate:synthetic` |
| 6 Export | Complete | print-only family summary, SVG download, disclaimer, no raw note text test, one-page PDF e2e |
| 7 Optional local Ollama | Complete | `ollamaExtractor.ts`, Ollama-compatible schema, unavailable-server test, `pnpm verify:ollama`, live `qwen2.5:3b` hero extraction |
| 8 Optional Cloudflare demo | Complete | Persistent Cloudflare Pages demo at `https://ai-oto-surgical-diagrammer.pages.dev`, Pages Function extraction endpoint at `/api/extract`, shared Worker handler, compact model schema, mocked Worker/Pages Function tests, CORS/rate-limit tests, fallback-safe live endpoint verification, app route forwarding |
| 9 Clinician demo polish | Complete for internal demo | `docs/demo-script.md`, `docs/feedback/template.md`, polished hero workflow |

## Atlas Scrape

The Stanford Oto Surgery Atlas scrape is complete and reproducible.

Evidence:

- `scripts/scrape-stanford-atlas.mjs`
- `scripts/build-atlas-index.mjs`
- `public/atlas-assets/stanford/manifest.json`
- `public/atlas-assets/stanford/index.json`
- `public/atlas-assets/stanford/files/`
- `scripts/verify-atlas-remote.mjs`
- `scripts/verify-atlas-page-references.mjs`
- `docs/evaluation/atlas-page-reference-report.md`
- `src/components/app/AtlasBrowser.tsx`

Verified current counts:

- manifest assets: 1,140
- downloaded files: 1,140
- index entries: 1,140
- failures: 0
- live WordPress media API image assets: 1,140
- missing local remote IDs: 0
- extra local IDs: 0
- public sitemap pages crawled for image references: 119
- page-referenced atlas image originals: 1,137
- page-referenced originals missing from manifest: 0

The binary files are intentionally ignored by git because the scrape is about 998 MB and can be regenerated.

## Verification Commands

Current green checks:

```bash
pnpm evaluate:synthetic
pnpm verify:privacy
pnpm typecheck
pnpm lint
pnpm test
pnpm e2e
pnpm build
NEXT_PUBLIC_CLOUDFLARE_WORKER_EXTRACT_URL=/api/extract pnpm build:static:remote-atlas
EXPECT_PUBLIC_WORKER_URL=/api/extract pnpm verify:static
pnpm verify:static:runtime
pnpm deploy:cloudflare-demo:dry-run
pnpm deploy:cloudflare-demo
pnpm exec wrangler pages functions build functions --compatibility-date 2026-06-27 --build-output-directory out
pnpm exec wrangler deploy --dry-run --config worker/wrangler.toml
pnpm verify:artifacts
pnpm verify:atlas:remote
pnpm verify:atlas:pages
pnpm verify:providers
CLOUDFLARE_WORKER_EXTRACT_URL=https://ai-oto-surgical-diagrammer.pages.dev/api/extract pnpm verify:worker
pnpm verify:ollama
pnpm exec wrangler deploy --temporary --config worker/wrangler.toml
```

Latest test coverage:

- Unit/component/API/Worker/Pages Function/security tests: 15 files, 81 tests
- Browser workflow/accessibility/export/visual regression tests: 18 tests, including axe WCAG scan, template rationale/enlarge-dialog workflow, review-checklist-gated approval, OtoMimix overlay SVG export, one-page PDF generation, and desktop/mobile screenshots for six canonical cases
- Visual regression screenshots: `e2e/diagram-visual.spec.ts-snapshots/*.png`
- Atlas artifact verification: manifest/index/file hashes pass
- Live atlas inventory verification: remote API reports 1,140 image assets; local manifest contains all 1,140 with no missing/extra IDs
- Atlas page-reference verification: public sitemap crawl checks 119 pages and confirms all 1,137 unique page-referenced atlas image originals are present in the manifest
- Static privacy scan: 51 app/Worker/Pages Function source files scanned for browser storage and console logging
- Renderer non-inference guardrail: undocumented anatomy renders as muted, non-selectable context instead of implied-normal anatomy; every selectable SVG feature in bundled synthetic cases is asserted to have a `buildFeatureMap()` evidence entry
- Template-selection guardrail: each reviewed atlas template carries exact-match rationale, known limitations, source-pixel calibration notes, and demo/clinician-review status; the diagram preview surfaces this metadata beside the selected atlas assets
- Extraction non-inference guardrail: intact anatomy no longer implies absent graft/repair details; `none` and `not_applicable` claims are rejected unless supported by source evidence; malformed evidence offsets are rejected; rules extraction recovers exact source spans; model-provider evidence quotes are verified against the note and assigned offsets, with repeated quotes flagged
- Review-issue guardrail: ambiguity details and unsupported claims are shown in the review workspace, unsupported claims block the reviewed state until corrected, and the clinician checklist requires laterality, evidence, template limitations, and handout copy review before marking reviewed
- Review-edit guardrail: manual structured-field changes reset the case to draft, expose an undo action for the most recent edit, and allow reset to the last generated extraction without regenerating
- Export guardrail: patient education SVG/PDF export is disabled until the diagram has been marked reviewed, stale/unsafe/unresolved review blockers remain export blockers, blocked/unsupported cases do not render family-facing explanatory claims, and the patient handout area visually distinguishes locked preview from reviewed handout draft
- Accessibility guardrail: dynamic PHI, extraction, stale-result, review-blocker, review-issue, and export-blocker messages use alert/status semantics in addition to visible styling
- Deployment security: CSP and browser hardening headers configured; optional providers blocked server-side unless intentionally enabled; `.env*` and `.dev.vars` ignored while `.env.example` documents safe defaults; shared Worker/Pages Function handler supports CORS restriction through `ALLOWED_ORIGIN`; rate limit dry-run packaged; debug failures expose only error type, never raw thrown/model-response text
- Static Pages export: `build:static:remote-atlas` plus `verify:static` generated a 3,656,574 byte `out/` artifact, copied Cloudflare `_headers`, pruned local atlas binaries from `out/`, embedded the configured `/api/extract` endpoint, and kept the source scrape intact in `public/atlas-assets/stanford/files/`
- Static runtime smoke: `pnpm verify:static:runtime` served `out/` with a plain static server and verified app load, atlas index load, mock extraction, PORP atlas image loading, keyboard evidence selection, checklist-gated review/export, OtoMimix overlay rendering, rules extraction, and cloud-mode PHI blocking in Chromium
- Static Cloudflare mode: browser calls `NEXT_PUBLIC_CLOUDFLARE_WORKER_EXTRACT_URL` directly when configured, including the same-origin Pages Function endpoint
- Persistent Cloudflare deploy orchestration: `pnpm deploy:cloudflare-demo:dry-run` prints the authenticated deploy plan, including static build/verification, local runtime smoke, Pages Function compilation, Pages project setup/deploy, endpoint safety verification, and post-deploy reachability checks; strict live Workers AI verification is opt-in with `REQUIRE_LIVE_WORKERS_AI=true`
- Persistent Cloudflare Pages demo: `https://ai-oto-surgical-diagrammer.pages.dev` deployed successfully, with extraction endpoint `https://ai-oto-surgical-diagrammer.pages.dev/api/extract` and deployment preview `https://8dbfdb3d.ai-oto-surgical-diagrammer.pages.dev`
- Live public UI smoke: Chromium loaded the Pages app, selected the PORP case, verified the template rationale card, known limitations, enlarged diagram dialog, selected-marker ring, and atlas asset 1724 rendering; the deploy verifier also confirmed live Workers AI extraction succeeded for hinted and unhinted synthetic hero requests
- Pages Function verifier: default `pnpm verify:worker` passed for no-store responses, PHI blocking, known synthetic fallback behavior, and safe `MODEL_FAILED` handling; strict `REQUIRE_LIVE_WORKERS_AI=true` remains an optional diagnostic and is currently model-provider dependent
- Optional standalone Worker deploy: supported through `worker/wrangler.toml`; persistent standalone deploy requires a registered account `workers.dev` subdomain, while temporary Workers preview remains useful for smoke tests
- Worker JSON-mode fallback: when Workers AI fails, known bundled synthetic demo cases return source-controlled gold JSON with an explicit fallback warning; unknown notes return safe `MODEL_FAILED`
- Local Ollama extraction: `qwen2.5:3b` returned the synthetic hero case with expected family, laterality, incus erosion, IS discontinuity, bone cement bridge, and OtoMimix material
- Local app Ollama route: `POST /api/extract` with provider `ollama` returned the same expected hero case with `Cache-Control: no-store`
- Local app Cloudflare route: `POST /api/extract` with provider `cloudflare` forwarded to the live HTTPS extraction endpoint and returned the expected hero case with `Cache-Control: no-store`
- CI workflow: lint, typecheck, unit tests, synthetic evaluation, privacy scan, atlas page-reference verification, server build, static remote-atlas build, static export verification, static runtime smoke, Worker dry-run, and e2e browser tests

Latest synthetic evaluation:

- Report JSON: `docs/evaluation/synthetic-corpus-report.json`
- Report Markdown: `docs/evaluation/synthetic-corpus-report.md`
- Mock provider field accuracy: 60/60 fields, 100.0%
- Rules provider field accuracy: 60/60 fields, 100.0%
- Rules adversarial checks: 8/8 passed

Latest optional provider diagnostic:

- Ollama: available at `http://localhost:11434` with `qwen2.5:3b` and `qwen2.5:0.5b`
- Cloudflare Pages demo: reachable at `https://ai-oto-surgical-diagrammer.pages.dev`
- Cloudflare extraction endpoint: configured successfully when `CLOUDFLARE_WORKER_EXTRACT_URL=https://ai-oto-surgical-diagrammer.pages.dev/api/extract`
- Wrangler: authenticated for account `4a22a4651e851f38165f0352fa453642`
- Standalone Worker note: account still needs a registered `workers.dev` subdomain for persistent standalone Worker publishing, but the Pages Function deployment completes the hosted demo path

## Accessibility Note

The diagram SVG uses `role="group"` with `aria-labelledby`, generated title/description text, and
focusable feature groups exposed as buttons with Enter/Space activation. Keyboard evidence review is
also available through the extracted-finding buttons beside the diagram. The browser accessibility
test runs an axe WCAG scan against the generated atlas-backed PORP workflow.

## External Verification

Persistent Cloudflare Pages verification is complete for the MVP hosted demo:

- Public app: `https://ai-oto-surgical-diagrammer.pages.dev`
- Public extraction endpoint: `https://ai-oto-surgical-diagrammer.pages.dev/api/extract`
- Default endpoint verifier: passed with no-store, PHI blocking, fallback-safe extraction, and safe failure checks
- Strict live Workers AI verifier: available with `REQUIRE_LIVE_WORKERS_AI=true`, but optional because hosted model JSON-mode reliability can vary

The app remains fully usable in mock and rules mode without external services.

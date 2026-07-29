# Implementation Audit

Last updated: 2026-07-28

This audit describes the current synthetic-data-only proof of concept.

## Functional Requirements

| ID | Requirement | Status | Evidence |
|---|---|---|---|
| FR-001 | Synthetic input with PHI warning and length limit | Complete | `NoteInput.tsx`, `SafetyBanner.tsx`, browser tests |
| FR-002 | Bundled synthetic examples | Complete | `src/fixtures/syntheticCases.ts`, schema tests |
| FR-003 | Mock/rules extraction first; optional providers | Complete | `src/extractors/*`, provider tests |
| FR-004 | Structured extraction and Zod validation | Complete | `src/domain/schema.ts`, normalization/evidence tests |
| FR-005 | Deterministic diagram from structured JSON | Complete | `src/domain/surgeryPlan.ts`, `src/domain/medicalArt.ts`, `MedicalIllustrationDiagram.tsx` |
| FR-006 | Structured clinician corrections | Complete | `CorrectionPanel.tsx`, edit/review tests |
| FR-007 | Source evidence and support state | Complete | `EvidencePanel.tsx`, `FindingsPanel.tsx`, regression tests |
| FR-008 | Deterministic patient language | Complete | `src/domain/patientText.ts`, unit tests |
| FR-009 | Clinician approval gate | Complete | `ApprovalPanel.tsx`, `src/domain/review.ts`, browser tests |
| FR-010 | Print/PDF and portable SVG export | Complete | `ExportPanel.tsx`, `src/lib/svgExport.ts`, browser/unit tests |
| FR-011 | Safety and provider warnings | Complete | app shell, security headers, tests |
| FR-012 | No note persistence or note logging | Complete for MVP | no database/browser storage; privacy scan; no-store API responses |
| Medical art | Professional open medical illustrations with structured overlays | Complete | `public/medical-art/manifest.json`, `src/domain/medicalArt.ts`, artifact verifier |

## Medical Illustration Engine

OtoSketch uses a finite, deterministic composition engine:

1. A mock, rules, or optional model provider produces structured data.
2. Zod validation and normalization reject unsafe or contradictory combinations.
3. A licensed professional base illustration is selected by procedure family.
4. Only documented, finite SVG layers are placed at reviewed anatomical anchors.
5. Clinician review gates patient export.

The current illustration sources are:

- NIH NIAID BioArt BIOART-000256, public domain, created by Ryan Kissinger in Adobe Illustrator 28.6.
- Servier Medical Art auditory-system illustrations, licensed CC BY 4.0.

No Stanford Oto Surgery Atlas image, tracing, manifest, scraper, runtime request, or coordinate
calibration remains in the application. The renderer does not use free-form image generation.

## Verification

Required checks:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm e2e
pnpm build
pnpm verify:artifacts
pnpm verify:privacy
pnpm evaluate:synthetic
```

Static Cloudflare compatibility remains available through `pnpm build:static`,
`pnpm verify:static`, and `pnpm verify:static:runtime`. The primary hosted application can use the
standard Next.js build on Vercel.

## Safety Guardrails

- Only synthetic fixtures are stored in the repository.
- Raw note text is neither persisted nor logged.
- Missing data remains `not_documented`; generic anatomy is not presented as a patient finding.
- Selectable extracted findings have source-evidence links when possible.
- Contradictory plans render a blocker instead of a misleading diagram.
- The base image, creator, software, source URL, license, and file hash are recorded.
- Exported SVG files embed their referenced medical-art images for portability.
- Every patient-facing export requires clinician review and retains the generic-anatomy disclaimer.

## Accessibility

SVG panels have programmatic titles and descriptions. Documented layers are keyboard-operable,
selected state is exposed, the full-screen dialog traps focus and restores it on close, and browser
tests include axe and responsive-overflow checks.

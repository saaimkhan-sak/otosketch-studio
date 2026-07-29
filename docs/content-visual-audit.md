# Content and Visual Audit

Last updated: 2026-06-30

This audit covers the public otology visual summary website after the atlas-backed renderer, template metadata, export safety, and clinician-review workflow updates. Status labels:

- Addressed: fixed in the current implementation.
- Partially addressed: safer or clearer now, but still worth improving.
- Future improvement: not required for the current synthetic-data demo, but should be considered before a broader clinical pilot.

## Executive Summary

The core safety model is now strong for the demo: the app uses synthetic notes, structured extraction, Zod validation, deterministic atlas-backed SVG rendering, reviewed template gating, and locked patient export. The main remaining challenge is product presentation: the app still contains a clinician console, diagram review surface, atlas reference browser, and patient handout generator on one page. The highest-risk content issue, showing family-facing prose when a diagram/template is unsupported, is addressed.

## Critical Findings

| Area | Status | Finding | Improvement |
|---|---|---|---|
| Unsupported cases | Addressed | Unsupported template edits must not show patient-facing repair claims. | Block diagram rendering and hide family-facing explanatory text until a reviewed atlas template exists. |
| Mobile order | Addressed | Diagram appeared too late on mobile. | Place generated diagram immediately after Generate, before lower-priority supporting panels. |
| Diagram size | Partially addressed | Atlas anatomy can still feel small in side-by-side review. | Added larger desktop layout and enlarge dialog; future work should add zoom/pan or a focused review tab. |
| Atlas references | Partially addressed | Source atlas browsing could overwhelm the main review task. | Keep exact template metadata beside the diagram and keep broad atlas browsing collapsed/drawer-like. |
| Patient export readiness | Addressed | Patient export previously felt polished before review. | Lock patient preview until review/template blockers are cleared and show explicit blocked reasons. |

## Visual Design Findings

| Area | Status | Finding | Improvement |
|---|---|---|---|
| Page density | Partially addressed | Many similar bordered modules make scanning hard. | Continue moving secondary content behind modes/tabs after the demo. |
| CTA hierarchy | Partially addressed | Generate and review actions can compete visually. | Keep Generate primary; review/export should feel gated and sequential. |
| Diagram dominance | Partially addressed | Diagram is the product but can still feel like one card among many. | Enlarge dialog helps; future sticky/focused review mode would help more. |
| SVG callout rail | Future improvement | Callout text can be small/cramped. | Increase callout type or move callouts into responsive HTML alongside the SVG. |
| OtoMimix overlay | Addressed | Overlay was too subtle. | Stronger stroke, fill, selected state, and provenance metadata now make it more legible. |
| Marker clustering | Future improvement | Some found-panel markers cluster over anatomy. | Add per-template marker collision tuning. |
| Provenance language | Partially addressed | Provenance was technical and small. | Template summary now humanizes source/rationale; further copy polish would help. |
| Handout polish | Addressed | Export preview felt like admin text. | Reviewed state now appears as a handout draft with guardrails; locked state is visually distinct. |
| Color palette | Future improvement | The palette is safe but generic. | Consider a restrained clinical education palette with stronger hierarchy, not decorative gradients. |
| Selected feature link | Addressed | Diagram marker, finding, and evidence connection was weak. | Selected marker ring and evidence selection state now tie the surfaces together. |
| Long mobile page | Partially addressed | Mobile remains lengthy. | Diagram order is fixed; future modes/tabs would shorten the path. |
| Atlas thumbnails | Partially addressed | Thumbnails can be noisy. | Broad browser is deemphasized; future work can improve thumbnail labels/filtering. |
| Warning competition | Partially addressed | Warnings can compete with the diagram. | Key patient-preview blocker is now near the top; future design can reduce duplicate alert weight. |
| Zoom/review | Addressed | Diagrams needed click-to-expand. | Enlarge diagram dialog is implemented. |
| Found/repaired labels | Partially addressed | Before/after meaning can be stronger. | Current labels remain clear; future copy could use "Before repair" / "After repair" if clinicians prefer it. |

## Content Findings

| Area | Status | Finding | Improvement |
|---|---|---|---|
| Product sentence | Addressed | "Proof of concept" undersold the purpose. | Header now says it creates surgeon-reviewed educational diagrams from structured operative findings. |
| Extractor label | Addressed | "Mock gold fixture" was developer language. | Demo extractor language is used instead. |
| Corrections label | Addressed | "Corrections" implied the app was always wrong. | Renamed to "Clinician review fields." |
| Export label | Addressed | "Family-facing export" was awkward. | Renamed to "Patient education preview." |
| Draft prominence | Addressed | Draft state needed to be louder. | Draft and locked states are visible before export. |
| Not documented | Addressed | Missing details needed clearer non-inference copy. | UI explains undocumented details are not assumed normal. |
| Edited fields | Partially addressed | "Supported" can be confusing for clinician-edited values. | Manual evidence is tracked; future copy should distinguish "Clinician edited" more directly in every row. |
| Patient explanations | Partially addressed | Explanations are safe but still generic. | Keep deterministic text; add template-specific reviewed patient copy over time. |
| Graft wording | Future improvement | Cartilage interposition versus tympanic membrane graft can be ambiguous. | Add more granular reviewed copy/templates for graft context. |
| Atlas provenance | Addressed | Source IDs needed human wording. | Diagram and template card show Stanford Oto Surgery Atlas asset IDs. |
| Unsupported next steps | Addressed | Unsupported state needed a path forward. | Blocked diagram copy suggests reviewed PORP, TORP, no-repair, exact OtoMimix, or unsupported status. |
| Generated dates | Future improvement | Fixture/generated timestamps can be confusing. | Use "generated from current extraction" or hide dates in demo fixtures. |
| Source note size | Future improvement | Note textarea still dominates after generation. | Collapse into "Source note" once output exists. |
| Evidence empty state | Addressed | Empty state was passive. | It now points users toward selecting findings/markers. |
| Diagnostic precision | Addressed | Export copy should not imply exact patient anatomy. | Handout says reference illustration, not diagnostic image, and surgeon confirmation required. |

## Clinical And Diagram Accuracy Findings

| Area | Status | Finding | Improvement |
|---|---|---|---|
| Tympanoplasty chain visibility | Future improvement | The tympanoplasty reference image does not clearly show every ossicle. | Keep as documented callouts, not exact anatomy; add reviewed variants if needed. |
| TM perforation variants | Future improvement | Central/posterior/subtotal are not truly customized masks yet. | Add reviewed masks/templates per common perforation pattern. |
| PORP/TORP exactness | Addressed | PORP/TORP are reference diagrams, not exact patient anatomy. | Template limitations and handout guardrails now say this explicitly. |
| Missing anatomy | Addressed | Missing anatomy must not be implied normal. | Undocumented anatomy is muted/non-selectable and review fields preserve `not_documented`. |
| Template metadata | Addressed | Templates needed review status, rationale, limitations, and notes. | Metadata is now defined and surfaced in the template summary. |
| Anchor calibration | Addressed | Marker/overlay positions needed a calibration record. | Calibration notes are stored per template. |
| Asset fallback | Partially addressed | Static site relies on remote atlas images for small deploy size. | Local scrape/index exists; future production should decide between curated mirror and remote fallback. |
| Exact match explanation | Addressed | Users needed to know why a template was selected. | Template card shows exact-match rationale. |
| Template limitations | Addressed | Users needed to know what the template does not prove. | Template limitations are now visible. |
| OtoMimix sign-off | Addressed for demo | Overlay needed explicit review status. | OtoMimix overlay has sign-off metadata for the internal demo. |

## Workflow Findings

| Area | Status | Finding | Improvement |
|---|---|---|---|
| Modes/tabs | Future improvement | Extract, Review, Patient handout, and Atlas are still one long page. | Split into modes once the demo stabilizes. |
| Post-generate focus | Addressed | User should land on the diagram after generation. | Generate scrolls/focuses the diagram region. |
| Sticky diagram | Future improvement | Review would be easier if the diagram stayed visible. | Add sticky desktop diagram or split review workspace. |
| Reset after edits | Addressed | Manual edits needed a reset path. | Reset to generated is implemented. |
| Undo corrections | Addressed | Accidental dropdown edits needed recovery. | Undo edit is implemented. |
| Review checklist | Addressed | Marking reviewed was too easy. | Laterality, evidence, template limitations, and handout copy must be checked before demo review. |
| Export prose lock | Addressed | Export prose should not appear before review. | Family-facing explanation is hidden while blockers remain. |
| Why blocked | Addressed | Export blockers were too low on the page. | A top "Why patient preview is blocked" summary appears after the diagram. |
| Selected evidence placement | Partially addressed | Evidence still lives below/left rather than beside the diagram. | Selection linkage works; future layout should bring selected evidence closer to the diagram. |
| Template card | Addressed | Current source assets needed compact inline metadata. | Selected template card shows source assets, rationale, limitations, and review status. |

## Highest-Impact Plan Status

| Recommendation | Status |
|---|---|
| Reorder mobile so diagram comes directly after Generate | Addressed |
| Hide family-facing text when template/review/export is blocked | Addressed |
| Enlarge diagram preview and add zoom/fullscreen style review | Partially addressed with enlarge dialog |
| Move broad atlas browser behind secondary UI and show current template sources inline | Partially addressed |
| Rewrite labels to clinician/patient language | Addressed |
| Add exact-match and template limitation copy | Addressed |
| Add image-load tests for reviewed atlas assets | Addressed |
| Add reviewed-template metadata and clinical sign-off fields | Addressed for demo |
| Add undo/reset clinician correction controls | Addressed |
| Add clinician review checklist before export | Addressed |

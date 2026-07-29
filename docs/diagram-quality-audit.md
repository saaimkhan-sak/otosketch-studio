# Diagram Content and Correctness Remediation

Last updated: 2026-07-12

## Current Safety Position

Atlas-backed diagrams are internal draft references. No current template has recorded template-level otologist approval, so every patient-facing review and export path is blocked. The OtoMimix overlay is additionally identified as unsigned.

Only numbered callouts, explicit status badges, and deterministic overlays are case-specific. Every unnumbered structure in an unchanged atlas background is labeled as generic reference anatomy and must not be interpreted as documented patient anatomy. All panels identify the operative side while also stating that the source image itself is not lateralized. All images and overlays are explicitly not to scale.

## Remediations Implemented

- Replaced case-facing atlas captions that named unsupported etiologies with neutral anatomy/repair labels.
- Moved original atlas captions behind a provenance disclosure that warns they may contain causes absent from the note.
- Added a panel-by-panel coverage map to every template and a prominent reference-only anatomy rule in every rendered panel.
- Replaced “before” and “after repair” language with “finding reference,” “documented repair,” or “after the procedure,” depending on the structured case.
- When no ossicular repair is explicitly documented, the second panel says the reference anatomy is unchanged and does not imply a repair.
- Added a laterality label to every panel while identifying the generic atlas image as not lateralized.
- Changed tympanic-membrane callouts to “documented location—schematic marker only,” pending reviewed TM variants.
- Moved intraoperative stapes mobility into a separate status badge because a static illustration cannot depict movement.
- Made graft explanations context-specific: fascia for eardrum repair, cartilage as prosthesis protection for PORP/TORP, and perichondrium in its documented repair context.
- Replaced the arrow-bearing patient-handout background with matched atlas views of a typical central perforation and a medial graft in place. The repaired source view depicts the graft extending beyond the defect, while the deterministic teal highlight follows that source-defined graft region. Both views remain generic references, and the template remains unsigned pending otologist sign-off.
- Classified every diagram claim as source-reference anatomy, schematic overlay, marker-only location, or status-only text so documentation can no longer masquerade as a depicted structure.
- Tightened negation handling: only an explicit global statement that no ossicular reconstruction was performed maps to `none`. Documentation-status language and technique-specific negatives remain `not_documented`.
- Added a hard patient-facing review/export blocker until each exact template receives recorded otologist approval.

## Template Coverage and Status

| Synthetic case               | Internal diagram state                                                           | Patient-facing state                              |
| ---------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------- |
| `normal-ossicular-chain`     | Tympanoplasty reference with schematic TM and fascia callouts                    | Blocked pending template-level otologist approval |
| `incus-long-process-erosion` | Not rendered because reconstruction status is `not_documented`                   | Blocked                                           |
| `is-joint-discontinuity`     | Not rendered because technique-specific negatives do not establish global `none` | Blocked                                           |
| `hero-otomimix-is-joint`     | Internal deterministic OtoMimix overlay, marked unsigned and not to scale        | Blocked pending overlay and template approval     |
| `porp-reconstruction`        | Internal finding and PORP repair references                                      | Blocked pending template-level otologist approval |
| `torp-reconstruction`        | Internal finding and TORP repair references                                      | Blocked pending template-level otologist approval |

## Clinical Work Still Required

The application cannot perform clinical sign-off. An otologist must review each template independently, including all anchors, source-image interpretation boundaries, repair geometry, and patient wording. TM variants for central, posterior, subtotal, and intact states should be clinically reviewed before replacing schematic location markers. The OtoMimix bridge shape and anchors require explicit approval or replacement with a dedicated reviewed source asset.

Until that work is recorded in template metadata, the export blocker is intentional and must not be bypassed.

## Verification Requirements

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm e2e`
- Desktop and mobile screenshots for every canonical synthetic case
- Overflow checks for visible text at supported responsive widths
- Tests confirming neutral source labels, panel coverage metadata, schematic TM wording, mobility status, context-specific graft copy, strict negation handling, and template-level export blocking

# Content and Visual Audit

Last updated: 2026-07-29

## Current Direction

The diagram is now a medical-illustration workspace rather than a traced-atlas viewer. A bright
anatomical canvas sits inside a restrained clinical interface; the anatomy comes from NIH BioArt or
Servier Medical Art, and OtoSketch adds only deterministic layers from documented structured fields.

## Addressed

| Area                 | Current implementation                                                                                                                                              |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Primitive anatomy    | Replaced hand-drawn/traced bases with professional medical art                                                                                                      |
| Provenance           | Creator, illustration software, source, license, and limitations appear with the diagram                                                                            |
| Clinic use           | Upcoming-procedure mode works without a patient note and produces a reviewed discussion guide                                                                       |
| Postoperative use    | Finding and completed-procedure panels distinguish the documented state from repair                                                                                 |
| Teaching use         | Procedure guide and structured layer legend support stepwise explanation                                                                                            |
| Diagram references   | Every spatial legend row has the same numbered badge on the illustration; status-only rows are not assigned anatomy numbers                                         |
| Label obstruction    | Badges stay in a dedicated gutter; leader routes sit beneath licensed anatomy, while only a short target tick repaints above anatomy and below the surgical overlay |
| Laterality           | Anatomy targets and protected bounds mirror exactly for the left ear while badge text and source-pixel coordinates remain unchanged                                 |
| Missing data         | Undocumented details are not drawn as normal findings                                                                                                               |
| Unsupported variants | A subtype without a reviewed visual cannot mutate the anatomy and is labeled “Not illustrated” instead of reusing a misleading completed-procedure graphic          |
| Contradictions       | Anatomically conflicting selections suppress the diagram                                                                                                            |
| Export               | Patient PDF/SVG remains locked until clinician review                                                                                                               |
| Mobile               | The diagram follows generation and is contained without page-level horizontal overflow                                                                              |
| Full screen          | The illustration sequence has a keyboard-accessible focused review dialog                                                                                           |

## Second Precision Audit

The renderer cross-validates each overlay against one spatial descriptor for
its target, protected bounds, numbered badge, leader, and legend ordinal. The
browser suite checks that these sets are identical for every common procedure
and synthetic reference case at desktop and mobile sizes.

- All registered landmarks on the NIH and Servier canvases are frozen in
  source pixels and bound to the exact checked-in asset hash.
- PORP/TORP contacts, cartilage coverage, incus erosion clipping, retained
  stapes footplate clipping, tympanic polygons, graft coverage, and tube
  quadrants have geometry-specific gold tests.
- Every rendered overlay must fit inside its declared protected bounds.
- Diagram badges must remain outside both the medical-art frame and legend,
  and collision tests cover coincident sets up to 18 layers.
- Right/left browser tests cover all nine common procedure families and prove
  the exact mirror equation without changing source coordinates or ordinals.
- The same integrity and mirror matrix runs for postoperative examples and
  preoperative common-procedure plans.
- A one-source-pixel registry mutation fails the audit.

The calibration fixtures remain
`reference-calibrated-pending-ent-signoff`. These checks prove deterministic
source registration and non-obstructive layout; they do not claim
patient-specific placement or substitute for ENT review.

## Remaining Product Opportunities

| Priority | Opportunity                                                                                                          |
| -------- | -------------------------------------------------------------------------------------------------------------------- |
| High     | Add more individually reviewed otology base illustrations for mastoid, tympanic membrane, and implant-specific views |
| High     | Have ENT reviewers validate each anchor and overlay geometry before clinical pilot use                               |
| Medium   | Split the long workspace into clearer Create, Review, Teach, and Patient handout modes                               |
| Medium   | Add zoom/pan for fine anatomical teaching while retaining an accessible text equivalent                              |
| Medium   | Add reviewed preoperative step sequences for the most common procedures                                              |
| Low      | Add institution-specific handout templates without changing the structured rendering engine                          |

## Clinical Presentation Limits

- The illustration is generic reference anatomy, not patient-specific geometry or a diagnostic image.
- Procedure overlays communicate a documented or planned concept, not exact operative scale.
- A planned procedure can change intraoperatively.
- The proof of concept requires surgeon review before patient or trainee use.
- Free-form image generation is intentionally excluded.

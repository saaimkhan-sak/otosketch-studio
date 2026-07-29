# Content and Visual Audit

Last updated: 2026-07-28

## Current Direction

The diagram is now a medical-illustration workspace rather than a traced-atlas viewer. A bright
anatomical canvas sits inside a restrained clinical interface; the anatomy comes from NIH BioArt or
Servier Medical Art, and OtoSketch adds only deterministic layers from documented structured fields.

## Addressed

| Area | Current implementation |
|---|---|
| Primitive anatomy | Replaced hand-drawn/traced bases with professional medical art |
| Provenance | Creator, illustration software, source, license, and limitations appear with the diagram |
| Clinic use | Upcoming-procedure mode works without a patient note and produces a reviewed discussion guide |
| Postoperative use | Finding and completed-procedure panels distinguish the documented state from repair |
| Teaching use | Procedure guide and structured layer legend support stepwise explanation |
| Missing data | Undocumented details are not drawn as normal findings |
| Contradictions | Anatomically conflicting selections suppress the diagram |
| Export | Patient PDF/SVG remains locked until clinician review |
| Mobile | The diagram follows generation and is contained without page-level horizontal overflow |
| Full screen | The illustration sequence has a keyboard-accessible focused review dialog |

## Remaining Product Opportunities

| Priority | Opportunity |
|---|---|
| High | Add more individually reviewed otology base illustrations for mastoid, tympanic membrane, and implant-specific views |
| High | Have ENT reviewers validate each anchor and overlay geometry before clinical pilot use |
| Medium | Split the long workspace into clearer Create, Review, Teach, and Patient handout modes |
| Medium | Add zoom/pan for fine anatomical teaching while retaining an accessible text equivalent |
| Medium | Add reviewed preoperative step sequences for the most common procedures |
| Low | Add institution-specific handout templates without changing the structured rendering engine |

## Clinical Presentation Limits

- The illustration is generic reference anatomy, not patient-specific geometry or a diagnostic image.
- Procedure overlays communicate a documented or planned concept, not exact operative scale.
- A planned procedure can change intraoperatively.
- The proof of concept requires surgeon review before patient or trainee use.
- Free-form image generation is intentionally excluded.

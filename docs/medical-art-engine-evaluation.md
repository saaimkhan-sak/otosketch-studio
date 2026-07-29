# Medical art engine and product reference evaluation

Evaluated July 2026 for a synthetic-data-only proof of concept.

## Decision

Use [NIH NIAID BioArt](https://bioart.niaid.nih.gov/) and
[Servier Medical Art (SMART)](https://smart.servier.com/category/anatomy-and-the-human-body/auditory-system/)
as the open anatomical art foundation, delivered locally and composed with validated,
deterministic overlays.

The selected NIH vector is public domain and was produced by a professional medical illustrator
in Adobe Illustrator. SMART provides ear and auditory-system illustrations under CC BY 4.0. The
application stores the selected assets locally, records their source, software, hash, and license,
and never sends note text to an art provider. The structured SurgeryPlan remains the source of
truth.

This is an asset-library integration rather than a hosted generation API. No
evaluated service offered all of the following at once: free production use,
otology-specific procedural coverage, a stable embedding API, appropriate
commercial rights, deterministic output, and zero note-text disclosure.

## Engine candidates

| Candidate | What it offers | Cost/rights fit | Decision |
|---|---|---|---|
| [NIH NIAID BioArt](https://bioart.niaid.nih.gov/) | Downloadable professional biomedical vectors | Selected asset is public domain; no account or per-user license required | Selected vector foundation |
| [Servier Medical Art](https://servier.com/en/newsroom/smart-medical-education/) | More than 3,000 downloadable medical images; 10 auditory-system illustrations | CC BY 4.0; reuse and adaptation permitted with attribution | Selected auditory-system foundation |
| [BioIcons](https://github.com/duerrsimon/bioicons) | Open SVG aggregator and diagrams.net extension | Free; license and attribution vary by asset | Approved expansion source after per-asset review |
| [BioDigital Human Viewer API](https://www.biodigital.com/product/developer-toolkits) | Embeddable interactive 3D anatomy | Personal plan excludes publishing and developer toolkits; May 2026 free tier is also view/content limited | Not a free application engine |
| [BioRender](https://www.biorender.com/basic-license) | Large professional life-science library and authoring canvas | Basic license covers finished, watermarked personal graphics; it does not permit redistributing content as this application's drawing engine | Design reference only |

There is no third-party personal account to obtain for the selected engine. The public-domain and
CC BY licenses apply automatically and are broader, more deployable rights than a single-user
personal license. OtoSketch still preserves attribution for both sources.

## Comparable products and design lessons

These are analogues rather than exact competitors; none combines structured
operative-note extraction, postoperative patient education, preoperative clinic
planning, and ENT trainee walkthroughs.

- [Touch Surgery](https://www.medtronic.com/en-us/healthcare-professionals/specialties/touch-surgery/simulations.html)
  reports 6.5 million-plus users, more than 200 simulations, and 17-plus
  specialties. Adopt the stepwise sequence and clear separation between
  orientation, procedure, and verification.
- [BioRender](https://www.biorender.com/library) reports millions of users and
  more than 50,000 icons and templates. Adopt the focused canvas, compact
  inspectors, strong export affordances, and restrained scientific palette.
- [Complete Anatomy](https://www.elsevier.com/products/complete-anatomy)
  emphasizes immersive manipulation and spatial relationships. Adopt a dark
  clinical workspace around a bright anatomical focal canvas.
- [drawMD ENT](https://www.entandaudiologynews.com/reviews/tech-reviews/post/drawmd-ent)
  is the closest historical workflow reference: select an ENT base image, add
  pathology/treatment stamps, annotate, and share. Adopt the base-image plus
  finite-overlay model, while replacing freehand ambiguity with structured
  selections and evidence.

## Safety and implementation guardrails

- No real patient data is included in assets, fixtures, or screenshots.
- Note text is never sent to Servier, BioIcons, or another image service.
- Structured extraction and Zod validation remain upstream of rendering.
- Missing details remain `not_documented`.
- Only documented layers receive markers or overlays.
- Every external asset has local provenance, attribution, and license metadata.
- The open art image is generic anatomy, never patient-specific anatomy.
- Free-form image generation is not part of the rendering path.

# Demo Script

Intro:

This is a synthetic-data-only prototype. The app does not make clinical decisions. It turns documented otology findings into a draft educational diagram that the surgeon reviews and edits before it is shown to a family.

Demo steps:

1. Select `Incus-stapes erosion repaired with OtoMimix`.
2. Show the synthetic note and the safety banner.
3. Generate the visual summary.
4. Point to laterality, incus erosion, incus-stapes discontinuity, and OtoMimix repair in the extracted findings.
5. Click the incus erosion finding and show the source text.
6. Compare `What was documented` and `Documented repair`, noting that both are labeled reference views rather than literal patient-specific before/after images.
7. Change reconstruction type to PORP to demonstrate correction.
8. Use undo or reset to show the correction can be reversed without regenerating.
9. Change it back to bone cement bridge if needed.
10. Complete the clinician review checklist.
11. Mark reviewed for demo.
12. Show SVG download and print/save PDF export.

Questions:

- Would this be useful if review took less than 30 seconds?
- What is anatomically wrong or oversimplified?
- What are the five most common tympanoplasty/ossiculoplasty scenarios this should support?
- Would families benefit from taking this home or seeing it in the portal?
- What would make this unsafe or annoying in real workflow?

import type { SyntheticCaseFixture } from "./syntheticCases";

export const adversarialCaseNotes: Array<Pick<SyntheticCaseFixture, "id" | "title" | "note" | "teachingPoint">> = [
  {
    id: "negated-incus-erosion",
    title: "Negated incus erosion",
    note: "Synthetic operative note. Right tympanoplasty. There was no erosion of the incus. No prosthesis was placed.",
    teachingPoint: "Negated erosion must not render incus erosion.",
  },
  {
    id: "uncertain-incus-erosion",
    title: "Uncertain possible incus erosion",
    note: "Synthetic operative note. Left tympanoplasty. Possible mild erosion of the long process of the incus was noted, but this was not confirmed.",
    teachingPoint: "Uncertain erosion should create a warning rather than a high-confidence rendered finding.",
  },
  {
    id: "contradictory-stapes-porp",
    title: "Contradictory stapes/PORP note",
    note: "Synthetic operative note. Left tympanoplasty with ossiculoplasty. The stapes superstructure was absent. Later in the note, a PORP was described as placed on an intact stapes.",
    teachingPoint: "Contradictory anatomy and repair text should require review.",
  },
  {
    id: "missing-laterality",
    title: "Missing laterality",
    note: "Synthetic operative note. Tympanoplasty with ossiculoplasty. IS joint discontinuity was found. Bone cement was used.",
    teachingPoint: "Missing side must remain not_documented until reviewed.",
  },
  {
    id: "unsupported-ossiculoplasty-inference",
    title: "Unsupported ossiculoplasty inference",
    note: "Synthetic operative note. Left ossiculoplasty was performed in standard fashion. No prosthesis or material was specified.",
    teachingPoint: "Ossiculoplasty alone must not invent a reconstruction type.",
  },
  {
    id: "abbreviation-heavy",
    title: "Abbreviation-heavy otology note",
    note: "Synthetic operative note. Right tympanoplasty. IS joint discontinuity was present; HA cement was used to bridge the gap.",
    teachingPoint: "Supported abbreviations can be extracted with reviewable evidence.",
  },
  {
    id: "unsupported-procedure",
    title: "Unsupported non-otology note",
    note: "Synthetic operative note. Septoplasty was performed for nasal obstruction.",
    teachingPoint: "Unsupported procedures should not render an otology diagram.",
  },
  {
    id: "phi-like-input",
    title: "PHI-like input",
    note: "Synthetic warning example. Patient: Jane Sample. MRN 123456. Left tympanoplasty.",
    teachingPoint: "Obvious patient identifier patterns must trigger blocking warnings.",
  },
];

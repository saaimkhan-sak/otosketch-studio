import type { Evidence, OperativeCase } from "@/domain/schema";

export interface SyntheticCaseFixture {
  id: string;
  title: string;
  note: string;
  expected: OperativeCase;
  tags: string[];
  mustPass: boolean;
  teachingPoint: string;
}

function evidence(sourceText: string, extractionMethod: Evidence["extractionMethod"] = "mock"): Evidence {
  return {
    sourceText,
    confidence: "high",
    extractionMethod,
  };
}

function baseCase(id: string): Omit<OperativeCase, "procedure" | "anatomy" | "repair"> {
  return {
    schemaVersion: "1.0",
    caseId: id,
    inputKind: "synthetic_note",
    extractionProvider: "mock",
    createdAtIso: "2026-06-28T00:00:00.000Z",
    safety: {
      containsPossiblePhi: false,
      phiWarnings: [],
      suitableForRendering: true,
    },
    ambiguities: [],
    unsupportedClaims: [],
    review: {
      status: "draft_unreviewed",
    },
  };
}

export const syntheticCases: SyntheticCaseFixture[] = [
  {
    id: "normal-ossicular-chain",
    title: "Tympanoplasty with intact ossicular chain",
    note: `Synthetic operative note for demonstration only. No real patient information.

Procedure: Right tympanoplasty.

Findings: A central tympanic membrane perforation was identified. The malleus, incus, and stapes were visualized and the ossicular chain was intact and mobile. No ossicular reconstruction was performed.

Repair: The perforation edges were refreshed and an underlay temporalis fascia graft was placed.

This is fictional sample text for product development and should not be used for patient care.`,
    expected: {
      ...baseCase("normal-ossicular-chain"),
      procedure: {
        family: {
          value: "tympanoplasty",
          evidence: [evidence("Procedure: Right tympanoplasty.")],
          editedByClinician: false,
        },
        laterality: {
          value: "right",
          evidence: [evidence("Procedure: Right tympanoplasty.")],
          editedByClinician: false,
        },
      },
      anatomy: {
        tympanicMembrane: {
          value: "perforation_central",
          evidence: [evidence("A central tympanic membrane perforation was identified.")],
          editedByClinician: false,
        },
        malleus: {
          value: "intact",
          evidence: [evidence("The malleus, incus, and stapes were visualized and the ossicular chain was intact and mobile.")],
          editedByClinician: false,
        },
        incus: {
          value: "intact",
          evidence: [evidence("The malleus, incus, and stapes were visualized and the ossicular chain was intact and mobile.")],
          editedByClinician: false,
        },
        incudostapedialJoint: {
          value: "intact",
          evidence: [evidence("The malleus, incus, and stapes were visualized and the ossicular chain was intact and mobile.")],
          editedByClinician: false,
        },
        stapes: {
          value: "mobile",
          evidence: [evidence("The malleus, incus, and stapes were visualized and the ossicular chain was intact and mobile.")],
          editedByClinician: false,
        },
      },
      repair: {
        reconstructionType: {
          value: "none",
          evidence: [evidence("No ossicular reconstruction was performed.")],
          editedByClinician: false,
        },
        reconstructionMaterial: {
          value: "not_applicable",
          evidence: [evidence("No ossicular reconstruction was performed.")],
          editedByClinician: false,
        },
        graftType: {
          value: "temporalis_fascia",
          evidence: [evidence("an underlay temporalis fascia graft was placed.")],
          editedByClinician: false,
        },
      },
    },
    tags: ["tympanoplasty", "normal-chain", "graft"],
    mustPass: true,
    teachingPoint: "A normal ossicular chain should not trigger a prosthesis or cement repair.",
  },
  {
    id: "incus-long-process-erosion",
    title: "Incus long-process erosion without reconstruction",
    note: `Synthetic operative note for demonstration only. No real patient information.

Procedure: Left tympanoplasty.

Findings: The tympanic membrane had a posterior perforation. The long process of the incus was eroded. The stapes superstructure was intact and mobile. No ossicular reconstruction was documented in this sample.

Repair: The eardrum was reconstructed with temporalis fascia.

This is fictional sample text for product development and should not be used for patient care.`,
    expected: {
      ...baseCase("incus-long-process-erosion"),
      procedure: {
        family: {
          value: "tympanoplasty",
          evidence: [evidence("Procedure: Left tympanoplasty.")],
          editedByClinician: false,
        },
        laterality: {
          value: "left",
          evidence: [evidence("Procedure: Left tympanoplasty.")],
          editedByClinician: false,
        },
      },
      anatomy: {
        tympanicMembrane: {
          value: "perforation_posterior",
          evidence: [evidence("The tympanic membrane had a posterior perforation.")],
          editedByClinician: false,
        },
        malleus: {
          value: "not_documented",
          evidence: [],
          editedByClinician: false,
          warning: "Malleus status was not explicitly documented.",
        },
        incus: {
          value: "long_process_eroded",
          evidence: [evidence("The long process of the incus was eroded.")],
          editedByClinician: false,
        },
        incudostapedialJoint: {
          value: "not_documented",
          evidence: [],
          editedByClinician: false,
        },
        stapes: {
          value: "mobile",
          evidence: [evidence("The stapes superstructure was intact and mobile.")],
          editedByClinician: false,
        },
      },
      repair: {
        reconstructionType: {
          value: "not_documented",
          evidence: [evidence("No ossicular reconstruction was documented in this sample.")],
          editedByClinician: false,
          warning: "The note reports documentation status rather than an explicit global statement that no reconstruction was performed.",
        },
        reconstructionMaterial: {
          value: "not_documented",
          evidence: [evidence("No ossicular reconstruction was documented in this sample.")],
          editedByClinician: false,
        },
        graftType: {
          value: "temporalis_fascia",
          evidence: [evidence("The eardrum was reconstructed with temporalis fascia.")],
          editedByClinician: false,
        },
      },
    },
    tags: ["incus", "erosion", "no-reconstruction"],
    mustPass: true,
    teachingPoint: "Erosion alone should not invent a repair.",
  },
  {
    id: "is-joint-discontinuity",
    title: "Incus-stapes discontinuity without repair",
    note: `Synthetic operative note for demonstration only. No real patient information.

Procedure: Right tympanoplasty with middle ear exploration.

Findings: The tympanic membrane was intact after flap elevation. There was discontinuity at the incudostapedial joint. The stapes superstructure was intact. No prosthesis and no bone cement were placed in this sample.

This is fictional sample text for product development and should not be used for patient care.`,
    expected: {
      ...baseCase("is-joint-discontinuity"),
      procedure: {
        family: {
          value: "tympanoplasty",
          evidence: [evidence("Procedure: Right tympanoplasty with middle ear exploration.")],
          editedByClinician: false,
        },
        laterality: {
          value: "right",
          evidence: [evidence("Procedure: Right tympanoplasty with middle ear exploration.")],
          editedByClinician: false,
        },
      },
      anatomy: {
        tympanicMembrane: {
          value: "intact",
          evidence: [evidence("The tympanic membrane was intact after flap elevation.")],
          editedByClinician: false,
        },
        malleus: {
          value: "not_documented",
          evidence: [],
          editedByClinician: false,
        },
        incus: {
          value: "not_documented",
          evidence: [],
          editedByClinician: false,
        },
        incudostapedialJoint: {
          value: "discontinuous",
          evidence: [evidence("There was discontinuity at the incudostapedial joint.")],
          editedByClinician: false,
        },
        stapes: {
          value: "superstructure_intact",
          evidence: [evidence("The stapes superstructure was intact.")],
          editedByClinician: false,
        },
      },
      repair: {
        reconstructionType: {
          value: "not_documented",
          evidence: [evidence("No prosthesis and no bone cement were placed in this sample.")],
          editedByClinician: false,
          warning: "Technique-specific negatives do not exclude every possible reconstruction type.",
        },
        reconstructionMaterial: {
          value: "not_documented",
          evidence: [evidence("No prosthesis and no bone cement were placed in this sample.")],
          editedByClinician: false,
        },
        graftType: {
          value: "not_documented",
          evidence: [],
          editedByClinician: false,
        },
      },
    },
    tags: ["is-joint", "discontinuity", "negation"],
    mustPass: true,
    teachingPoint: "Negated prosthesis/cement language must keep repair layers absent.",
  },
  {
    id: "hero-otomimix-is-joint",
    title: "Incus-stapes erosion repaired with OtoMimix",
    note: `Synthetic operative note for demonstration only. No real patient information.

Procedure: Left tympanoplasty with ossicular chain reconstruction.

Findings: After elevation of the tympanomeatal flap, a posterior tympanic membrane perforation was visualized. The middle ear mucosa was healthy. The long process of the incus was eroded, resulting in discontinuity at the incudostapedial joint. The stapes superstructure was intact and mobile.

Repair: The tympanic membrane was reconstructed in standard fashion. OtoMimix bone cement was applied to bridge the eroded long process of the incus to the stapes capitulum. After the cement set, the ossicular chain appeared continuous.

This is fictional sample text for product development and should not be used for patient care.`,
    expected: {
      ...baseCase("hero-otomimix-is-joint"),
      procedure: {
        family: {
          value: "tympanoplasty_with_ossiculoplasty",
          evidence: [evidence("Procedure: Left tympanoplasty with ossicular chain reconstruction.")],
          editedByClinician: false,
        },
        laterality: {
          value: "left",
          evidence: [evidence("Procedure: Left tympanoplasty with ossicular chain reconstruction.")],
          editedByClinician: false,
        },
      },
      anatomy: {
        tympanicMembrane: {
          value: "perforation_posterior",
          evidence: [evidence("a posterior tympanic membrane perforation was visualized.")],
          editedByClinician: false,
        },
        malleus: {
          value: "not_documented",
          evidence: [],
          editedByClinician: false,
          warning: "Malleus status was not explicitly documented.",
        },
        incus: {
          value: "long_process_eroded",
          evidence: [evidence("The long process of the incus was eroded, resulting in discontinuity at the incudostapedial joint.")],
          editedByClinician: false,
        },
        incudostapedialJoint: {
          value: "discontinuous",
          evidence: [evidence("resulting in discontinuity at the incudostapedial joint.")],
          editedByClinician: false,
        },
        stapes: {
          value: "mobile",
          evidence: [evidence("The stapes superstructure was intact and mobile.")],
          editedByClinician: false,
        },
      },
      repair: {
        reconstructionType: {
          value: "bone_cement_bridge",
          evidence: [evidence("OtoMimix bone cement was applied to bridge the eroded long process of the incus to the stapes capitulum.")],
          editedByClinician: false,
        },
        reconstructionMaterial: {
          value: "otomimix",
          evidence: [evidence("OtoMimix bone cement was applied")],
          editedByClinician: false,
        },
        graftType: {
          value: "not_documented",
          evidence: [],
          editedByClinician: false,
        },
      },
    },
    tags: ["hero", "otomimix", "ossiculoplasty"],
    mustPass: true,
    teachingPoint: "This is the primary demo case.",
  },
  {
    id: "porp-reconstruction",
    title: "PORP reconstruction",
    note: `Synthetic operative note for demonstration only. No real patient information.

Procedure: Left tympanoplasty with ossiculoplasty.

Findings: A central tympanic membrane perforation was present. The incus was absent. The stapes superstructure was intact and mobile.

Repair: A titanium partial ossicular replacement prosthesis, or PORP, was placed onto the intact stapes superstructure. A cartilage graft was placed lateral to the prosthesis.

This is fictional sample text for product development and should not be used for patient care.`,
    expected: {
      ...baseCase("porp-reconstruction"),
      procedure: {
        family: {
          value: "tympanoplasty_with_ossiculoplasty",
          evidence: [evidence("Procedure: Left tympanoplasty with ossiculoplasty.")],
          editedByClinician: false,
        },
        laterality: {
          value: "left",
          evidence: [evidence("Procedure: Left tympanoplasty with ossiculoplasty.")],
          editedByClinician: false,
        },
      },
      anatomy: {
        tympanicMembrane: {
          value: "perforation_central",
          evidence: [evidence("A central tympanic membrane perforation was present.")],
          editedByClinician: false,
        },
        malleus: {
          value: "not_documented",
          evidence: [],
          editedByClinician: false,
        },
        incus: {
          value: "absent",
          evidence: [evidence("The incus was absent.")],
          editedByClinician: false,
        },
        incudostapedialJoint: {
          value: "not_documented",
          evidence: [],
          editedByClinician: false,
        },
        stapes: {
          value: "mobile",
          evidence: [evidence("The stapes superstructure was intact and mobile.")],
          editedByClinician: false,
        },
      },
      repair: {
        reconstructionType: {
          value: "porp",
          evidence: [evidence("A titanium partial ossicular replacement prosthesis, or PORP, was placed onto the intact stapes superstructure.")],
          editedByClinician: false,
        },
        reconstructionMaterial: {
          value: "titanium",
          evidence: [evidence("A titanium partial ossicular replacement prosthesis")],
          editedByClinician: false,
        },
        graftType: {
          value: "cartilage",
          evidence: [evidence("A cartilage graft was placed lateral to the prosthesis.")],
          editedByClinician: false,
        },
      },
    },
    tags: ["porp", "prosthesis"],
    mustPass: true,
    teachingPoint: "PORP and bone cement must render as distinct repairs.",
  },
  {
    id: "torp-reconstruction",
    title: "TORP reconstruction",
    note: `Synthetic operative note for demonstration only. No real patient information.

Procedure: Right tympanoplasty with ossiculoplasty.

Findings: The tympanic membrane had a subtotal perforation. The incus was absent and the stapes superstructure was absent. The footplate region was identified.

Repair: A titanium total ossicular replacement prosthesis, or TORP, was placed from the footplate region to the reconstructed tympanic membrane graft. A cartilage graft was placed lateral to the prosthesis.

This is fictional sample text for product development and should not be used for patient care.`,
    expected: {
      ...baseCase("torp-reconstruction"),
      procedure: {
        family: {
          value: "tympanoplasty_with_ossiculoplasty",
          evidence: [evidence("Procedure: Right tympanoplasty with ossiculoplasty.")],
          editedByClinician: false,
        },
        laterality: {
          value: "right",
          evidence: [evidence("Procedure: Right tympanoplasty with ossiculoplasty.")],
          editedByClinician: false,
        },
      },
      anatomy: {
        tympanicMembrane: {
          value: "perforation_subtotal",
          evidence: [evidence("The tympanic membrane had a subtotal perforation.")],
          editedByClinician: false,
        },
        malleus: {
          value: "not_documented",
          evidence: [],
          editedByClinician: false,
        },
        incus: {
          value: "absent",
          evidence: [evidence("The incus was absent")],
          editedByClinician: false,
        },
        incudostapedialJoint: {
          value: "not_documented",
          evidence: [],
          editedByClinician: false,
        },
        stapes: {
          value: "superstructure_absent",
          evidence: [evidence("the stapes superstructure was absent.")],
          editedByClinician: false,
        },
      },
      repair: {
        reconstructionType: {
          value: "torp",
          evidence: [evidence("A titanium total ossicular replacement prosthesis, or TORP, was placed from the footplate region to the reconstructed tympanic membrane graft.")],
          editedByClinician: false,
        },
        reconstructionMaterial: {
          value: "titanium",
          evidence: [evidence("A titanium total ossicular replacement prosthesis")],
          editedByClinician: false,
        },
        graftType: {
          value: "cartilage",
          evidence: [evidence("A cartilage graft was placed lateral to the prosthesis.")],
          editedByClinician: false,
        },
      },
    },
    tags: ["torp", "prosthesis"],
    mustPass: true,
    teachingPoint: "TORP should render only when total prosthesis is documented.",
  },
];

export const syntheticCaseById = new Map(syntheticCases.map((fixture) => [fixture.id, fixture]));

export function getSyntheticCase(id: string) {
  return syntheticCaseById.get(id) ?? syntheticCases[0];
}

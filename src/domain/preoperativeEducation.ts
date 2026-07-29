import {
  getActiveSurgeryLayers,
  labelSurgeryProcedure,
  type SurgeryLayer,
  type SurgeryPlan,
  type SurgeryProcedureFamily,
} from "./surgeryPlan";

export interface PreoperativePatientGuide {
  title: string;
  goals: string[];
  plannedSteps: string[];
  whatToExpect: string[];
  questions: string[];
  sourceLayerIds: string[];
  limitations: string[];
}

interface FamilyGuide {
  goal: string;
  expected: string;
  question: string;
}

const familyGuides: Record<SurgeryProcedureFamily, FamilyGuide> = {
  myringotomy_tympanostomy: {
    goal: "Create ventilation for the middle ear and, when planned, allow fluid to drain through an ear tube.",
    expected: "Your clinic will confirm whether a tube is planned and provide its own ear-drop and water instructions.",
    question: "Will a tube be placed, and what aftercare does this clinic recommend?",
  },
  tympanoplasty: {
    goal: "Repair or support an opening in the eardrum with a graft.",
    expected: "The graft material, surgical approach, and packing plan can vary and will be confirmed by the surgeon.",
    question: "Which graft and approach are planned, and will packing be used?",
  },
  ossiculoplasty: {
    goal: "Rebuild part of the sound-conducting connection through the small middle-ear bones.",
    expected: "The final reconstruction may be selected after the surgeon inspects the hearing bones directly.",
    question: "Could the reconstruction material or prosthesis change after the bones are inspected?",
  },
  tympanomastoidectomy: {
    goal: "Remove the planned area of cholesteatoma or other disease from the middle ear and mastoid.",
    expected: "The surgeon may adjust the canal-wall strategy, reconstruction, or staging after seeing the full extent of disease.",
    question: "Is a second-look or staged procedure possible, and what canal-wall approach is planned?",
  },
  stapes_surgery: {
    goal: "Bypass a fixed stapes so sound can be transmitted through the middle ear more effectively.",
    expected: "The exact fenestra and prosthesis plan will be confirmed during surgery; hearing improvement is not guaranteed.",
    question: "Which stapes technique and prosthesis are planned, and what balance precautions should I follow?",
  },
  cochlear_implant: {
    goal: "Place an internal receiver and electrode system that can stimulate the hearing nerve after later fitting and programming.",
    expected: "Activation and listening rehabilitation happen after surgery on the schedule set by the implant team.",
    question: "When will activation and programming occur, and what rehabilitation is planned?",
  },
  bone_conduction_implant: {
    goal: "Place an implant that can transmit sound through bone to the inner ear.",
    expected: "The implanted connection and external processor plan depend on the selected device and stage.",
    question: "Which implanted and external components are planned, and when will the processor be fitted?",
  },
  canalplasty: {
    goal: "Widen a narrowed part of the ear canal.",
    expected: "The extent of canal work and the packing or dressing plan will be confirmed by the clinic.",
    question: "Which part of the canal is planned for widening, and what packing or water precautions will apply?",
  },
  eustachian_tube_dilation: {
    goal: "Widen the cartilaginous part of the Eustachian tube with a balloon catheter.",
    expected: "The team will confirm whether an ear tube or another ear procedure is also planned.",
    question: "Is another ear procedure planned at the same visit?",
  },
};

function humanize(value: string) {
  const patientLabels: Record<string, string> = {
    porp: "a partial middle-ear bone prosthesis (PORP)",
    torp: "a total middle-ear bone prosthesis (TORP)",
    active_transcutaneous: "an active implant beneath the skin",
    passive_transcutaneous: "a magnetic implant beneath the skin",
    percutaneous: "a small skin-penetrating attachment",
    incus_long_process: "long portion of the incus hearing bone",
    malleus: "malleus hearing bone",
    round_window: "natural round-window opening",
    extended_round_window: "enlarged round-window opening",
    cochleostomy: "small surgically made opening into the cochlea",
    mid_turn_cochleostomy: "small opening into the middle turn of the cochlea",
    canal_wall_up: "mastoid surgery that preserves the back wall of the ear canal",
    canal_wall_down: "mastoid surgery that opens the cavity into the ear canal",
    canal_wall_reconstruction: "mastoid surgery with reconstruction of the ear-canal wall",
    mastoid_obliteration: "mastoid surgery that fills part of the cleaned cavity",
    subtotal_petrosectomy: "more extensive surgery that closes and fills the ear and mastoid spaces",
    one_stage: "a single operation",
    two_stage_first: "the first of two planned operations",
    two_stage_second: "the second of two planned operations",
  };
  if (patientLabels[value]) return patientLabels[value];
  return value.replaceAll("_", " ");
}

function detail(value: string, unavailable = ["not_documented", "none", "not_applicable"]) {
  return unavailable.includes(value) ? null : humanize(value);
}

function plannedLayerStep(layer: SurgeryLayer): string | null {
  if (layer.documentation !== "documented" || layer.role !== "action") return null;

  switch (layer.kind) {
    case "tm_graft": {
      const material = detail(layer.material);
      if (!material) return "An eardrum graft is planned; the surgeon will confirm the material and position.";
      const technique = detail(layer.technique);
      return `${material} graft placement is planned${technique ? ` using a ${technique} technique` : ""}.`;
    }
    case "ossicular_reconstruction": {
      const method = detail(layer.method);
      if (!method) return "The surgeon will confirm whether and how the hearing-bone connection will be reconstructed.";
      const material = detail(layer.material);
      return `${method}${material ? ` using ${material}` : ""} is planned for the hearing-bone connection.`;
    }
    case "tympanostomy": {
      if (layer.action === "tube_placed") {
        const tube = detail(layer.tubeType);
        const quadrant = detail(layer.quadrant);
        return `A small eardrum opening and ${tube ? `${tube} ` : ""}ear tube are planned${quadrant ? ` in the ${quadrant} area` : ""}.`;
      }
      if (layer.action === "myringotomy_only") return "A small eardrum opening without a tube is planned.";
      if (layer.action === "tube_not_placed") return "A small eardrum opening is planned; a tube is not part of the current plan.";
      return "The surgeon will confirm whether a small eardrum opening and tube are planned.";
    }
    case "mastoid_technique": {
      const technique = detail(layer.technique);
      return technique
        ? `${technique} is planned.`
        : "The mastoid approach will be confirmed by the surgeon.";
    }
    case "stapes_procedure": {
      const technique = detail(layer.technique);
      const attachment = detail(layer.pistonAttachment);
      return technique
        ? `${technique} is planned${attachment ? ` with the piston attached to the ${attachment}` : ""}.`
        : "The stapes technique and prosthesis attachment will be confirmed by the surgeon.";
    }
    case "cochlear_insertion": {
      const route = detail(layer.route);
      const array = detail(layer.array);
      return `Cochlear electrode placement is planned${route ? ` through the ${route}` : ""}${array ? ` using a ${array} array` : ""}.`;
    }
    case "bone_conduction_implant": {
      const coupling = detail(layer.coupling);
      const stage = detail(layer.stage);
      return `A bone-conduction implant is planned${coupling ? ` using ${coupling}` : ""}${stage ? `; ${stage} is planned` : ""}.`;
    }
    case "canalplasty": {
      const region = detail(layer.region);
      return `Ear-canal widening is planned${region ? ` in the ${region} region` : ""}.`;
    }
    case "eustachian_tube_dilation":
      return "Balloon dilation of the cartilaginous Eustachian tube is planned.";
  }
}

function unique(values: string[]) {
  return [...new Set(values)];
}

export function generatePreoperativePatientGuide(plan: SurgeryPlan): PreoperativePatientGuide {
  const families = plan.procedureFamilies === "not_documented" ? [] : plan.procedureFamilies;
  const activeLayers = getActiveSurgeryLayers(plan);
  const actionLayers = activeLayers.filter(
    (layer) => layer.role === "action" && layer.documentation === "documented",
  );
  const familyLabels = families.map(labelSurgeryProcedure);
  const side = plan.laterality === "left" || plan.laterality === "right" || plan.laterality === "bilateral"
    ? `${plan.laterality} ear`
    : "ear";

  const plannedSteps = unique(
    actionLayers
      .map(plannedLayerStep)
      .filter((step): step is string => Boolean(step)),
  );

  if (plannedSteps.length === 0) {
    plannedSteps.push("The exact surgical steps are not yet documented. Your surgeon will confirm the plan before surgery.");
  }

  return {
    title:
      familyLabels.length > 0
        ? `Your planned ${familyLabels.join(" + ")}`
        : "Your planned ear procedure",
    goals: unique(
      families.length > 0
        ? families.map((family) => familyGuides[family].goal)
        : ["Review the reason for the procedure and the anatomy your surgeon plans to address."],
    ),
    plannedSteps,
    whatToExpect: unique([
      ...families.map((family) => familyGuides[family].expected),
      `Your care team will confirm the procedure, ${side}, anesthesia, and consent before surgery.`,
      "Follow the clinic's written preparation, medication, aftercare, and urgent-contact instructions.",
    ]),
    questions: unique([
      ...families.map((family) => familyGuides[family].question),
      "In your own words, what is planned, what might change, and what should you do afterward?",
    ]),
    sourceLayerIds: actionLayers.map((layer) => layer.id),
    limitations: [
      "This is a generic procedure map, not an image of your ear.",
      "The surgeon may adapt the approach to the anatomy and findings seen during surgery.",
      "This educational preview does not replace informed consent or clinic instructions.",
    ],
  };
}

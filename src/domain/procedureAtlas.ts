import { atlasAssetImageUrl, type AtlasAssetIndexItem } from "./atlas";
import type { EducationMode } from "./educationMode";
import {
  getActiveSurgeryLayers,
  labelSurgeryLayerKind,
  labelSurgeryProcedure,
  type SurgeryLayer,
  type SurgeryPlan,
  type SurgeryProcedureFamily,
} from "./surgeryPlan";

export type ProcedureAtlasPhase = "finding" | "procedure";
export type ProcedureAtlasOverlayKind =
  | "finding"
  | "tube"
  | "graft"
  | "prosthesis"
  | "mastoid"
  | "piston"
  | "electrode"
  | "bone_implant"
  | "canal"
  | "balloon";

export interface ProcedureAtlasAnchor {
  x: number;
  y: number;
}

export interface ProcedureAtlasCallout {
  id: string;
  featureId?: string;
  label: string;
  detail: string;
  anchor?: ProcedureAtlasAnchor;
  overlayKind: ProcedureAtlasOverlayKind;
}

export interface ProcedureAtlasPanelSelection {
  phase: ProcedureAtlasPhase;
  asset: AtlasAssetIndexItem;
  imageUrl: string;
  title: string;
  subtitle: string;
  callouts: ProcedureAtlasCallout[];
}

export interface ProcedureAtlasSelection {
  family: SurgeryProcedureFamily;
  procedureLabel: string;
  lateralityLabel: string;
  coverage: "procedure_specific" | "generic_substrate";
  coverageNote: string;
  review: {
    status: "needs_clinician_signoff" | "clinician_approved";
    statusLabel: string;
  };
  panels: Record<ProcedureAtlasPhase, ProcedureAtlasPanelSelection>;
}

function asset(
  id: number,
  title: string,
  sourceUrl: string,
  pageLink: string,
  localPath: string,
  width: number,
  height: number,
): AtlasAssetIndexItem {
  return {
    id,
    title,
    sourceUrl,
    pageLink,
    localPath,
    width,
    height,
    mimeType: "image/jpeg",
    keywords: [],
  };
}

const assets = {
  eardrumAnatomy: asset(
    1140,
    "Pars tensa and pars flaccida of the tympanic membrane.",
    "https://tobacco-img.stanford.edu/otosurgery/2020/06/01132945/5a-1.jpg",
    "https://otosurgeryatlas.stanford.edu/otologic-surgery-atlas/tympanoplasty/5a-1/",
    "public/atlas-assets/stanford/files/1140-5a-1.jpg",
    1510,
    1192,
  ),
  centralPerforation: asset(
    1169,
    "Typical central tympanic membrane perforation.",
    "https://tobacco-img.stanford.edu/otosurgery/2020/06/01132846/5d-1.jpg",
    "https://otosurgeryatlas.stanford.edu/otologic-surgery-atlas/tympanoplasty/5d-1/",
    "public/atlas-assets/stanford/files/1169-5d-1.jpg",
    1333,
    1289,
  ),
  medialGraft: asset(
    1177,
    "Tympanomeatal flap replaced with a medial graft in place.",
    "https://tobacco-img.stanford.edu/otosurgery/2020/06/01132830/5d-24.jpg",
    "https://otosurgeryatlas.stanford.edu/otologic-surgery-atlas/tympanoplasty/5d-24/",
    "public/atlas-assets/stanford/files/1177-5d-24.jpg",
    1695,
    1484,
  ),
  lateralGraft: asset(
    1204,
    "Superior flap overlapping a lateral fascia graft.",
    "https://tobacco-img.stanford.edu/otosurgery/2020/06/01132736/5f-10.jpg",
    "https://otosurgeryatlas.stanford.edu/otologic-surgery-atlas/tympanoplasty/lateral-graft-fascia-graft-in-place/",
    "public/atlas-assets/stanford/files/1204-lateral-graft-fascia-graft-in-place.jpg",
    1641,
    1614,
  ),
  absentIncus: asset(
    1724,
    "Absence of a functional incus.",
    "https://tobacco-img.stanford.edu/otosurgery/2020/06/01130719/6a-5.jpg",
    "https://otosurgeryatlas.stanford.edu/otologic-surgery-atlas/ossiculoplasty/6a-5/",
    "public/atlas-assets/stanford/files/1724-6a-5.jpg",
    1143,
    1187,
  ),
  footplateOnly: asset(
    1727,
    "Stapes footplate without the remaining ossicular chain.",
    "https://tobacco-img.stanford.edu/otosurgery/2020/06/01130714/6a-8.jpg",
    "https://otosurgeryatlas.stanford.edu/otologic-surgery-atlas/ossiculoplasty/6a-8/",
    "public/atlas-assets/stanford/files/1727-6a-8.jpg",
    1143,
    1187,
  ),
  porp: asset(
    1736,
    "Titanium partial ossicular replacement prosthesis with cartilage protection.",
    "https://tobacco-img.stanford.edu/otosurgery/2020/06/01130657/6c-3.jpg",
    "https://otosurgeryatlas.stanford.edu/otologic-surgery-atlas/ossiculoplasty/6c-3/",
    "public/atlas-assets/stanford/files/1736-6c-3.jpg",
    1143,
    1187,
  ),
  torp: asset(
    1737,
    "Total ossicular replacement prosthesis with cartilage protection.",
    "https://tobacco-img.stanford.edu/otosurgery/2020/06/01130655/6c-6.jpg",
    "https://otosurgeryatlas.stanford.edu/otologic-surgery-atlas/ossiculoplasty/6c-6/",
    "public/atlas-assets/stanford/files/1737-6c-6.jpg",
    1143,
    1187,
  ),
  cholesteatoma: asset(
    2123,
    "Cholesteatoma patient education reference.",
    "https://tobacco-img.stanford.edu/otosurgery/2020/06/01125406/16f-Cholesteatoma-patient-handouts.jpg",
    "https://otosurgeryatlas.stanford.edu/16f-cholesteatoma-patient-handouts/",
    "public/atlas-assets/stanford/files/2123-16f-Cholesteatoma-patient-handouts.jpg",
    1190,
    845,
  ),
  mastoidectomy: asset(
    1972,
    "Completed mastoidectomy with the digastric ridge exposed.",
    "https://tobacco-img.stanford.edu/otosurgery/2020/06/01125755/7a-22.jpg",
    "https://otosurgeryatlas.stanford.edu/otologic-surgery-atlas/mastoidectomy/mastoid-finished/",
    "public/atlas-assets/stanford/files/1972-mastoid-finished.jpg",
    2000,
    1500,
  ),
  canalWallDown: asset(
    1345,
    "Cartilage and fascia reconstruction in a canal-wall-down mastoidectomy.",
    "https://tobacco-img.stanford.edu/otosurgery/2020/06/01132155/8b-25.jpg",
    "https://otosurgeryatlas.stanford.edu/otologic-surgery-atlas/cholesteatoma/canal-wall-down-completed/",
    "public/atlas-assets/stanford/files/1345-canal-wall-down-completed.jpg",
    2078,
    2111,
  ),
  stapesOverview: asset(
    2125,
    "Otosclerosis and stapes surgery patient education reference.",
    "https://tobacco-img.stanford.edu/otosurgery/2020/06/01125402/16h-Otosclerosis-Stapes-Surgery-patient-handouts.jpg",
    "https://otosurgeryatlas.stanford.edu/16h-otosclerosis-stapes-surgery-patient-handouts/",
    "public/atlas-assets/stanford/files/2125-16h-otosclerosis-stapes-surgery-patient-handouts.jpg",
    1190,
    845,
  ),
  stapesPiston: asset(
    1807,
    "Stapes piston placed through the fenestra into the vestibule.",
    "https://tobacco-img.stanford.edu/otosurgery/2020/06/01130358/4a-13.jpg",
    "https://otosurgeryatlas.stanford.edu/otologic-surgery-atlas/stapes-surgery/4a-13/",
    "public/atlas-assets/stanford/files/1807-4a-13.jpg",
    1200,
    1355,
  ),
  cochleaAnatomy: asset(
    1696,
    "Inner-ear scalae in relation to the ear canal, ossicles, and tympanic cavity.",
    "https://tobacco-img.stanford.edu/otosurgery/2020/06/01130819/11a-1-scaled.jpg",
    "https://otosurgeryatlas.stanford.edu/otologic-surgery-atlas/cochlear-implantation/11a-1/",
    "public/atlas-assets/stanford/files/1696-11a-1.jpg",
    2560,
    1553,
  ),
  cochlearInsertion: asset(
    1701,
    "Electrode array insertion into the inner ear.",
    "https://tobacco-img.stanford.edu/otosurgery/2020/06/01130807/11a-19.jpg",
    "https://otosurgeryatlas.stanford.edu/otologic-surgery-atlas/cochlear-implantation/11a-19/",
    "public/atlas-assets/stanford/files/1701-11a-19.jpg",
    2309,
    1427,
  ),
  earAnatomy: asset(
    2118,
    "Anatomy of the ear patient education reference.",
    "https://tobacco-img.stanford.edu/otosurgery/2020/06/01125416/16a-Anatomy-of-Ear-patient-handouts.jpg",
    "https://otosurgeryatlas.stanford.edu/16a-anatomy-of-ear-patient-handouts/",
    "public/atlas-assets/stanford/files/2118-16a-Anatomy-of-Ear-patient-handouts.jpg",
    1190,
    845,
  ),
  postauricularSubstrate: asset(
    1688,
    "Generic postauricular surgical exposure used in cochlear implantation.",
    "https://tobacco-img.stanford.edu/otosurgery/2020/06/01130839/11a-3.jpg",
    "https://otosurgeryatlas.stanford.edu/otologic-surgery-atlas/cochlear-implantation/11a-3/",
    "public/atlas-assets/stanford/files/1688-11a-3.jpg",
    2030,
    1665,
  ),
  canalNarrowing: asset(
    1635,
    "Multiple obstructive exostoses of the ear canal.",
    "https://tobacco-img.stanford.edu/otosurgery/2020/06/01131037/3f-1.jpg",
    "https://otosurgeryatlas.stanford.edu/otologic-surgery-atlas/external-ear/3f-1/",
    "public/atlas-assets/stanford/files/1635-3f-1.jpg",
    2254,
    2363,
  ),
  canalplasty: asset(
    1629,
    "Canalplasty extending slightly beyond the annulus margin.",
    "https://tobacco-img.stanford.edu/otosurgery/2020/06/01131053/3f-10.jpg",
    "https://otosurgeryatlas.stanford.edu/otologic-surgery-atlas/external-ear/3f-10/",
    "public/atlas-assets/stanford/files/1629-3f-10.jpg",
    1805,
    2199,
  ),
  eustachianAnatomy: asset(
    1235,
    "Frontal view of the Eustachian tube.",
    "https://tobacco-img.stanford.edu/otosurgery/2020/06/01132626/5h-1.jpg",
    "https://otosurgeryatlas.stanford.edu/otologic-surgery-atlas/tympanoplasty/eustachian-tube-anterior/",
    "public/atlas-assets/stanford/files/1235-eustachian-tube-anterior.jpg",
    1273,
    964,
  ),
  eustachianBalloon: asset(
    1236,
    "Deflated balloon inserted into the Eustachian tube opening.",
    "https://tobacco-img.stanford.edu/otosurgery/2020/06/01132623/5h-3.jpg",
    "https://otosurgeryatlas.stanford.edu/otologic-surgery-atlas/tympanoplasty/5h-3/",
    "public/atlas-assets/stanford/files/1236-5h-3.jpg",
    1612,
    2114,
  ),
} as const;

interface FamilySource {
  findingAsset: AtlasAssetIndexItem;
  procedureAsset: AtlasAssetIndexItem;
  findingAnchor: ProcedureAtlasAnchor;
  procedureAnchor: ProcedureAtlasAnchor;
  overlayKind: ProcedureAtlasOverlayKind;
  coverage: ProcedureAtlasSelection["coverage"];
  coverageNote: string;
  actionLayer: SurgeryLayer;
  findingKinds: SurgeryLayer["kind"][];
}

function documentedAction<Kind extends SurgeryLayer["kind"]>(
  layers: SurgeryLayer[],
  kind: Kind,
) {
  return layers.find(
    (layer): layer is Extract<SurgeryLayer, { kind: Kind }> =>
      layer.kind === kind &&
      layer.role === "action" &&
      layer.documentation === "documented",
  );
}

function familySource(
  family: SurgeryProcedureFamily,
  plan: SurgeryPlan,
  mode: EducationMode,
): FamilySource | null {
  const activeLayers = getActiveSurgeryLayers(plan);
  switch (family) {
    case "myringotomy_tympanostomy": {
      const actionLayer = documentedAction(activeLayers, "tympanostomy");
      if (!actionLayer || actionLayer.action !== "tube_placed") return null;
      return {
        findingAsset: assets.eardrumAnatomy,
        procedureAsset: assets.eardrumAnatomy,
        findingAnchor: { x: 0.5, y: 0.5 },
        procedureAnchor: { x: 0.33, y: 0.63 },
        overlayKind: "tube",
        coverage: "procedure_specific",
        coverageNote: "Clean eardrum anatomy with a deterministic tube-site overlay; the source does not contain a tube.",
        actionLayer,
        findingKinds: ["tm_state", "tm_perforation"],
      };
    }
    case "tympanoplasty": {
      const actionLayer = documentedAction(activeLayers, "tm_graft");
      if (
        !actionLayer ||
        actionLayer.purpose !== "tympanic_membrane_repair" ||
        (actionLayer.material === "none" || actionLayer.material === "not_documented") ||
        (actionLayer.technique !== "medial" && actionLayer.technique !== "lateral")
      ) return null;
      const lateral = actionLayer.technique === "lateral";
      return {
        findingAsset: assets.centralPerforation,
        procedureAsset: lateral ? assets.lateralGraft : assets.medialGraft,
        findingAnchor: { x: 0.61, y: 0.53 },
        procedureAnchor: lateral ? { x: 0.48, y: 0.55 } : { x: 0.59, y: 0.43 },
        overlayKind: "graft",
        coverage: "procedure_specific",
        coverageNote: "The repair source is selected from the documented medial or lateral graft technique.",
        actionLayer,
        findingKinds: ["tm_state", "tm_perforation"],
      };
    }
    case "ossiculoplasty": {
      const actionLayer = documentedAction(activeLayers, "ossicular_reconstruction");
      if (!actionLayer || (actionLayer.method !== "porp" && actionLayer.method !== "torp")) {
        return null;
      }
      const torp = actionLayer.method === "torp";
      return {
        findingAsset: torp ? assets.footplateOnly : assets.absentIncus,
        procedureAsset: torp ? assets.torp : assets.porp,
        findingAnchor: torp ? { x: 0.61, y: 0.51 } : { x: 0.47, y: 0.43 },
        procedureAnchor: torp ? { x: 0.49, y: 0.41 } : { x: 0.48, y: 0.43 },
        overlayKind: "prosthesis",
        coverage: "procedure_specific",
        coverageNote: "The source changes between PORP and TORP when that method is documented.",
        actionLayer,
        findingKinds: ["ossicle_state"],
      };
    }
    case "tympanomastoidectomy": {
      const actionLayer = documentedAction(activeLayers, "mastoid_technique");
      if (
        !actionLayer ||
        (actionLayer.technique !== "canal_wall_up" && actionLayer.technique !== "canal_wall_down")
      ) return null;
      const canalWallDown = actionLayer.technique === "canal_wall_down";
      return {
        findingAsset: assets.cholesteatoma,
        procedureAsset: canalWallDown ? assets.canalWallDown : assets.mastoidectomy,
        findingAnchor: { x: 0.54, y: 0.47 },
        procedureAnchor: canalWallDown ? { x: 0.47, y: 0.58 } : { x: 0.5, y: 0.56 },
        overlayKind: "mastoid",
        coverage: "procedure_specific",
        coverageNote: "The repair source distinguishes canal-wall-down reconstruction from a completed mastoidectomy reference.",
        actionLayer,
        findingKinds: ["cholesteatoma_extent"],
      };
    }
    case "stapes_surgery": {
      const actionLayer = documentedAction(activeLayers, "stapes_procedure");
      if (
        !actionLayer ||
        (actionLayer.technique !== "stapedotomy" && actionLayer.technique !== "stapedectomy") ||
        (actionLayer.pistonAttachment !== "incus_long_process" && actionLayer.pistonAttachment !== "malleus")
      ) return null;
      return {
        findingAsset: assets.stapesOverview,
        procedureAsset: assets.stapesPiston,
        findingAnchor: { x: 0.54, y: 0.52 },
        procedureAnchor: { x: 0.4, y: 0.59 },
        overlayKind: "piston",
        coverage: "procedure_specific",
        coverageNote: "The procedure source depicts the piston and fenestra; sizing and angle remain generic.",
        actionLayer,
        findingKinds: ["ossicle_state"],
      };
    }
    case "cochlear_implant": {
      const actionLayer = documentedAction(activeLayers, "cochlear_insertion");
      const completionMatchesMode =
        mode === "preoperative_education"
          ? actionLayer?.completion === "not_documented"
          : actionLayer?.completion === "full";
      if (!actionLayer || actionLayer.route === "not_documented" || !completionMatchesMode) return null;
      return {
        findingAsset: assets.cochleaAnatomy,
        procedureAsset: assets.cochlearInsertion,
        findingAnchor: { x: 0.67, y: 0.52 },
        procedureAnchor: { x: 0.62, y: 0.55 },
        overlayKind: "electrode",
        coverage: "procedure_specific",
        coverageNote: "The source depicts electrode insertion; receiver placement and final array extent are not patient-specific.",
        actionLayer,
        findingKinds: [],
      };
    }
    case "bone_conduction_implant": {
      const actionLayer = documentedAction(activeLayers, "bone_conduction_implant");
      if (
        !actionLayer ||
        actionLayer.coupling === "not_documented" ||
        actionLayer.stage === "not_documented"
      ) return null;
      return {
        findingAsset: assets.earAnatomy,
        procedureAsset: assets.postauricularSubstrate,
        findingAnchor: { x: 0.55, y: 0.5 },
        procedureAnchor: { x: 0.27, y: 0.53 },
        overlayKind: "bone_implant",
        coverage: "generic_substrate",
        coverageNote: "Stanford has no bone-conduction implant source in the indexed atlas. The background is a generic postauricular surgical substrate and the implant is entirely a deterministic overlay.",
        actionLayer,
        findingKinds: [],
      };
    }
    case "canalplasty": {
      const actionLayer = documentedAction(activeLayers, "canalplasty");
      const resultMatchesMode =
        mode === "preoperative_education"
          ? actionLayer?.result === "not_documented"
          : actionLayer?.result === "widened";
      if (!actionLayer || actionLayer.region === "not_documented" || !resultMatchesMode) return null;
      return {
        findingAsset: assets.canalNarrowing,
        procedureAsset: assets.canalplasty,
        findingAnchor: { x: 0.5, y: 0.49 },
        procedureAnchor: { x: 0.49, y: 0.44 },
        overlayKind: "canal",
        coverage: "procedure_specific",
        coverageNote: "The paired sources show obstructive exostoses and the canalplasty extent.",
        actionLayer,
        findingKinds: [],
      };
    }
    case "eustachian_tube_dilation": {
      const actionLayer = documentedAction(activeLayers, "eustachian_tube_dilation");
      const resultMatchesMode =
        mode === "preoperative_education"
          ? actionLayer?.result === "not_documented"
          : actionLayer?.result === "completed";
      if (!actionLayer || !resultMatchesMode) return null;
      return {
        findingAsset: assets.eustachianAnatomy,
        procedureAsset: assets.eustachianBalloon,
        findingAnchor: { x: 0.52, y: 0.47 },
        procedureAnchor: { x: 0.57, y: 0.35 },
        overlayKind: "balloon",
        coverage: "procedure_specific",
        coverageNote: "The paired sources show Eustachian-tube anatomy and balloon placement.",
        actionLayer,
        findingKinds: [],
      };
    }
  }
}

function humanize(value: string) {
  if (value === "porp") return "PORP";
  if (value === "torp") return "TORP";
  if (value === "csf_leak") return "CSF leak";
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function layerLabel(layer: SurgeryLayer) {
  switch (layer.kind) {
    case "tm_state":
      return `Eardrum: ${humanize(layer.state)}`;
    case "tm_perforation":
      return `Eardrum perforation: ${humanize(layer.region)}`;
    case "tm_graft":
      return `Graft: ${humanize(layer.material)}${layer.technique === "not_documented" ? "" : ` · ${humanize(layer.technique)}`}`;
    case "ossicle_state":
      return `${humanize(layer.structure)}: ${humanize(layer.state)}`;
    case "ossicular_reconstruction":
      return `Reconstruction: ${humanize(layer.method)}`;
    case "tympanostomy":
      return `Ear tube: ${humanize(layer.action)}`;
    case "mastoid_technique":
      return `Mastoid approach: ${humanize(layer.technique)}`;
    case "cholesteatoma_extent":
      return layer.regions.length > 0
        ? `Cholesteatoma: ${layer.regions.map(humanize).join(", ")}`
        : "Cholesteatoma extent not documented";
    case "stapes_procedure":
      return `Stapes procedure: ${humanize(layer.technique)}`;
    case "cochlear_insertion":
      return `Electrode route: ${humanize(layer.route)}`;
    case "bone_conduction_implant":
      return `Bone-conduction implant: ${humanize(layer.coupling)}`;
    case "canalplasty":
      return `Canalplasty: ${humanize(layer.region)}`;
    case "eustachian_tube_dilation":
      return "Eustachian-tube balloon dilation";
    case "intraoperative_deviation":
    case "verification_status":
      return labelSurgeryLayerKind(layer.kind);
  }
}

function buildCallouts(
  plan: SurgeryPlan,
  phase: ProcedureAtlasPhase,
  source: FamilySource,
) {
  const layers = phase === "finding"
    ? getActiveSurgeryLayers(plan).filter(
        (layer) =>
          layer.documentation === "documented" &&
          layer.role === "finding" &&
          source.findingKinds.includes(layer.kind),
      )
    : [source.actionLayer];
  const anchor = phase === "finding" ? source.findingAnchor : source.procedureAnchor;

  if (layers.length === 0) {
    return [
      {
        id: `${phase}-context`,
        label: phase === "finding" ? "Generic anatomy reference" : "Plan details not documented",
        detail:
          phase === "finding"
            ? "No finding is inferred from this background image."
            : "The surgeon must confirm the planned action before patient use.",
        overlayKind: phase === "finding" ? "finding" : source.overlayKind,
      },
    ] satisfies ProcedureAtlasCallout[];
  }

  return layers.map((layer, index) => ({
    id: layer.id,
    featureId: layer.id,
    label: layerLabel(layer),
    detail:
      phase === "finding"
        ? "Structured anatomy detail; the source image remains generic."
        : "Structured planned step; size, position, and final choice may change during surgery.",
    anchor: index === 0 ? anchor : undefined,
    overlayKind: phase === "finding" ? "finding" : source.overlayKind,
  }));
}

export function selectProcedureAtlas(
  plan: SurgeryPlan,
  mode: EducationMode = "postoperative_summary",
): ProcedureAtlasSelection | null {
  if (plan.procedureFamilies === "not_documented" || plan.procedureFamilies.length === 0) {
    return null;
  }
  if (plan.procedureFamilies.length !== 1) return null;
  const family = plan.procedureFamilies[0];
  const source = familySource(family, plan, mode);
  if (!source) return null;
  const procedureLabel = labelSurgeryProcedure(family);
  const lateralityLabel =
    plan.laterality === "left" || plan.laterality === "right" || plan.laterality === "bilateral"
      ? `${plan.laterality.toUpperCase()} EAR · GENERIC REFERENCE (NOT LATERALIZED)`
      : "GENERIC REFERENCE · NOT LATERALIZED";
  const findingCallouts = buildCallouts(plan, "finding", source);
  const procedureCallouts = buildCallouts(plan, "procedure", source);

  return {
    family,
    procedureLabel,
    lateralityLabel,
    coverage: source.coverage,
    coverageNote: source.coverageNote,
    review: {
      status: "needs_clinician_signoff",
      statusLabel: "The source pairing and deterministic overlay require template-level otologist sign-off before patient use.",
    },
    panels: {
      finding: {
        phase: "finding",
        asset: source.findingAsset,
        imageUrl: atlasAssetImageUrl(source.findingAsset),
        title: "Anatomy being discussed",
        subtitle: "Generic source reference—not a patient-specific image",
        callouts: findingCallouts,
      },
      procedure: {
        phase: "procedure",
        asset: source.procedureAsset,
        imageUrl: atlasAssetImageUrl(source.procedureAsset),
        title: "Planned procedure",
        subtitle: "Deterministic additions from the structured plan",
        callouts: procedureCallouts,
      },
    },
  };
}

import { z } from "zod";
import {
  coveringGraftGeometry,
  templatePerforationGeometry,
} from "@/domain/tmGeometry";
import { EvidenceSchema, type OperativeCase, type WithEvidenceValue } from "./schema";

export const surgeryProcedureFamilyValues = [
  "myringotomy_tympanostomy",
  "tympanoplasty",
  "ossiculoplasty",
  "tympanomastoidectomy",
  "stapes_surgery",
  "cochlear_implant",
  "bone_conduction_implant",
  "canalplasty",
  "eustachian_tube_dilation",
] as const;

export const surgeryBaseViewValues = [
  "otoscopic_tm",
  "transcanal_middle_ear",
  "mastoid_middle_ear",
  "cochlea_implant_path",
  "postauricular_implant",
  "external_auditory_canal",
  "eustachian_tube",
] as const;

export const surgeryLayerKindValues = [
  "tm_state",
  "tm_perforation",
  "tm_graft",
  "ossicle_state",
  "ossicular_reconstruction",
  "tympanostomy",
  "mastoid_technique",
  "cholesteatoma_extent",
  "stapes_procedure",
  "cochlear_insertion",
  "bone_conduction_implant",
  "canalplasty",
  "eustachian_tube_dilation",
  "intraoperative_deviation",
  "verification_status",
] as const;

export const SurgeryProcedureFamilySchema = z.enum(surgeryProcedureFamilyValues);
export const SurgeryBaseViewSchema = z.enum(surgeryBaseViewValues);
export const SurgeryLayerKindSchema = z.enum(surgeryLayerKindValues);

const SurgeryLateralitySchema = z.enum(["left", "right", "bilateral", "not_documented"]);
const DocumentationSchema = z.enum(["documented", "not_documented"]);
const LayerEntryMethodSchema = z.enum(["extraction", "clinician"]);

const PointSchema = z.object({
  x: z.number().finite().min(0).max(1),
  y: z.number().finite().min(0).max(1),
});

export const SurgeryPolygonSchema = z.object({
  basis: z.enum(["generic_template", "clinician_authored"]),
  points: z.array(PointSchema).min(3),
});

const layerCommonShape = {
  id: z.string().min(1).max(120),
  side: SurgeryLateralitySchema.default("not_documented"),
  documentation: DocumentationSchema,
  evidence: z.array(EvidenceSchema).default([]),
  enteredBy: LayerEntryMethodSchema.default("extraction"),
  note: z.string().max(500).optional(),
};

const TympanicMembraneStateLayerSchema = z.object({
  ...layerCommonShape,
  kind: z.literal("tm_state"),
  role: z.literal("finding"),
  state: z.enum(["intact", "retraction", "not_documented"]),
});

const TympanicMembranePerforationLayerSchema = z.object({
  ...layerCommonShape,
  kind: z.literal("tm_perforation"),
  role: z.literal("finding"),
  region: z.enum(["anterior", "posterior", "central", "subtotal", "not_documented"]),
  geometry: SurgeryPolygonSchema.optional(),
});

const TympanicMembraneGraftLayerSchema = z.object({
  ...layerCommonShape,
  kind: z.literal("tm_graft"),
  role: z.literal("action"),
  material: z.enum([
    "temporalis_fascia",
    "cartilage",
    "perichondrium",
    "fat",
    "other",
    "none",
    "not_documented",
  ]),
  technique: z.enum(["medial", "lateral", "butterfly", "not_documented"]),
  purpose: z.enum(["tympanic_membrane_repair", "prosthesis_protection", "not_documented"]),
  targetLayerId: z.string().min(1).max(120).optional(),
  geometry: SurgeryPolygonSchema.optional(),
});

const OssicleStateLayerSchema = z.object({
  ...layerCommonShape,
  kind: z.literal("ossicle_state"),
  role: z.literal("finding"),
  structure: z.enum([
    "malleus",
    "incus",
    "incudostapedial_joint",
    "stapes_superstructure",
    "stapes_footplate",
  ]),
  state: z.enum([
    "intact",
    "eroded",
    "long_process_eroded",
    "body_eroded",
    "absent",
    "discontinuous",
    "reconstructed",
    "fixed",
    "mobile",
    "not_documented",
  ]),
});

export const ossicularEndpointValues = [
  "tympanic_membrane",
  "malleus",
  "incus_long_process",
  "incus_body",
  "incudostapedial_joint",
  "stapes_capitulum",
  "stapes_superstructure",
  "stapes_footplate",
  "not_documented",
] as const;

const OssicularEndpointSchema = z.enum(ossicularEndpointValues);

const OssicularReconstructionLayerSchema = z.object({
  ...layerCommonShape,
  kind: z.literal("ossicular_reconstruction"),
  role: z.literal("action"),
  method: z.enum([
    "bone_cement_bridge",
    "porp",
    "torp",
    "cartilage_interposition",
    "autologous_incus",
    "none",
    "not_documented",
  ]),
  material: z.enum([
    "otomimix",
    "hydroxyapatite_bone_cement",
    "titanium",
    "cartilage",
    "autologous_bone",
    "other",
    "not_applicable",
    "not_documented",
  ]),
  lateralEndpoint: OssicularEndpointSchema,
  medialEndpoint: OssicularEndpointSchema,
});

const TympanostomyLayerSchema = z.object({
  ...layerCommonShape,
  kind: z.literal("tympanostomy"),
  role: z.literal("action"),
  action: z.enum(["myringotomy_only", "tube_placed", "tube_not_placed", "not_documented"]),
  quadrant: z.enum([
    "anteroinferior",
    "inferior",
    "posteroinferior",
    "posterosuperior",
    "not_documented",
  ]),
  tubeType: z.enum(["short_term", "t_tube", "other", "none", "not_documented"]),
});

const MastoidTechniqueLayerSchema = z.object({
  ...layerCommonShape,
  kind: z.literal("mastoid_technique"),
  role: z.literal("action"),
  technique: z.enum([
    "canal_wall_up",
    "canal_wall_down",
    "canal_wall_reconstruction",
    "mastoid_obliteration",
    "subtotal_petrosectomy",
    "not_documented",
  ]),
});

const CholesteatomaExtentLayerSchema = z.object({
  ...layerCommonShape,
  kind: z.literal("cholesteatoma_extent"),
  role: z.literal("finding"),
  regions: z
    .array(
      z.enum([
        "epitympanum",
        "mesotympanum",
        "hypotympanum",
        "facial_recess",
        "sinus_tympani",
        "mastoid",
        "external_auditory_canal",
      ]),
    )
    .default([]),
});

const StapesProcedureLayerSchema = z.object({
  ...layerCommonShape,
  kind: z.literal("stapes_procedure"),
  role: z.literal("action"),
  technique: z.enum(["stapedotomy", "stapedectomy", "exploration_only", "not_documented"]),
  fenestra: z.enum(["small", "large", "not_documented"]),
  pistonAttachment: z.enum(["incus_long_process", "malleus", "none", "not_documented"]),
});

const CochlearInsertionLayerSchema = z.object({
  ...layerCommonShape,
  kind: z.literal("cochlear_insertion"),
  role: z.literal("action"),
  route: z.enum([
    "round_window",
    "extended_round_window",
    "cochleostomy",
    "mid_turn_cochleostomy",
    "not_documented",
  ]),
  completion: z.enum(["full", "partial", "aborted", "not_documented"]),
  array: z.enum(["standard", "split", "not_documented"]),
});

const BoneConductionImplantLayerSchema = z.object({
  ...layerCommonShape,
  kind: z.literal("bone_conduction_implant"),
  role: z.literal("action"),
  coupling: z.enum([
    "percutaneous",
    "passive_transcutaneous",
    "active_transcutaneous",
    "not_documented",
  ]),
  stage: z.enum(["one_stage", "two_stage_first", "two_stage_second", "not_documented"]),
});

const CanalplastyLayerSchema = z.object({
  ...layerCommonShape,
  kind: z.literal("canalplasty"),
  role: z.literal("action"),
  region: z.enum(["anterior", "posterior", "circumferential", "multiple", "not_documented"]),
  result: z.enum(["widened", "partial", "aborted", "not_documented"]),
});

const EustachianTubeDilationLayerSchema = z.object({
  ...layerCommonShape,
  kind: z.literal("eustachian_tube_dilation"),
  role: z.literal("action"),
  result: z.enum(["completed", "partial", "aborted", "not_documented"]),
});

const IntraoperativeDeviationLayerSchema = z.object({
  ...layerCommonShape,
  kind: z.literal("intraoperative_deviation"),
  role: z.literal("deviation"),
  deviation: z.enum([
    "unexpected_anatomy",
    "procedure_changed",
    "staged",
    "aborted",
    "csf_leak",
    "perilymph_leak",
    "facial_nerve_exposure",
    "lateral_canal_fistula",
    "thin_bone",
    "other_documented",
    "not_documented",
  ]),
  management: z.string().max(500).optional(),
  affectedLayerIds: z.array(z.string().min(1).max(120)).default([]),
  supersedingLayerId: z.string().min(1).max(120).optional(),
});

const VerificationStatusLayerSchema = z.object({
  ...layerCommonShape,
  kind: z.literal("verification_status"),
  role: z.literal("verification"),
  verification: z.enum([
    "ossicular_mobility",
    "tube_patency",
    "electrode_insertion",
    "telemetry",
    "leak_control",
    "facial_nerve_monitoring",
    "not_documented",
  ]),
  result: z.enum(["confirmed", "not_confirmed", "abnormal", "not_documented"]),
});

export const SurgeryLayerSchema = z.discriminatedUnion("kind", [
  TympanicMembraneStateLayerSchema,
  TympanicMembranePerforationLayerSchema,
  TympanicMembraneGraftLayerSchema,
  OssicleStateLayerSchema,
  OssicularReconstructionLayerSchema,
  TympanostomyLayerSchema,
  MastoidTechniqueLayerSchema,
  CholesteatomaExtentLayerSchema,
  StapesProcedureLayerSchema,
  CochlearInsertionLayerSchema,
  BoneConductionImplantLayerSchema,
  CanalplastyLayerSchema,
  EustachianTubeDilationLayerSchema,
  IntraoperativeDeviationLayerSchema,
  VerificationStatusLayerSchema,
]);

export const SurgeryPlanSchema = z.object({
  schemaVersion: z.literal("1.0"),
  sourceCaseId: z.string().optional(),
  laterality: SurgeryLateralitySchema,
  procedureFamilies: z.array(SurgeryProcedureFamilySchema).min(1).or(z.literal("not_documented")),
  revisionStatus: z.enum(["primary", "revision", "not_documented"]),
  baseViews: z.array(SurgeryBaseViewSchema).default([]),
  layers: z.array(SurgeryLayerSchema).default([]),
  sourceSafety: z
    .object({
      status: z.enum(["cleared", "blocked", "not_documented"]),
      reason: z.string().max(500).optional(),
    })
    .default({ status: "not_documented" }),
  review: z
    .object({
      status: z.enum(["draft_unreviewed", "requires_clinician_review", "approved_by_clinician"]),
      reviewerName: z.string().optional(),
      reviewedAtIso: z.string().datetime().optional(),
    })
    .default({ status: "draft_unreviewed" }),
});

export type SurgeryProcedureFamily = z.infer<typeof SurgeryProcedureFamilySchema>;
export type SurgeryBaseView = z.infer<typeof SurgeryBaseViewSchema>;
export type SurgeryLayer = z.infer<typeof SurgeryLayerSchema>;
export type SurgeryPlan = z.infer<typeof SurgeryPlanSchema>;

export interface ProcedureCatalogEntry {
  id: SurgeryProcedureFamily;
  label: string;
  defaultBaseViews: SurgeryBaseView[];
  supportedLayerKinds: SurgeryLayer["kind"][];
}

export const procedureCatalog: ProcedureCatalogEntry[] = [
  {
    id: "myringotomy_tympanostomy",
    label: "Myringotomy / ear tubes",
    defaultBaseViews: ["otoscopic_tm"],
    supportedLayerKinds: ["tm_state", "tm_perforation", "tympanostomy", "verification_status"],
  },
  {
    id: "tympanoplasty",
    label: "Tympanoplasty / myringoplasty",
    defaultBaseViews: ["otoscopic_tm"],
    supportedLayerKinds: [
      "tm_state",
      "tm_perforation",
      "tm_graft",
      "ossicle_state",
      "canalplasty",
      "verification_status",
    ],
  },
  {
    id: "ossiculoplasty",
    label: "Ossiculoplasty / middle-ear exploration",
    defaultBaseViews: ["transcanal_middle_ear"],
    supportedLayerKinds: [
      "tm_graft",
      "ossicle_state",
      "ossicular_reconstruction",
      "verification_status",
    ],
  },
  {
    id: "tympanomastoidectomy",
    label: "Cholesteatoma / tympanomastoidectomy",
    defaultBaseViews: ["mastoid_middle_ear"],
    supportedLayerKinds: [
      "tm_state",
      "tm_perforation",
      "tm_graft",
      "ossicle_state",
      "ossicular_reconstruction",
      "mastoid_technique",
      "cholesteatoma_extent",
      "intraoperative_deviation",
      "verification_status",
    ],
  },
  {
    id: "stapes_surgery",
    label: "Stapedotomy / stapedectomy",
    defaultBaseViews: ["transcanal_middle_ear"],
    supportedLayerKinds: [
      "ossicle_state",
      "stapes_procedure",
      "intraoperative_deviation",
      "verification_status",
    ],
  },
  {
    id: "cochlear_implant",
    label: "Cochlear implantation",
    defaultBaseViews: ["cochlea_implant_path"],
    supportedLayerKinds: [
      "cochlear_insertion",
      "mastoid_technique",
      "intraoperative_deviation",
      "verification_status",
    ],
  },
  {
    id: "bone_conduction_implant",
    label: "Bone-conduction hearing implant",
    defaultBaseViews: ["postauricular_implant"],
    supportedLayerKinds: [
      "bone_conduction_implant",
      "intraoperative_deviation",
      "verification_status",
    ],
  },
  {
    id: "canalplasty",
    label: "Canalplasty / exostosis removal",
    defaultBaseViews: ["external_auditory_canal"],
    supportedLayerKinds: ["tm_state", "tm_perforation", "canalplasty", "intraoperative_deviation"],
  },
  {
    id: "eustachian_tube_dilation",
    label: "Eustachian-tube dilation",
    defaultBaseViews: ["eustachian_tube"],
    supportedLayerKinds: ["eustachian_tube_dilation", "tympanostomy", "intraoperative_deviation"],
  },
];

export interface SurgeryLayerCatalogEntry {
  kind: SurgeryLayer["kind"];
  label: string;
  role: SurgeryLayer["role"];
}

export const layerCatalog: SurgeryLayerCatalogEntry[] = [
  { kind: "tm_state", label: "Eardrum state", role: "finding" },
  { kind: "tm_perforation", label: "Eardrum perforation", role: "finding" },
  { kind: "tm_graft", label: "Eardrum graft", role: "action" },
  { kind: "ossicle_state", label: "Middle-ear bone state", role: "finding" },
  { kind: "ossicular_reconstruction", label: "Hearing-bone reconstruction", role: "action" },
  { kind: "tympanostomy", label: "Myringotomy / ear tube", role: "action" },
  { kind: "mastoid_technique", label: "Mastoid technique", role: "action" },
  { kind: "cholesteatoma_extent", label: "Cholesteatoma extent", role: "finding" },
  { kind: "stapes_procedure", label: "Stapes procedure", role: "action" },
  { kind: "cochlear_insertion", label: "Cochlear implant insertion", role: "action" },
  { kind: "bone_conduction_implant", label: "Bone-conduction implant", role: "action" },
  { kind: "canalplasty", label: "Ear-canal repair", role: "action" },
  { kind: "eustachian_tube_dilation", label: "Eustachian-tube dilation", role: "action" },
  { kind: "intraoperative_deviation", label: "Change during surgery", role: "deviation" },
  { kind: "verification_status", label: "Surgical check", role: "verification" },
];

/**
 * Finite, reviewed anatomy views that can render each structured layer kind.
 * Deviation and verification layers are status annotations and may accompany any
 * existing anatomy view; they never cause an anatomy view to be inferred alone.
 */
export const approvedBaseViewsByLayerKind: Readonly<
  Record<SurgeryLayer["kind"], readonly SurgeryBaseView[]>
> = {
  tm_state: ["otoscopic_tm"],
  tm_perforation: ["otoscopic_tm"],
  tm_graft: ["otoscopic_tm", "transcanal_middle_ear"],
  ossicle_state: ["transcanal_middle_ear"],
  ossicular_reconstruction: ["transcanal_middle_ear"],
  tympanostomy: ["otoscopic_tm"],
  mastoid_technique: ["mastoid_middle_ear"],
  cholesteatoma_extent: ["mastoid_middle_ear"],
  stapes_procedure: ["transcanal_middle_ear"],
  cochlear_insertion: ["cochlea_implant_path"],
  bone_conduction_implant: ["postauricular_implant"],
  canalplasty: ["external_auditory_canal"],
  eustachian_tube_dilation: ["eustachian_tube"],
  intraoperative_deviation: surgeryBaseViewValues,
  verification_status: surgeryBaseViewValues,
};

export function approvedBaseViewsForLayerKind(
  kind: SurgeryLayer["kind"],
): readonly SurgeryBaseView[] {
  return approvedBaseViewsByLayerKind[kind];
}

export function labelSurgeryProcedure(family: SurgeryProcedureFamily | "not_documented") {
  if (family === "not_documented") return "Not documented";
  return procedureCatalog.find((entry) => entry.id === family)?.label ?? family;
}

export function labelSurgeryLayerKind(kind: SurgeryLayer["kind"]) {
  return layerCatalog.find((entry) => entry.kind === kind)?.label ?? kind;
}

export type SurgeryPlanIssueLevel = "blocking" | "clinician_review";

export interface SurgeryPlanIssue {
  code: string;
  level: SurgeryPlanIssueLevel;
  message: string;
  layerIds: string[];
}

export interface SurgeryPlanValidation {
  issues: SurgeryPlanIssue[];
  canRender: boolean;
  requiresClinicianReview: boolean;
}

export interface NormalizedSurgeryPlanResult extends SurgeryPlanValidation {
  plan?: SurgeryPlan;
}

function issue(
  code: string,
  level: SurgeryPlanIssueLevel,
  message: string,
  layerIds: string[] = [],
): SurgeryPlanIssue {
  return { code, level, message, layerIds };
}

function validationResult(issues: SurgeryPlanIssue[]): SurgeryPlanValidation {
  return {
    issues,
    canRender: !issues.some((item) => item.level === "blocking"),
    requiresClinicianReview: issues.some((item) => item.level === "clinician_review"),
  };
}

function sidesOverlap(a: SurgeryLayer["side"], b: SurgeryLayer["side"]) {
  if (a === "not_documented" || b === "not_documented") return false;
  return a === b || a === "bilateral" || b === "bilateral";
}

function relationshipSideStatus(
  a: SurgeryLayer["side"],
  b: SurgeryLayer["side"],
): "same" | "different" | "not_documented" {
  if (a === "not_documented" || b === "not_documented") return "not_documented";
  return a === b ? "same" : "different";
}

function pointOnSegment(
  point: z.infer<typeof PointSchema>,
  start: z.infer<typeof PointSchema>,
  end: z.infer<typeof PointSchema>,
) {
  const cross = (point.y - start.y) * (end.x - start.x) - (point.x - start.x) * (end.y - start.y);
  if (Math.abs(cross) > 1e-9) return false;
  const dot = (point.x - start.x) * (end.x - start.x) + (point.y - start.y) * (end.y - start.y);
  if (dot < 0) return false;
  const squaredLength = (end.x - start.x) ** 2 + (end.y - start.y) ** 2;
  return dot <= squaredLength;
}

function pointInPolygon(
  point: z.infer<typeof PointSchema>,
  polygon: z.infer<typeof SurgeryPolygonSchema>,
) {
  let inside = false;
  for (
    let index = 0, previous = polygon.points.length - 1;
    index < polygon.points.length;
    previous = index++
  ) {
    const currentPoint = polygon.points[index];
    const previousPoint = polygon.points[previous];
    if (pointOnSegment(point, previousPoint, currentPoint)) return true;
    const crosses =
      currentPoint.y > point.y !== previousPoint.y > point.y &&
      point.x <
        ((previousPoint.x - currentPoint.x) * (point.y - currentPoint.y)) /
          (previousPoint.y - currentPoint.y) +
          currentPoint.x;
    if (crosses) inside = !inside;
  }
  return inside;
}

const polygonMarginEpsilon = 1e-7;

function distanceToSegment(
  point: z.infer<typeof PointSchema>,
  start: z.infer<typeof PointSchema>,
  end: z.infer<typeof PointSchema>,
) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const squaredLength = dx * dx + dy * dy;
  if (squaredLength === 0) return Math.hypot(point.x - start.x, point.y - start.y);
  const projection = Math.max(
    0,
    Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / squaredLength),
  );
  return Math.hypot(point.x - (start.x + projection * dx), point.y - (start.y + projection * dy));
}

function orientation(
  a: z.infer<typeof PointSchema>,
  b: z.infer<typeof PointSchema>,
  c: z.infer<typeof PointSchema>,
) {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

function segmentsIntersectOrTouch(
  aStart: z.infer<typeof PointSchema>,
  aEnd: z.infer<typeof PointSchema>,
  bStart: z.infer<typeof PointSchema>,
  bEnd: z.infer<typeof PointSchema>,
) {
  const o1 = orientation(aStart, aEnd, bStart);
  const o2 = orientation(aStart, aEnd, bEnd);
  const o3 = orientation(bStart, bEnd, aStart);
  const o4 = orientation(bStart, bEnd, aEnd);
  if (
    ((o1 > polygonMarginEpsilon && o2 < -polygonMarginEpsilon) ||
      (o1 < -polygonMarginEpsilon && o2 > polygonMarginEpsilon)) &&
    ((o3 > polygonMarginEpsilon && o4 < -polygonMarginEpsilon) ||
      (o3 < -polygonMarginEpsilon && o4 > polygonMarginEpsilon))
  ) {
    return true;
  }
  return (
    (Math.abs(o1) <= polygonMarginEpsilon && pointOnSegment(bStart, aStart, aEnd)) ||
    (Math.abs(o2) <= polygonMarginEpsilon && pointOnSegment(bEnd, aStart, aEnd)) ||
    (Math.abs(o3) <= polygonMarginEpsilon && pointOnSegment(aStart, bStart, bEnd)) ||
    (Math.abs(o4) <= polygonMarginEpsilon && pointOnSegment(aEnd, bStart, bEnd))
  );
}

function isSimplePositiveAreaPolygon(polygon: z.infer<typeof SurgeryPolygonSchema>) {
  const area = Math.abs(
    polygon.points.reduce((sum, point, index) => {
      const next = polygon.points[(index + 1) % polygon.points.length];
      return sum + point.x * next.y - next.x * point.y;
    }, 0) / 2,
  );
  if (area <= polygonMarginEpsilon) return false;

  for (let index = 0; index < polygon.points.length; index += 1) {
    const nextIndex = (index + 1) % polygon.points.length;
    if (
      Math.hypot(
        polygon.points[index].x - polygon.points[nextIndex].x,
        polygon.points[index].y - polygon.points[nextIndex].y,
      ) <= polygonMarginEpsilon
    ) {
      return false;
    }
    for (let otherIndex = index + 1; otherIndex < polygon.points.length; otherIndex += 1) {
      const otherNextIndex = (otherIndex + 1) % polygon.points.length;
      const sharesVertex =
        index === otherIndex || nextIndex === otherIndex || otherNextIndex === index;
      if (sharesVertex) continue;
      if (
        segmentsIntersectOrTouch(
          polygon.points[index],
          polygon.points[nextIndex],
          polygon.points[otherIndex],
          polygon.points[otherNextIndex],
        )
      ) {
        return false;
      }
    }
  }
  return true;
}

function polygonStrictlyContainsPolygon(
  outer: z.infer<typeof SurgeryPolygonSchema>,
  inner: z.infer<typeof SurgeryPolygonSchema>,
) {
  for (const point of inner.points) {
    if (!pointInPolygon(point, outer)) return false;
    for (let index = 0; index < outer.points.length; index += 1) {
      const next = outer.points[(index + 1) % outer.points.length];
      if (distanceToSegment(point, outer.points[index], next) <= polygonMarginEpsilon) {
        return false;
      }
    }
  }
  for (let innerIndex = 0; innerIndex < inner.points.length; innerIndex += 1) {
    const innerNext = inner.points[(innerIndex + 1) % inner.points.length];
    for (let outerIndex = 0; outerIndex < outer.points.length; outerIndex += 1) {
      const outerNext = outer.points[(outerIndex + 1) % outer.points.length];
      if (
        segmentsIntersectOrTouch(
          inner.points[innerIndex],
          innerNext,
          outer.points[outerIndex],
          outerNext,
        )
      ) {
        return false;
      }
    }
  }
  return true;
}

function pushUniqueIssue(issues: SurgeryPlanIssue[], next: SurgeryPlanIssue) {
  const key = `${next.code}:${[...next.layerIds].sort().join(",")}:${next.message}`;
  if (
    !issues.some(
      (existing) =>
        `${existing.code}:${[...existing.layerIds].sort().join(",")}:${existing.message}` === key,
    )
  ) {
    issues.push(next);
  }
}

/**
 * Returns the layers that describe the final operative state. A documented
 * aborted action, or an action with a valid documented superseding action, is
 * retained in the plan history but omitted from final-state conflict checks.
 */
export function getActiveSurgeryLayers(plan: Pick<SurgeryPlan, "layers">): SurgeryLayer[] {
  const layersById = new Map(plan.layers.map((layer) => [layer.id, layer]));
  const inactiveLayerIds = new Set<string>();

  for (const deviation of plan.layers) {
    if (deviation.kind !== "intraoperative_deviation" || deviation.documentation !== "documented") {
      continue;
    }
    const affected = [...new Set(deviation.affectedLayerIds)]
      .map((id) => layersById.get(id))
      .filter(
        (layer): layer is SurgeryLayer =>
          Boolean(layer) &&
          layer?.role === "action" &&
          layer.documentation === "documented" &&
          relationshipSideStatus(deviation.side, layer.side) === "same",
      );
    const superseding = deviation.supersedingLayerId
      ? layersById.get(deviation.supersedingLayerId)
      : undefined;
    const hasValidSupersedingAction =
      superseding?.role === "action" &&
      superseding.documentation === "documented" &&
      !deviation.affectedLayerIds.includes(superseding.id) &&
      relationshipSideStatus(deviation.side, superseding.side) === "same";

    if (deviation.deviation === "aborted" || hasValidSupersedingAction) {
      for (const layer of affected) inactiveLayerIds.add(layer.id);
    }
  }

  return plan.layers.filter((layer) => !inactiveLayerIds.has(layer.id));
}

function validateGrafts(plan: SurgeryPlan, issues: SurgeryPlanIssue[]) {
  const activeLayers = getActiveSurgeryLayers(plan);
  const activeLayerIds = new Set(activeLayers.map((layer) => layer.id));
  const layersById = new Map(plan.layers.map((layer) => [layer.id, layer]));
  const grafts = activeLayers.filter(
    (layer): layer is Extract<SurgeryLayer, { kind: "tm_graft" }> =>
      layer.kind === "tm_graft" && layer.documentation === "documented",
  );

  for (const graft of grafts) {
    if (graft.material === "none") {
      if (
        graft.purpose !== "not_documented" ||
        graft.targetLayerId !== undefined ||
        graft.geometry !== undefined
      ) {
        pushUniqueIssue(
          issues,
          issue(
            "graft_absent_with_repair_details",
            "blocking",
            "A documented no-graft state cannot also claim a graft purpose, target, or geometry.",
            [graft.id, ...(graft.targetLayerId ? [graft.targetLayerId] : [])],
          ),
        );
      }
      continue;
    }
    if (graft.material === "not_documented") {
      pushUniqueIssue(
        issues,
        issue(
          "graft_material_not_documented",
          "clinician_review",
          "The graft material is not documented.",
          [graft.id],
        ),
      );
    }
    if (graft.purpose === "not_documented") {
      pushUniqueIssue(
        issues,
        issue(
          "graft_purpose_not_documented",
          "clinician_review",
          "The graft purpose is not documented, so a repair relationship cannot be drawn.",
          [graft.id],
        ),
      );
    }

    if (!graft.targetLayerId) {
      pushUniqueIssue(
        issues,
        issue(
          "graft_target_missing",
          "blocking",
          "A documented graft must explicitly reference the defect or reconstruction it addresses.",
          [graft.id],
        ),
      );
      continue;
    }

    const target = layersById.get(graft.targetLayerId);
    if (!target) {
      pushUniqueIssue(
        issues,
        issue(
          "graft_target_missing",
          "blocking",
          "The graft references a layer that does not exist.",
          [graft.id, graft.targetLayerId],
        ),
      );
      continue;
    }
    if (!activeLayerIds.has(target.id)) {
      pushUniqueIssue(
        issues,
        issue(
          "graft_target_inactive",
          "blocking",
          "The graft cannot target an action that was replaced or aborted.",
          [graft.id, target.id],
        ),
      );
      continue;
    }
    if (target.documentation !== "documented") {
      pushUniqueIssue(
        issues,
        issue(
          "graft_target_not_documented",
          "blocking",
          "The graft target must be a documented layer.",
          [graft.id, target.id],
        ),
      );
      continue;
    }

    const sideStatus = relationshipSideStatus(graft.side, target.side);
    if (sideStatus === "different") {
      pushUniqueIssue(
        issues,
        issue(
          "graft_target_side_mismatch",
          "blocking",
          "The graft and its target must be documented on the same side.",
          [graft.id, target.id],
        ),
      );
    } else if (sideStatus === "not_documented") {
      pushUniqueIssue(
        issues,
        issue(
          "graft_target_side_not_documented",
          "clinician_review",
          "The graft-target relationship needs documented laterality before it can be verified.",
          [graft.id, target.id],
        ),
      );
    }

    if (graft.purpose === "tympanic_membrane_repair") {
      if (target.kind !== "tm_perforation") {
        pushUniqueIssue(
          issues,
          issue(
            "graft_target_kind_mismatch",
            "blocking",
            "A tympanic-membrane repair graft must target a documented perforation.",
            [graft.id, target.id],
          ),
        );
        continue;
      }
      if (!graft.geometry || !target.geometry) {
        pushUniqueIssue(
          issues,
          issue(
            "graft_coverage_not_verifiable",
            "clinician_review",
            "Graft and perforation geometry are required to verify that the graft covers the defect.",
            [graft.id, target.id],
          ),
        );
        continue;
      }
      if (
        !isSimplePositiveAreaPolygon(graft.geometry) ||
        !isSimplePositiveAreaPolygon(target.geometry)
      ) {
        pushUniqueIssue(
          issues,
          issue(
            "graft_geometry_invalid",
            "blocking",
            "Graft coverage requires simple, nonzero-area graft and perforation polygons.",
            [graft.id, target.id],
          ),
        );
        continue;
      }
      if (!polygonStrictlyContainsPolygon(graft.geometry, target.geometry)) {
        pushUniqueIssue(
          issues,
          issue(
            "graft_does_not_cover_perforation",
            "blocking",
            "The graft must extend beyond every perforation edge with a positive overlap margin.",
            [graft.id, target.id],
          ),
        );
      }
    } else if (graft.purpose === "prosthesis_protection") {
      if (target.kind !== "ossicular_reconstruction") {
        pushUniqueIssue(
          issues,
          issue(
            "graft_target_kind_mismatch",
            "blocking",
            "A prosthesis-protection graft must target a documented ossicular reconstruction.",
            [graft.id, target.id],
          ),
        );
      } else if (target.method === "none") {
        pushUniqueIssue(
          issues,
          issue(
            "prosthesis_protection_without_reconstruction",
            "blocking",
            "A prosthesis-protection graft cannot target a documented no-reconstruction state.",
            [graft.id, target.id],
          ),
        );
      } else if (target.method === "not_documented") {
        pushUniqueIssue(
          issues,
          issue(
            "prosthesis_protection_target_not_documented",
            "clinician_review",
            "The targeted reconstruction method is not documented.",
            [graft.id, target.id],
          ),
        );
      }
    }
  }
}

function validateReconstructionEndpoints(plan: SurgeryPlan, issues: SurgeryPlanIssue[]) {
  const reconstructions = getActiveSurgeryLayers(plan).filter(
    (layer): layer is Extract<SurgeryLayer, { kind: "ossicular_reconstruction" }> =>
      layer.kind === "ossicular_reconstruction" && layer.documentation === "documented",
  );
  const validLateralEndpoints = new Set(["tympanic_membrane", "malleus"]);

  for (const reconstruction of reconstructions) {
    if (reconstruction.method === "none") {
      if (
        reconstruction.lateralEndpoint !== "not_documented" ||
        reconstruction.medialEndpoint !== "not_documented"
      ) {
        pushUniqueIssue(
          issues,
          issue(
            "no_reconstruction_with_endpoints",
            "blocking",
            "A documented no-reconstruction state cannot also connect anatomical endpoints.",
            [reconstruction.id],
          ),
        );
      }
      continue;
    }

    if (
      reconstruction.method !== "not_documented" &&
      (reconstruction.lateralEndpoint === "not_documented" ||
        reconstruction.medialEndpoint === "not_documented")
    ) {
      pushUniqueIssue(
        issues,
        issue(
          "reconstruction_endpoints_not_documented",
          "clinician_review",
          "The reconstruction endpoints are not fully documented, so exact placement cannot be drawn.",
          [reconstruction.id],
        ),
      );
      continue;
    }

    if (
      reconstruction.method === "porp" &&
      (!validLateralEndpoints.has(reconstruction.lateralEndpoint) ||
        !["stapes_capitulum", "stapes_superstructure"].includes(reconstruction.medialEndpoint))
    ) {
      pushUniqueIssue(
        issues,
        issue(
          "porp_invalid_endpoints",
          "blocking",
          "A PORP must connect the tympanic membrane or malleus to an intact stapes superstructure/capitulum.",
          [reconstruction.id],
        ),
      );
    }

    if (
      reconstruction.method === "torp" &&
      (!validLateralEndpoints.has(reconstruction.lateralEndpoint) ||
        reconstruction.medialEndpoint !== "stapes_footplate")
    ) {
      pushUniqueIssue(
        issues,
        issue(
          "torp_invalid_endpoints",
          "blocking",
          "A TORP must connect the tympanic membrane or malleus to the stapes footplate.",
          [reconstruction.id],
        ),
      );
    }

    if (
      reconstruction.method !== "not_documented" &&
      reconstruction.material === "not_documented"
    ) {
      pushUniqueIssue(
        issues,
        issue(
          "reconstruction_material_not_documented",
          "clinician_review",
          "The reconstruction material is not documented.",
          [reconstruction.id],
        ),
      );
    }
  }
}

function validatePairedConflicts(plan: SurgeryPlan, issues: SurgeryPlanIssue[]) {
  const documentedLayers = getActiveSurgeryLayers(plan).filter(
    (layer) => layer.documentation === "documented",
  );

  const mastoidLayers = documentedLayers.filter(
    (layer): layer is Extract<SurgeryLayer, { kind: "mastoid_technique" }> =>
      layer.kind === "mastoid_technique",
  );
  for (const canalWallUp of mastoidLayers.filter((layer) => layer.technique === "canal_wall_up")) {
    for (const canalWallDown of mastoidLayers.filter(
      (layer) =>
        layer.technique === "canal_wall_down" && sidesOverlap(layer.side, canalWallUp.side),
    )) {
      pushUniqueIssue(
        issues,
        issue(
          "mastoid_canal_wall_conflict",
          "blocking",
          "Canal-wall-up and canal-wall-down cannot both describe the same completed mastoid state.",
          [canalWallUp.id, canalWallDown.id],
        ),
      );
    }
  }

  const stapesLayers = documentedLayers.filter(
    (layer): layer is Extract<SurgeryLayer, { kind: "stapes_procedure" }> =>
      layer.kind === "stapes_procedure",
  );
  for (const stapedotomy of stapesLayers.filter((layer) => layer.technique === "stapedotomy")) {
    for (const stapedectomy of stapesLayers.filter(
      (layer) => layer.technique === "stapedectomy" && sidesOverlap(layer.side, stapedotomy.side),
    )) {
      pushUniqueIssue(
        issues,
        issue(
          "stapes_procedure_conflict",
          "blocking",
          "Stapedotomy and stapedectomy cannot both be the completed technique for the same ear.",
          [stapedotomy.id, stapedectomy.id],
        ),
      );
    }
  }

  const cochlearLayers = documentedLayers.filter(
    (layer): layer is Extract<SurgeryLayer, { kind: "cochlear_insertion" }> =>
      layer.kind === "cochlear_insertion" &&
      layer.route !== "not_documented" &&
      layer.completion !== "aborted",
  );
  for (let left = 0; left < cochlearLayers.length; left += 1) {
    for (let right = left + 1; right < cochlearLayers.length; right += 1) {
      const first = cochlearLayers[left];
      const second = cochlearLayers[right];
      if (first.route !== second.route && sidesOverlap(first.side, second.side)) {
        pushUniqueIssue(
          issues,
          issue(
            "cochlear_insertion_route_conflict",
            "blocking",
            "Multiple non-aborted cochlear insertion routes cannot describe one completed insertion.",
            [first.id, second.id],
          ),
        );
      }
    }
  }
  for (const layer of cochlearLayers) {
    if (layer.array === "split" && layer.route !== "mid_turn_cochleostomy") {
      pushUniqueIssue(
        issues,
        issue(
          "cochlear_split_array_route_conflict",
          "blocking",
          "A split-array reconstruction requires a documented basal and mid-turn cochleostomy pathway; a single round-window or basal route is not sufficient.",
          [layer.id],
        ),
      );
    }
  }

  const boneConductionLayers = documentedLayers.filter(
    (layer): layer is Extract<SurgeryLayer, { kind: "bone_conduction_implant" }> =>
      layer.kind === "bone_conduction_implant" && layer.coupling !== "not_documented",
  );
  for (let left = 0; left < boneConductionLayers.length; left += 1) {
    for (let right = left + 1; right < boneConductionLayers.length; right += 1) {
      const first = boneConductionLayers[left];
      const second = boneConductionLayers[right];
      if (first.coupling !== second.coupling && sidesOverlap(first.side, second.side)) {
        pushUniqueIssue(
          issues,
          issue(
            "bone_conduction_coupling_conflict",
            "blocking",
            "Percutaneous and transcutaneous coupling types cannot describe the same implant.",
            [first.id, second.id],
          ),
        );
      }
    }
  }

  const tubeLayers = documentedLayers.filter(
    (layer): layer is Extract<SurgeryLayer, { kind: "tympanostomy" }> =>
      layer.kind === "tympanostomy",
  );
  for (const placed of tubeLayers.filter((layer) => layer.action === "tube_placed")) {
    for (const notPlaced of tubeLayers.filter(
      (layer) => layer.action === "tube_not_placed" && sidesOverlap(layer.side, placed.side),
    )) {
      pushUniqueIssue(
        issues,
        issue(
          "tympanostomy_completion_conflict",
          "blocking",
          "A tube cannot be both placed and not placed in the same ear.",
          [placed.id, notPlaced.id],
        ),
      );
    }
  }
}

function validateAnatomyConflicts(plan: SurgeryPlan, issues: SurgeryPlanIssue[]) {
  const documentedLayers = getActiveSurgeryLayers(plan).filter(
    (layer) => layer.documentation === "documented",
  );
  const intactMembranes = documentedLayers.filter(
    (layer): layer is Extract<SurgeryLayer, { kind: "tm_state" }> =>
      layer.kind === "tm_state" && layer.state === "intact",
  );
  const perforations = documentedLayers.filter(
    (layer): layer is Extract<SurgeryLayer, { kind: "tm_perforation" }> =>
      layer.kind === "tm_perforation",
  );
  for (const intact of intactMembranes) {
    for (const perforation of perforations.filter((layer) =>
      sidesOverlap(layer.side, intact.side),
    )) {
      pushUniqueIssue(
        issues,
        issue(
          "tympanic_membrane_state_conflict",
          "blocking",
          "The tympanic membrane cannot be both intact and perforated in the same finding state.",
          [intact.id, perforation.id],
        ),
      );
    }
  }

  const ossicleLayers = documentedLayers.filter(
    (layer): layer is Extract<SurgeryLayer, { kind: "ossicle_state" }> =>
      layer.kind === "ossicle_state" && layer.state !== "not_documented",
  );
  const incompatiblePairs = [
    ["absent", "intact"],
    ["absent", "mobile"],
    ["absent", "fixed"],
    ["absent", "eroded"],
    ["absent", "long_process_eroded"],
    ["absent", "body_eroded"],
    ["fixed", "mobile"],
    ["intact", "eroded"],
    ["intact", "long_process_eroded"],
    ["intact", "body_eroded"],
    ["intact", "discontinuous"],
  ] as const;
  for (let left = 0; left < ossicleLayers.length; left += 1) {
    for (let right = left + 1; right < ossicleLayers.length; right += 1) {
      const first = ossicleLayers[left];
      const second = ossicleLayers[right];
      if (first.structure !== second.structure || !sidesOverlap(first.side, second.side)) continue;
      if (
        incompatiblePairs.some(
          ([a, b]) =>
            (first.state === a && second.state === b) || (first.state === b && second.state === a),
        )
      ) {
        pushUniqueIssue(
          issues,
          issue(
            "ossicle_state_conflict",
            "blocking",
            `Conflicting ${first.structure.replaceAll("_", " ")} states cannot be rendered together.`,
            [first.id, second.id],
          ),
        );
      }
    }
  }
}

function validateLayerLaterality(plan: SurgeryPlan, issues: SurgeryPlanIssue[]) {
  for (const layer of plan.layers.filter((item) => item.documentation === "documented")) {
    if (layer.side === "not_documented") {
      pushUniqueIssue(
        issues,
        issue(
          "layer_laterality_not_documented",
          "clinician_review",
          `Laterality is not documented for layer “${layer.id}”.`,
          [layer.id],
        ),
      );
      continue;
    }
    if (plan.laterality === "not_documented") {
      pushUniqueIssue(
        issues,
        issue(
          "layer_plan_laterality_not_documented",
          "clinician_review",
          `Plan laterality must be documented before the ${layer.side} layer “${layer.id}” can be lateralized.`,
          [layer.id],
        ),
      );
      continue;
    }
    if (plan.laterality !== "bilateral" && layer.side !== plan.laterality) {
      pushUniqueIssue(
        issues,
        issue(
          "layer_plan_side_mismatch",
          "blocking",
          `Layer “${layer.id}” is ${layer.side}, but the plan is ${plan.laterality}.`,
          [layer.id],
        ),
      );
    }
  }
}

function validateDeviationReferences(plan: SurgeryPlan, issues: SurgeryPlanIssue[]) {
  const layersById = new Map(plan.layers.map((layer) => [layer.id, layer]));
  const deviations = plan.layers.filter(
    (layer): layer is Extract<SurgeryLayer, { kind: "intraoperative_deviation" }> =>
      layer.kind === "intraoperative_deviation" && layer.documentation === "documented",
  );

  const validateActionReference = (
    deviation: Extract<SurgeryLayer, { kind: "intraoperative_deviation" }>,
    referenceId: string,
    referenceType: "affected" | "superseding",
  ) => {
    if (referenceId === deviation.id) {
      pushUniqueIssue(
        issues,
        issue(
          `deviation_${referenceType}_layer_self_reference`,
          "blocking",
          "An intraoperative change cannot reference itself as an affected or superseding action.",
          [deviation.id],
        ),
      );
      return;
    }
    const referenced = layersById.get(referenceId);
    if (!referenced) {
      pushUniqueIssue(
        issues,
        issue(
          `deviation_${referenceType}_layer_missing`,
          "blocking",
          `The ${referenceType} action referenced by the intraoperative change does not exist.`,
          [deviation.id, referenceId],
        ),
      );
      return;
    }
    if (referenced.role !== "action") {
      pushUniqueIssue(
        issues,
        issue(
          `deviation_${referenceType}_layer_invalid_role`,
          "blocking",
          `The ${referenceType} reference must point to a surgical action layer.`,
          [deviation.id, referenced.id],
        ),
      );
    }
    if (referenced.documentation !== "documented") {
      pushUniqueIssue(
        issues,
        issue(
          `deviation_${referenceType}_layer_not_documented`,
          "blocking",
          `The ${referenceType} action must be documented before it can be linked to an intraoperative change.`,
          [deviation.id, referenced.id],
        ),
      );
    }
    const sideStatus = relationshipSideStatus(deviation.side, referenced.side);
    if (sideStatus === "different") {
      pushUniqueIssue(
        issues,
        issue(
          `deviation_${referenceType}_layer_side_mismatch`,
          "blocking",
          `The intraoperative change and its ${referenceType} action must be on the same side.`,
          [deviation.id, referenced.id],
        ),
      );
    } else if (sideStatus === "not_documented") {
      pushUniqueIssue(
        issues,
        issue(
          `deviation_${referenceType}_layer_side_not_documented`,
          "clinician_review",
          `Laterality must be documented before the ${referenceType} action relationship can be applied.`,
          [deviation.id, referenced.id],
        ),
      );
    }
  };

  for (const deviation of deviations) {
    const uniqueAffectedIds = new Set(deviation.affectedLayerIds);
    if (uniqueAffectedIds.size !== deviation.affectedLayerIds.length) {
      pushUniqueIssue(
        issues,
        issue(
          "deviation_duplicate_affected_layer_reference",
          "blocking",
          "An affected action may be referenced only once by the same intraoperative change.",
          [deviation.id, ...deviation.affectedLayerIds],
        ),
      );
    }
    if (
      (deviation.deviation === "aborted" || deviation.deviation === "procedure_changed") &&
      uniqueAffectedIds.size === 0
    ) {
      pushUniqueIssue(
        issues,
        issue(
          "deviation_affected_layers_not_documented",
          "clinician_review",
          "The changed or aborted action is not linked, so it cannot be removed from final-state conflict checks.",
          [deviation.id],
        ),
      );
    }
    for (const affectedId of uniqueAffectedIds) {
      validateActionReference(deviation, affectedId, "affected");
    }

    if (deviation.supersedingLayerId) {
      if (uniqueAffectedIds.size === 0) {
        pushUniqueIssue(
          issues,
          issue(
            "deviation_superseding_without_affected_layer",
            "blocking",
            "A superseding action requires at least one affected action.",
            [deviation.id, deviation.supersedingLayerId],
          ),
        );
      }
      if (uniqueAffectedIds.has(deviation.supersedingLayerId)) {
        pushUniqueIssue(
          issues,
          issue(
            "deviation_superseding_layer_also_affected",
            "blocking",
            "The superseding action cannot also be listed as an affected action.",
            [deviation.id, deviation.supersedingLayerId],
          ),
        );
      }
      validateActionReference(deviation, deviation.supersedingLayerId, "superseding");
    } else if (deviation.deviation === "procedure_changed" && uniqueAffectedIds.size > 0) {
      pushUniqueIssue(
        issues,
        issue(
          "deviation_superseding_layer_not_documented",
          "clinician_review",
          "The replacement action is not documented, so the affected action remains active.",
          [deviation.id, ...uniqueAffectedIds],
        ),
      );
    }
  }
}

function validateLayerViewCompatibility(plan: SurgeryPlan, issues: SurgeryPlanIssue[]) {
  const configuredViews =
    plan.baseViews.length > 0 ? plan.baseViews : defaultViewsForFamilies(plan.procedureFamilies);
  for (const layer of getActiveSurgeryLayers(plan)) {
    if (
      layer.documentation !== "documented" ||
      layer.kind === "intraoperative_deviation" ||
      layer.kind === "verification_status"
    ) {
      continue;
    }
    const approvedViews = approvedBaseViewsForLayerKind(layer.kind);
    if (!configuredViews.some((view) => approvedViews.includes(view))) {
      pushUniqueIssue(
        issues,
        issue(
          "layer_view_incompatible",
          "blocking",
          `Layer “${layer.id}” has no compatible anatomy view in this plan.`,
          [layer.id],
        ),
      );
    }
  }
}

function validateParsedSurgeryPlan(plan: SurgeryPlan): SurgeryPlanValidation {
  const issues: SurgeryPlanIssue[] = [];
  const ids = new Map<string, number>();
  for (const layer of plan.layers) ids.set(layer.id, (ids.get(layer.id) ?? 0) + 1);
  for (const [id, count] of ids) {
    if (count > 1) {
      issues.push(
        issue("duplicate_layer_id", "blocking", `Layer id “${id}” is used more than once.`, [id]),
      );
    }
  }

  if (plan.sourceSafety.status === "blocked") {
    issues.push(
      issue(
        "source_safety_block",
        "blocking",
        plan.sourceSafety.reason ?? "The source case is not suitable for rendering.",
      ),
    );
  }
  if (plan.sourceSafety.status === "not_documented") {
    issues.push(
      issue(
        "source_safety_not_documented",
        "clinician_review",
        "Source safety status is not documented.",
      ),
    );
  }
  if (plan.procedureFamilies === "not_documented") {
    issues.push(
      issue(
        "procedure_not_documented",
        "clinician_review",
        "Procedure family is not documented; no procedure-specific anatomy should be inferred.",
      ),
    );
  }
  if (plan.laterality === "not_documented") {
    issues.push(
      issue(
        "laterality_not_documented",
        "clinician_review",
        "Laterality is not documented; the diagram must remain non-lateralized.",
      ),
    );
  }
  if (plan.review.status !== "approved_by_clinician") {
    issues.push(
      issue(
        "plan_not_clinician_approved",
        "clinician_review",
        "This composed plan requires clinician review before patient-facing export.",
      ),
    );
  }

  for (const layer of plan.layers) {
    if (
      layer.documentation === "documented" &&
      layer.enteredBy === "extraction" &&
      layer.evidence.length === 0
    ) {
      issues.push(
        issue(
          "layer_evidence_missing",
          "clinician_review",
          `Documented layer “${layer.id}” has no source evidence.`,
          [layer.id],
        ),
      );
    }
  }

  validateLayerLaterality(plan, issues);
  validateDeviationReferences(plan, issues);
  validateLayerViewCompatibility(plan, issues);
  validateGrafts(plan, issues);
  validateReconstructionEndpoints(plan, issues);
  validatePairedConflicts(plan, issues);
  validateAnatomyConflicts(plan, issues);
  return validationResult(issues);
}

export function validateSurgeryPlan(input: unknown): SurgeryPlanValidation {
  const parsed = SurgeryPlanSchema.safeParse(input);
  if (!parsed.success) {
    return validationResult(
      parsed.error.issues.map((schemaIssue) =>
        issue(
          "structural_schema_invalid",
          "blocking",
          `${schemaIssue.path.join(".") || "plan"}: ${schemaIssue.message}`,
        ),
      ),
    );
  }
  return validateParsedSurgeryPlan(parsed.data);
}

function semanticPlaceholderKey(layer: SurgeryLayer) {
  switch (layer.kind) {
    case "ossicle_state":
      return `${layer.kind}:${layer.side}:${layer.structure}`;
    case "tm_state":
    case "tm_perforation":
    case "tm_graft":
    case "ossicular_reconstruction":
    case "tympanostomy":
    case "stapes_procedure":
    case "cochlear_insertion":
    case "bone_conduction_implant":
    case "canalplasty":
    case "eustachian_tube_dilation":
      return `${layer.kind}:${layer.side}`;
    default:
      return undefined;
  }
}

function defaultViewsForFamilies(families: SurgeryPlan["procedureFamilies"]) {
  if (families === "not_documented") return [];
  const requested = new Set(families);
  return procedureCatalog
    .filter((entry) => requested.has(entry.id))
    .flatMap((entry) => entry.defaultBaseViews)
    .filter((view, index, all) => all.indexOf(view) === index);
}

/**
 * Produces the smallest configured view set that can render every active,
 * documented visual layer. Existing view order is preserved and a reviewed
 * view is added only when a layer would otherwise be orphaned.
 */
export function deriveRenderableBaseViews(
  plan: Pick<SurgeryPlan, "baseViews" | "procedureFamilies" | "layers">,
): SurgeryBaseView[] {
  const views = [
    ...new Set(
      plan.baseViews.length > 0 ? plan.baseViews : defaultViewsForFamilies(plan.procedureFamilies),
    ),
  ];
  for (const layer of getActiveSurgeryLayers(plan)) {
    if (
      layer.documentation !== "documented" ||
      layer.kind === "intraoperative_deviation" ||
      layer.kind === "verification_status"
    ) {
      continue;
    }
    const approvedViews = approvedBaseViewsForLayerKind(layer.kind);
    if (!views.some((view) => approvedViews.includes(view))) {
      const repairView = approvedViews[0];
      if (repairView) views.push(repairView);
    }
  }
  return views;
}

export function normalizeSurgeryPlan(input: unknown): NormalizedSurgeryPlanResult {
  const parsed = SurgeryPlanSchema.safeParse(input);
  if (!parsed.success) {
    const validation = validateSurgeryPlan(input);
    return { ...validation };
  }

  const plan = parsed.data;
  if (plan.procedureFamilies !== "not_documented") {
    const requested = new Set(plan.procedureFamilies);
    plan.procedureFamilies = surgeryProcedureFamilyValues.filter((family) => requested.has(family));
  }
  plan.baseViews = deriveRenderableBaseViews(plan);

  const documentedSlots = new Set(
    plan.layers
      .filter((layer) => layer.documentation === "documented")
      .map(semanticPlaceholderKey)
      .filter((key): key is string => key !== undefined),
  );
  const roleOrder: Record<SurgeryLayer["role"], number> = {
    finding: 0,
    action: 1,
    deviation: 2,
    verification: 3,
  };
  plan.layers = plan.layers
    .filter((layer) => {
      const key = semanticPlaceholderKey(layer);
      return layer.documentation === "documented" || key === undefined || !documentedSlots.has(key);
    })
    .sort(
      (a, b) =>
        roleOrder[a.role] - roleOrder[b.role] ||
        surgeryLayerKindValues.indexOf(a.kind) - surgeryLayerKindValues.indexOf(b.kind) ||
        a.id.localeCompare(b.id),
    );

  return { plan, ...validateParsedSurgeryPlan(plan) };
}

export function createEmptySurgeryPlan(): SurgeryPlan {
  return SurgeryPlanSchema.parse({
    schemaVersion: "1.0",
    laterality: "not_documented",
    procedureFamilies: "not_documented",
    revisionStatus: "not_documented",
    baseViews: [],
    layers: [],
    sourceSafety: { status: "not_documented" },
    review: { status: "draft_unreviewed" },
  });
}

let generatedLayerId = 0;

export function createDefaultLayer<Kind extends SurgeryLayer["kind"]>(
  kind: Kind,
  side?: SurgeryLayer["side"],
): Extract<SurgeryLayer, { kind: Kind }>;
export function createDefaultLayer(
  kind: SurgeryLayer["kind"],
  side: SurgeryLayer["side"] = "not_documented",
): SurgeryLayer {
  generatedLayerId += 1;
  const common = {
    id: `layer-${kind}-${generatedLayerId}`,
    side,
    documentation: "not_documented" as const,
    evidence: [],
    enteredBy: "clinician" as const,
  };

  switch (kind) {
    case "tm_state":
      return { ...common, kind, role: "finding", state: "not_documented" };
    case "tm_perforation":
      return { ...common, kind, role: "finding", region: "not_documented" };
    case "tm_graft":
      return {
        ...common,
        kind,
        role: "action",
        material: "not_documented",
        technique: "not_documented",
        purpose: "not_documented",
      };
    case "ossicle_state":
      return {
        ...common,
        kind,
        role: "finding",
        structure: "incus",
        state: "not_documented",
      };
    case "ossicular_reconstruction":
      return {
        ...common,
        kind,
        role: "action",
        method: "not_documented",
        material: "not_documented",
        lateralEndpoint: "not_documented",
        medialEndpoint: "not_documented",
      };
    case "tympanostomy":
      return {
        ...common,
        kind,
        role: "action",
        action: "not_documented",
        quadrant: "not_documented",
        tubeType: "not_documented",
      };
    case "mastoid_technique":
      return { ...common, kind, role: "action", technique: "not_documented" };
    case "cholesteatoma_extent":
      return { ...common, kind, role: "finding", regions: [] };
    case "stapes_procedure":
      return {
        ...common,
        kind,
        role: "action",
        technique: "not_documented",
        fenestra: "not_documented",
        pistonAttachment: "not_documented",
      };
    case "cochlear_insertion":
      return {
        ...common,
        kind,
        role: "action",
        route: "not_documented",
        completion: "not_documented",
        array: "not_documented",
      };
    case "bone_conduction_implant":
      return {
        ...common,
        kind,
        role: "action",
        coupling: "not_documented",
        stage: "not_documented",
      };
    case "canalplasty":
      return {
        ...common,
        kind,
        role: "action",
        region: "not_documented",
        result: "not_documented",
      };
    case "eustachian_tube_dilation":
      return { ...common, kind, role: "action", result: "not_documented" };
    case "intraoperative_deviation":
      return {
        ...common,
        kind,
        role: "deviation",
        deviation: "not_documented",
        affectedLayerIds: [],
      };
    case "verification_status":
      return {
        ...common,
        kind,
        role: "verification",
        verification: "not_documented",
        result: "not_documented",
      };
  }
}

function schematicPerforationGeometry(
  region: Extract<SurgeryLayer, { kind: "tm_perforation" }>["region"],
): z.infer<typeof SurgeryPolygonSchema> | undefined {
  return templatePerforationGeometry(region);
}

function schematicGraftGeometry(
  perforation: z.infer<typeof SurgeryPolygonSchema>,
): z.infer<typeof SurgeryPolygonSchema> {
  return coveringGraftGeometry({
    basis: "generic_template",
    points: perforation.points,
  });
}

function layerDocumentation(field: WithEvidenceValue<string>) {
  return field.value === "not_documented" || field.value === "unsupported"
    ? ("not_documented" as const)
    : ("documented" as const);
}

function enteredBy(field: WithEvidenceValue<string>) {
  return field.editedByClinician ? ("clinician" as const) : ("extraction" as const);
}

function deriveProcedureFamilies(
  family: OperativeCase["procedure"]["family"]["value"],
): SurgeryPlan["procedureFamilies"] {
  switch (family) {
    case "tympanoplasty":
      return ["tympanoplasty"];
    case "ossiculoplasty":
      return ["ossiculoplasty"];
    case "tympanoplasty_with_ossiculoplasty":
      return ["tympanoplasty", "ossiculoplasty"];
    case "not_documented":
    case "unsupported":
      return "not_documented";
  }
}

export function deriveSurgeryPlanFromCase(operativeCase: OperativeCase): SurgeryPlan {
  const side = operativeCase.procedure.laterality.value;
  const layers: SurgeryLayer[] = [];
  const tm = operativeCase.anatomy.tympanicMembrane;
  let perforationLayer: Extract<SurgeryLayer, { kind: "tm_perforation" }> | undefined;

  if (tm.value.startsWith("perforation_")) {
    const region = tm.value.replace("perforation_", "") as Extract<
      SurgeryLayer,
      { kind: "tm_perforation" }
    >["region"];
    perforationLayer = {
      id: "legacy-tm-perforation",
      kind: "tm_perforation",
      role: "finding",
      side,
      documentation: layerDocumentation(tm),
      evidence: tm.evidence,
      enteredBy: enteredBy(tm),
      region,
      geometry: schematicPerforationGeometry(region),
      note: "Generic template geometry; location category is evidence-bound but exact shape and size are not.",
    };
    layers.push(perforationLayer);
  } else {
    layers.push({
      id: "legacy-tm-state",
      kind: "tm_state",
      role: "finding",
      side,
      documentation: layerDocumentation(tm),
      evidence: tm.evidence,
      enteredBy: enteredBy(tm),
      state: tm.value === "intact" || tm.value === "retraction" ? tm.value : "not_documented",
    });
  }

  const ossicleFields = [
    ["malleus", operativeCase.anatomy.malleus],
    ["incus", operativeCase.anatomy.incus],
    ["incudostapedial_joint", operativeCase.anatomy.incudostapedialJoint],
  ] as const;
  for (const [structure, field] of ossicleFields) {
    layers.push({
      id: `legacy-${structure.replaceAll("_", "-")}`,
      kind: "ossicle_state",
      role: "finding",
      side,
      documentation: layerDocumentation(field),
      evidence: field.evidence,
      enteredBy: enteredBy(field),
      structure,
      state: field.value,
    });
  }

  const stapes = operativeCase.anatomy.stapes;
  layers.push({
    id: "legacy-stapes",
    kind: "ossicle_state",
    role: "finding",
    side,
    documentation: layerDocumentation(stapes),
    evidence: stapes.evidence,
    enteredBy: enteredBy(stapes),
    structure: stapes.value === "fixed" ? "stapes_footplate" : "stapes_superstructure",
    state:
      stapes.value === "superstructure_intact"
        ? "intact"
        : stapes.value === "superstructure_absent"
          ? "absent"
          : stapes.value,
  });

  const reconstruction = operativeCase.repair.reconstructionType;
  const reconstructionMaterial = operativeCase.repair.reconstructionMaterial;
  const method = reconstruction.value === "unsupported" ? "not_documented" : reconstruction.value;
  let lateralEndpoint: (typeof ossicularEndpointValues)[number] = "not_documented";
  let medialEndpoint: (typeof ossicularEndpointValues)[number] = "not_documented";
  if (method === "porp") {
    lateralEndpoint = "tympanic_membrane";
    medialEndpoint = "stapes_superstructure";
  } else if (method === "torp") {
    lateralEndpoint = "tympanic_membrane";
    medialEndpoint = "stapes_footplate";
  } else if (
    method === "bone_cement_bridge" &&
    operativeCase.anatomy.incus.value === "long_process_eroded" &&
    operativeCase.anatomy.incudostapedialJoint.value === "discontinuous" &&
    ["mobile", "superstructure_intact"].includes(operativeCase.anatomy.stapes.value)
  ) {
    lateralEndpoint = "incus_long_process";
    medialEndpoint = "stapes_capitulum";
  }
  const reconstructionLayer: Extract<SurgeryLayer, { kind: "ossicular_reconstruction" }> = {
    id: "legacy-ossicular-reconstruction",
    kind: "ossicular_reconstruction",
    role: "action",
    side,
    documentation: layerDocumentation(reconstruction),
    evidence: reconstruction.evidence,
    enteredBy: enteredBy(reconstruction),
    method,
    material:
      reconstructionMaterial.value === "not_documented" ||
      reconstructionMaterial.value === "not_applicable" ||
      reconstructionMaterial.value === "otomimix" ||
      reconstructionMaterial.value === "hydroxyapatite_bone_cement" ||
      reconstructionMaterial.value === "titanium" ||
      reconstructionMaterial.value === "cartilage"
        ? reconstructionMaterial.value
        : "not_documented",
    lateralEndpoint,
    medialEndpoint,
  };
  layers.push(reconstructionLayer);

  const graft = operativeCase.repair.graftType;
  const graftDocumentation = layerDocumentation(graft);
  const isProsthesisProtection =
    graft.value === "cartilage" && (method === "porp" || method === "torp");
  const isTmRepair =
    graftDocumentation === "documented" && graft.value !== "none" && !isProsthesisProtection;
  layers.push({
    id: "legacy-graft",
    kind: "tm_graft",
    role: "action",
    side,
    documentation: graftDocumentation,
    evidence: graft.evidence,
    enteredBy: enteredBy(graft),
    material: graft.value,
    technique: "not_documented",
    purpose: isProsthesisProtection
      ? "prosthesis_protection"
      : isTmRepair
        ? "tympanic_membrane_repair"
        : "not_documented",
    targetLayerId: isProsthesisProtection
      ? reconstructionLayer.id
      : isTmRepair
        ? perforationLayer?.id
        : undefined,
    geometry:
      isTmRepair && perforationLayer?.geometry
        ? schematicGraftGeometry(perforationLayer.geometry)
        : undefined,
    note:
      isTmRepair && perforationLayer
        ? "Generic graft geometry is deterministically expanded beyond the documented perforation region."
        : undefined,
  });

  const procedureFamilies = deriveProcedureFamilies(operativeCase.procedure.family.value);
  const reviewStatus =
    operativeCase.review.status === "approved_by_clinician"
      ? "approved_by_clinician"
      : operativeCase.review.status === "reviewed_for_demo"
        ? "requires_clinician_review"
        : "draft_unreviewed";
  const rawPlan: SurgeryPlan = {
    schemaVersion: "1.0",
    sourceCaseId: operativeCase.caseId,
    laterality: side,
    procedureFamilies,
    revisionStatus: "not_documented",
    baseViews: defaultViewsForFamilies(procedureFamilies),
    layers,
    sourceSafety: {
      status: operativeCase.safety.suitableForRendering ? "cleared" : "blocked",
      reason: operativeCase.safety.blockRenderingReason,
    },
    review: {
      status: reviewStatus,
      reviewerName: operativeCase.review.reviewerName,
      reviewedAtIso: operativeCase.review.reviewedAtIso,
    },
  };
  return SurgeryPlanSchema.parse(rawPlan);
}

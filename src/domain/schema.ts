import { z } from "zod";
import {
  confidenceValues,
  extractionMethodValues,
  graftTypeValues,
  incudostapedialJointStateValues,
  incusStateValues,
  lateralityValues,
  malleusStateValues,
  procedureFamilyValues,
  reconstructionMaterialValues,
  reconstructionTypeValues,
  stapesStateValues,
  tympanicMembraneStateValues,
} from "./ontology";

export const ConfidenceSchema = z.enum(confidenceValues);
export const ExtractionMethodSchema = z.enum(extractionMethodValues);
export const LateralitySchema = z.enum(lateralityValues);
export const ProcedureFamilySchema = z.enum(procedureFamilyValues);
export const TympanicMembraneStateSchema = z.enum(tympanicMembraneStateValues);
export const MalleusStateSchema = z.enum(malleusStateValues);
export const IncusStateSchema = z.enum(incusStateValues);
export const IncudostapedialJointStateSchema = z.enum(incudostapedialJointStateValues);
export const StapesStateSchema = z.enum(stapesStateValues);
export const ReconstructionTypeSchema = z.enum(reconstructionTypeValues);
export const ReconstructionMaterialSchema = z.enum(reconstructionMaterialValues);
export const GraftTypeSchema = z.enum(graftTypeValues);

export const EvidenceSchema = z
  .object({
    sourceText: z.string().min(1).max(1000),
    startChar: z.number().int().nonnegative().optional(),
    endChar: z.number().int().nonnegative().optional(),
    confidence: ConfidenceSchema,
    extractionMethod: ExtractionMethodSchema,
  })
  .superRefine((evidence, ctx) => {
    const hasStart = evidence.startChar !== undefined;
    const hasEnd = evidence.endChar !== undefined;
    if (hasStart !== hasEnd) {
      ctx.addIssue({
        code: "custom",
        message: "Evidence offsets must include both startChar and endChar.",
      });
      return;
    }
    if (hasStart && hasEnd && evidence.endChar! <= evidence.startChar!) {
      ctx.addIssue({
        code: "custom",
        message: "Evidence endChar must be greater than startChar.",
      });
    }
  });

export const WithEvidence = <T extends z.ZodType>(valueSchema: T) =>
  z.object({
    value: valueSchema,
    evidence: z.array(EvidenceSchema).default([]),
    editedByClinician: z.boolean().default(false),
    warning: z.string().optional(),
  });

export const OperativeCaseSchema = z.object({
  schemaVersion: z.literal("1.0"),
  caseId: z.string().optional(),
  inputKind: z.literal("synthetic_note"),
  extractionProvider: ExtractionMethodSchema,
  createdAtIso: z.string().datetime().optional(),

  procedure: z.object({
    family: WithEvidence(ProcedureFamilySchema),
    laterality: WithEvidence(LateralitySchema),
  }),

  anatomy: z.object({
    tympanicMembrane: WithEvidence(TympanicMembraneStateSchema),
    malleus: WithEvidence(MalleusStateSchema),
    incus: WithEvidence(IncusStateSchema),
    incudostapedialJoint: WithEvidence(IncudostapedialJointStateSchema),
    stapes: WithEvidence(StapesStateSchema),
  }),

  repair: z.object({
    reconstructionType: WithEvidence(ReconstructionTypeSchema),
    reconstructionMaterial: WithEvidence(ReconstructionMaterialSchema),
    graftType: WithEvidence(GraftTypeSchema),
  }),

  ambiguities: z
    .array(
      z.object({
        message: z.string(),
        sourceText: z.string().optional(),
        severity: z.enum(["info", "warning", "critical"]),
      }),
    )
    .default([]),

  unsupportedClaims: z
    .array(
      z.object({
        claim: z.string(),
        reason: z.string(),
      }),
    )
    .default([]),

  safety: z.object({
    containsPossiblePhi: z.boolean().default(false),
    phiWarnings: z.array(z.string()).default([]),
    suitableForRendering: z.boolean(),
    blockRenderingReason: z.string().optional(),
  }),

  review: z
    .object({
      status: z.enum(["draft_unreviewed", "reviewed_for_demo", "approved_by_clinician"]),
      reviewerName: z.string().optional(),
      reviewedAtIso: z.string().datetime().optional(),
    })
    .default({ status: "draft_unreviewed" }),
});

export type Evidence = z.infer<typeof EvidenceSchema>;
export type OperativeCase = z.infer<typeof OperativeCaseSchema>;
export type WithEvidenceValue<T> = {
  value: T;
  evidence: Evidence[];
  editedByClinician: boolean;
  warning?: string;
};

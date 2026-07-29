import { z } from "zod";
import { recoverEvidenceSpans } from "../domain/evidence";
import { removeGrammarHostileSchemaKeywords } from "../domain/jsonSchema";
import { normalizeOperativeCase } from "../domain/normalize";
import {
  GraftTypeSchema,
  IncudostapedialJointStateSchema,
  IncusStateSchema,
  LateralitySchema,
  MalleusStateSchema,
  ProcedureFamilySchema,
  ReconstructionMaterialSchema,
  ReconstructionTypeSchema,
  StapesStateSchema,
  TympanicMembraneStateSchema,
  type Evidence,
  type OperativeCase,
} from "../domain/schema";

const EvidenceQuotesSchema = z.array(z.string().min(1).max(1000)).default([]);

export const CompactModelExtractionSchema = z.object({
  procedureFamily: ProcedureFamilySchema,
  laterality: LateralitySchema,
  tympanicMembrane: TympanicMembraneStateSchema,
  malleus: MalleusStateSchema,
  incus: IncusStateSchema,
  incudostapedialJoint: IncudostapedialJointStateSchema,
  stapes: StapesStateSchema,
  reconstructionType: ReconstructionTypeSchema,
  reconstructionMaterial: ReconstructionMaterialSchema,
  graftType: GraftTypeSchema,
  evidence: z.object({
    procedureFamily: EvidenceQuotesSchema,
    laterality: EvidenceQuotesSchema,
    tympanicMembrane: EvidenceQuotesSchema,
    malleus: EvidenceQuotesSchema,
    incus: EvidenceQuotesSchema,
    incudostapedialJoint: EvidenceQuotesSchema,
    stapes: EvidenceQuotesSchema,
    reconstructionType: EvidenceQuotesSchema,
    reconstructionMaterial: EvidenceQuotesSchema,
    graftType: EvidenceQuotesSchema,
  }),
  ambiguities: z
    .array(
      z.object({
        message: z.string().min(1).max(500),
        sourceText: z.string().min(1).max(1000).optional(),
        severity: z.enum(["info", "warning", "critical"]),
      }),
    )
    .default([]),
  unsupportedClaims: z
    .array(
      z.object({
        claim: z.string().min(1).max(500),
        reason: z.string().min(1).max(500),
      }),
    )
    .default([]),
  containsPossiblePhi: z.boolean().default(false),
  phiWarnings: z.array(z.string().min(1).max(300)).default([]),
  suitableForRendering: z.boolean().default(true),
  blockRenderingReason: z.string().min(1).max(500).optional(),
});

export type CompactModelExtraction = z.infer<typeof CompactModelExtractionSchema>;

export const compactModelExtractionJsonSchema = removeGrammarHostileSchemaKeywords(
  z.toJSONSchema(CompactModelExtractionSchema, { target: "draft-7" }),
);

export const COMPACT_EXTRACTION_SYSTEM_PROMPT = `You extract a compact, structured otology operative case from synthetic operative-note text.

Rules:
- Return only JSON matching the schema.
- Use only the enum values provided by the schema.
- Extract only facts explicitly supported by the note.
- Use not_documented when the note does not explicitly document a field.
- Do not infer normal anatomy from silence.
- For each documented value, including explicit none/not_applicable values, put exact sourceText quotes in the matching evidence array.
- Evidence arrays may be empty only for not_documented or unsupported.
- Values of none or not_applicable are documented negative claims and must include sourceText evidence.
- If the note is contradictory, add an ambiguity.
- If the procedure is outside tympanoplasty/ossiculoplasty, use procedureFamily unsupported and set suitableForRendering false.
- Do not provide medical advice.
- Do not generate an image.`;

export function buildCompactExtractionPrompt(note: string) {
  return `Extract the compact structured operative case from this synthetic note.

Field guidance:
- procedureFamily: tympanoplasty, tympanoplasty_with_ossiculoplasty, ossiculoplasty, not_documented, or unsupported
- laterality: left, right, bilateral, or not_documented
- tympanicMembrane: intact, perforation_anterior, perforation_posterior, perforation_central, perforation_subtotal, retraction, or not_documented
- malleus: intact, eroded, absent, fixed, or not_documented
- incus: intact, long_process_eroded, body_eroded, absent, fixed, or not_documented
- incudostapedialJoint: intact, eroded, discontinuous, reconstructed, or not_documented
- stapes: superstructure_intact, superstructure_absent, fixed, mobile, or not_documented
- reconstructionType: none, bone_cement_bridge, porp, torp, cartilage_interposition, not_documented, or unsupported
- reconstructionMaterial: otomimix, hydroxyapatite_bone_cement, titanium, cartilage, not_documented, or not_applicable
- graftType: none, temporalis_fascia, cartilage, perichondrium, or not_documented

Synthetic note:
<<<NOTE
${note}
NOTE>>>`;
}

function evidenceFromQuotes(quotes: string[], extractionMethod: Evidence["extractionMethod"]): Evidence[] {
  return quotes
    .map((quote) => quote.trim())
    .filter(Boolean)
    .slice(0, 3)
    .map((sourceText) => ({
      sourceText,
      confidence: "high",
      extractionMethod,
    }));
}

function field<T extends string>(value: T, quotes: string[], extractionMethod: Evidence["extractionMethod"]) {
  return {
    value,
    evidence: evidenceFromQuotes(quotes, extractionMethod),
    editedByClinician: false,
  };
}

export function compactExtractionToOperativeCase(
  raw: unknown,
  extractionProvider: Extract<OperativeCase["extractionProvider"], "cloudflare" | "ollama">,
  caseId?: string,
  sourceNote?: string,
) {
  const compact = CompactModelExtractionSchema.parse(raw);
  const normalized = normalizeOperativeCase({
    schemaVersion: "1.0",
    caseId,
    inputKind: "synthetic_note",
    extractionProvider,
    createdAtIso: new Date().toISOString(),
    procedure: {
      family: field(compact.procedureFamily, compact.evidence.procedureFamily, extractionProvider),
      laterality: field(compact.laterality, compact.evidence.laterality, extractionProvider),
    },
    anatomy: {
      tympanicMembrane: field(compact.tympanicMembrane, compact.evidence.tympanicMembrane, extractionProvider),
      malleus: field(compact.malleus, compact.evidence.malleus, extractionProvider),
      incus: field(compact.incus, compact.evidence.incus, extractionProvider),
      incudostapedialJoint: field(
        compact.incudostapedialJoint,
        compact.evidence.incudostapedialJoint,
        extractionProvider,
      ),
      stapes: field(compact.stapes, compact.evidence.stapes, extractionProvider),
    },
    repair: {
      reconstructionType: field(compact.reconstructionType, compact.evidence.reconstructionType, extractionProvider),
      reconstructionMaterial: field(
        compact.reconstructionMaterial,
        compact.evidence.reconstructionMaterial,
        extractionProvider,
      ),
      graftType: field(compact.graftType, compact.evidence.graftType, extractionProvider),
    },
    ambiguities: compact.ambiguities,
    unsupportedClaims: compact.unsupportedClaims,
    safety: {
      containsPossiblePhi: compact.containsPossiblePhi,
      phiWarnings: compact.phiWarnings,
      suitableForRendering: compact.suitableForRendering,
      blockRenderingReason: compact.blockRenderingReason,
    },
    review: {
      status: "draft_unreviewed",
    },
  });
  if (!sourceNote) return normalized;
  const recovered = recoverEvidenceSpans(normalized.case, sourceNote);
  return {
    case: recovered.case,
    warnings: [...normalized.warnings, ...recovered.warnings],
  };
}

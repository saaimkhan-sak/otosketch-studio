import { ExtractionValidationError } from "@/lib/errors";
import type { OperativeCase, WithEvidenceValue } from "./schema";

function quoteOffsets(note: string, sourceText: string) {
  const offsets: number[] = [];
  let index = note.indexOf(sourceText);
  while (index >= 0) {
    offsets.push(index);
    index = note.indexOf(sourceText, index + Math.max(1, sourceText.length));
  }
  return offsets;
}

function evidenceFields(operativeCase: OperativeCase): Array<[string, WithEvidenceValue<string>]> {
  return [
    ["procedure.family", operativeCase.procedure.family],
    ["procedure.laterality", operativeCase.procedure.laterality],
    ["anatomy.tympanicMembrane", operativeCase.anatomy.tympanicMembrane],
    ["anatomy.malleus", operativeCase.anatomy.malleus],
    ["anatomy.incus", operativeCase.anatomy.incus],
    ["anatomy.incudostapedialJoint", operativeCase.anatomy.incudostapedialJoint],
    ["anatomy.stapes", operativeCase.anatomy.stapes],
    ["repair.reconstructionType", operativeCase.repair.reconstructionType],
    ["repair.reconstructionMaterial", operativeCase.repair.reconstructionMaterial],
    ["repair.graftType", operativeCase.repair.graftType],
  ];
}

export function recoverEvidenceSpans(operativeCase: OperativeCase, note: string) {
  const next = structuredClone(operativeCase);
  const warnings: string[] = [];

  for (const [fieldName, field] of evidenceFields(next)) {
    for (const evidence of field.evidence) {
      if (evidence.extractionMethod === "manual") continue;
      if (evidence.startChar !== undefined && evidence.endChar !== undefined) {
        if (note.slice(evidence.startChar, evidence.endChar) !== evidence.sourceText) {
          throw new ExtractionValidationError(`${fieldName} source evidence offsets do not match the note text.`);
        }
        continue;
      }

      const offsets = quoteOffsets(note, evidence.sourceText);
      if (offsets.length === 0) {
        throw new ExtractionValidationError(`${fieldName} source evidence was not found in the note text.`);
      }
      if (offsets.length > 1) {
        warnings.push(`${fieldName} source evidence appears multiple times; using the first exact match.`);
      }
      evidence.startChar = offsets[0];
      evidence.endChar = offsets[0] + evidence.sourceText.length;
    }
  }

  return { case: next, warnings };
}

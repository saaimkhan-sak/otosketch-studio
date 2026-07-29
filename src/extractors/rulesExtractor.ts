import { normalizeOperativeCase } from "@/domain/normalize";
import { detectPossiblePhi } from "@/domain/safety";
import type { Evidence, OperativeCase } from "@/domain/schema";
import type { NoteExtractor } from "./NoteExtractor";

type EvidenceMethod = Evidence["extractionMethod"];
type EvidenceSource = string | Pick<RuleMatch, "text" | "startChar" | "endChar">;

interface RuleMatch {
  index: number;
  text: string;
  match: string;
  startChar: number;
  endChar: number;
}

function evidence(source: EvidenceSource, method: EvidenceMethod = "rules", confidence: Evidence["confidence"] = "high"): Evidence {
  if (typeof source === "string") {
    return { sourceText: source, confidence, extractionMethod: method };
  }
  return {
    sourceText: source.text,
    startChar: source.startChar,
    endChar: source.endChar,
    confidence,
    extractionMethod: method,
  };
}

function sentenceContaining(note: string, index: number) {
  const before = note.slice(0, index);
  const after = note.slice(index);
  const previousBoundary = Math.max(before.lastIndexOf("."), before.lastIndexOf("\n"));
  let start = previousBoundary >= 0 ? previousBoundary + 1 : 0;
  const endCandidates = [after.indexOf("."), after.indexOf("\n")]
    .filter((candidate) => candidate >= 0)
    .map((candidate) => index + candidate + 1);
  let end = endCandidates.length > 0 ? Math.min(...endCandidates) : note.length;
  const raw = note.slice(start, end);
  start += raw.match(/^\s*/)?.[0].length ?? 0;
  end -= raw.match(/\s*$/)?.[0].length ?? 0;
  end = Math.min(end, start + 1000);
  return {
    text: note.slice(start, end),
    startChar: start,
    endChar: end,
  };
}

function firstMatch(note: string, pattern: RegExp) {
  const match = pattern.exec(note);
  if (!match || match.index == null) return null;
  const sentence = sentenceContaining(note, match.index);
  return {
    index: match.index,
    text: sentence.text,
    match: match[0],
    startChar: sentence.startChar,
    endChar: sentence.endChar,
  };
}

function hasNegationNear(note: string, index: number) {
  const before = note.slice(Math.max(0, index - 90), index);
  const sentenceBoundary = Math.max(before.lastIndexOf("."), before.lastIndexOf("\n"));
  const sameSentenceBefore = before.slice(sentenceBoundary + 1);
  return /\b(no|not|without|absent evidence of|no evidence of)\b(?:\W+\w+){0,8}\W*$/i.test(
    sameSentenceBefore,
  );
}

function defaultCase(note: string): OperativeCase {
  const possiblePhi = detectPossiblePhi(note);
  return {
    schemaVersion: "1.0",
    caseId: "rules-generated",
    inputKind: "synthetic_note",
    extractionProvider: "rules",
    createdAtIso: new Date().toISOString(),
    procedure: {
      family: { value: "not_documented", evidence: [], editedByClinician: false },
      laterality: { value: "not_documented", evidence: [], editedByClinician: false },
    },
    anatomy: {
      tympanicMembrane: { value: "not_documented", evidence: [], editedByClinician: false },
      malleus: { value: "not_documented", evidence: [], editedByClinician: false },
      incus: { value: "not_documented", evidence: [], editedByClinician: false },
      incudostapedialJoint: { value: "not_documented", evidence: [], editedByClinician: false },
      stapes: { value: "not_documented", evidence: [], editedByClinician: false },
    },
    repair: {
      reconstructionType: { value: "not_documented", evidence: [], editedByClinician: false },
      reconstructionMaterial: { value: "not_documented", evidence: [], editedByClinician: false },
      graftType: { value: "not_documented", evidence: [], editedByClinician: false },
    },
    ambiguities: [],
    unsupportedClaims: [],
    safety: {
      containsPossiblePhi: possiblePhi.containsPossiblePhi,
      phiWarnings: possiblePhi.warnings,
      suitableForRendering: !possiblePhi.containsPossiblePhi,
      blockRenderingReason: possiblePhi.containsPossiblePhi
        ? "Possible patient information detected."
        : undefined,
    },
    review: { status: "draft_unreviewed" },
  };
}

export const rulesExtractor: NoteExtractor = {
  provider: "rules",
  async extract(input) {
    const started = performance.now();
    const note = input.note;
    const operativeCase = defaultCase(note);
    const warnings = [
      "This result was generated using a simple rules-based extractor. It may miss findings not written in supported phrases.",
    ];

    const left = firstMatch(note, /\bleft\b/i);
    const right = firstMatch(note, /\bright\b/i);
    if (left && right) {
      operativeCase.ambiguities.push({
        message: "Both left and right were detected; laterality requires review.",
        severity: "critical",
      });
    } else if (left) {
      operativeCase.procedure.laterality = {
        value: "left",
        evidence: [evidence(left)],
        editedByClinician: false,
      };
    } else if (right) {
      operativeCase.procedure.laterality = {
        value: "right",
        evidence: [evidence(right)],
        editedByClinician: false,
      };
    } else {
      operativeCase.ambiguities.push({
        message: "Laterality was not documented.",
        severity: "warning",
      });
    }

    const tympanoplasty = firstMatch(note, /\btympanoplasty\b/i);
    const ossiculoplastyCandidate = firstMatch(
      note,
      /\bossiculoplasty\b|ossicular chain reconstruction|ossicular reconstruction/i,
    );
    const ossiculoplasty =
      ossiculoplastyCandidate && !hasNegationNear(note, ossiculoplastyCandidate.index)
        ? ossiculoplastyCandidate
        : null;
    if (!tympanoplasty && !ossiculoplasty) {
      operativeCase.procedure.family = {
        value: "unsupported",
        evidence: [],
        editedByClinician: false,
      };
      operativeCase.safety = {
        ...operativeCase.safety,
        suitableForRendering: false,
        blockRenderingReason: "Procedure is outside tympanoplasty/ossiculoplasty MVP scope.",
      };
      operativeCase.unsupportedClaims.push({
        claim: "No supported tympanoplasty/ossiculoplasty procedure detected.",
        reason: "Rules extractor supports only the initial otology procedure pack.",
      });
    } else if (tympanoplasty && ossiculoplasty) {
      operativeCase.procedure.family = {
        value: "tympanoplasty_with_ossiculoplasty",
        evidence: [evidence(tympanoplasty), evidence(ossiculoplasty)],
        editedByClinician: false,
      };
    } else if (tympanoplasty) {
      operativeCase.procedure.family = {
        value: "tympanoplasty",
        evidence: [evidence(tympanoplasty)],
        editedByClinician: false,
      };
    } else if (ossiculoplasty) {
      operativeCase.procedure.family = {
        value: "ossiculoplasty",
        evidence: [evidence(ossiculoplasty)],
        editedByClinician: false,
      };
    }

    const tmPosterior = firstMatch(note, /posterior (tympanic membrane )?perforation/i);
    const tmCentral = firstMatch(note, /central (tympanic membrane )?perforation/i);
    const tmSubtotal = firstMatch(note, /subtotal (tympanic membrane )?perforation/i);
    const tmAnterior = firstMatch(note, /anterior (tympanic membrane )?perforation/i);
    const tmIntact = firstMatch(note, /tympanic membrane (was )?intact/i);
    if (tmSubtotal) {
      operativeCase.anatomy.tympanicMembrane = {
        value: "perforation_subtotal",
        evidence: [evidence(tmSubtotal)],
        editedByClinician: false,
      };
    } else if (tmPosterior) {
      operativeCase.anatomy.tympanicMembrane = {
        value: "perforation_posterior",
        evidence: [evidence(tmPosterior)],
        editedByClinician: false,
      };
    } else if (tmCentral) {
      operativeCase.anatomy.tympanicMembrane = {
        value: "perforation_central",
        evidence: [evidence(tmCentral)],
        editedByClinician: false,
      };
    } else if (tmAnterior) {
      operativeCase.anatomy.tympanicMembrane = {
        value: "perforation_anterior",
        evidence: [evidence(tmAnterior)],
        editedByClinician: false,
      };
    } else if (tmIntact) {
      operativeCase.anatomy.tympanicMembrane = {
        value: "intact",
        evidence: [evidence(tmIntact)],
        editedByClinician: false,
      };
    }

    const malleusIntact = firstMatch(note, /\bmalleus\b[^.]{0,80}\b(intact|mobile)\b/i);
    if (malleusIntact && !hasNegationNear(note, malleusIntact.index)) {
      operativeCase.anatomy.malleus = {
        value: "intact",
        evidence: [evidence(malleusIntact)],
        editedByClinician: false,
      };
    }

    const incusAbsent = firstMatch(note, /\bincus\b[^.]{0,60}\b(absent|missing)\b/i);
    const possibleIncusErosion = firstMatch(note, /possible[^.]{0,80}(erosion|eroded)[^.]{0,80}\bincus\b|\bincus\b[^.]{0,80}possible[^.]{0,80}(erosion|eroded)/i);
    const incusEroded = firstMatch(
      note,
      /long process of the incus (was )?(eroded|absent|partially eroded)|incus long process erosion/i,
    );
    const incusIntact = firstMatch(note, /\bincus\b[^.]{0,80}\bintact\b|intact incus/i);
    if (possibleIncusErosion && !hasNegationNear(note, possibleIncusErosion.index)) {
      operativeCase.ambiguities.push({
        message: "Possible incus erosion was mentioned but not confirmed.",
        sourceText: possibleIncusErosion.text,
        severity: "warning",
      });
    } else if (incusAbsent && !hasNegationNear(note, incusAbsent.index)) {
      operativeCase.anatomy.incus = {
        value: "absent",
        evidence: [evidence(incusAbsent)],
        editedByClinician: false,
      };
    } else if (incusEroded && !hasNegationNear(note, incusEroded.index)) {
      operativeCase.anatomy.incus = {
        value: "long_process_eroded",
        evidence: [evidence(incusEroded)],
        editedByClinician: false,
      };
    } else if (incusIntact && !hasNegationNear(note, incusIntact.index)) {
      operativeCase.anatomy.incus = {
        value: "intact",
        evidence: [evidence(incusIntact)],
        editedByClinician: false,
      };
    }

    const isDiscontinuous = firstMatch(
      note,
      /incudostapedial (joint )?(discontinuity|discontinuous)|discontinuity at the incudostapedial joint|\bIS joint discontinuity\b/i,
    );
    const isIntact = firstMatch(note, /incudostapedial (joint )?(was )?intact|\bIS joint intact\b/i);
    const chainIntact = firstMatch(note, /ossicular chain (was )?intact(?: and mobile)?/i);
    if (isDiscontinuous && !hasNegationNear(note, isDiscontinuous.index)) {
      operativeCase.anatomy.incudostapedialJoint = {
        value: "discontinuous",
        evidence: [evidence(isDiscontinuous)],
        editedByClinician: false,
      };
    } else if (isIntact && !hasNegationNear(note, isIntact.index)) {
      operativeCase.anatomy.incudostapedialJoint = {
        value: "intact",
        evidence: [evidence(isIntact)],
        editedByClinician: false,
      };
    } else if (chainIntact && !hasNegationNear(note, chainIntact.index)) {
      operativeCase.anatomy.incudostapedialJoint = {
        value: "intact",
        evidence: [evidence(chainIntact)],
        editedByClinician: false,
      };
    }

    const stapesAbsent = firstMatch(note, /stapes superstructure (was )?(absent|missing|not present)/i);
    const stapesMobile = firstMatch(note, /stapes[^.]{0,80}\bmobile\b|mobile stapes/i);
    const stapesIntact = firstMatch(note, /stapes superstructure (was )?(intact|present)/i);
    if (stapesAbsent && !hasNegationNear(note, stapesAbsent.index)) {
      operativeCase.anatomy.stapes = {
        value: "superstructure_absent",
        evidence: [evidence(stapesAbsent)],
        editedByClinician: false,
      };
    } else if (stapesMobile && !hasNegationNear(note, stapesMobile.index)) {
      operativeCase.anatomy.stapes = {
        value: "mobile",
        evidence: [evidence(stapesMobile)],
        editedByClinician: false,
      };
    } else if (stapesIntact && !hasNegationNear(note, stapesIntact.index)) {
      operativeCase.anatomy.stapes = {
        value: "superstructure_intact",
        evidence: [evidence(stapesIntact)],
        editedByClinician: false,
      };
    } else if (chainIntact && !hasNegationNear(note, chainIntact.index)) {
      operativeCase.anatomy.stapes = {
        value: "mobile",
        evidence: [evidence(chainIntact)],
        editedByClinician: false,
      };
    }

    const noReconstruction = firstMatch(
      note,
      /no ossicular reconstruction[^.]{0,80}\b(performed|placed|used|applied)\b/i,
    );
    const otomimix = firstMatch(note, /\bOtoMimix\b|bone cement|hydroxyapatite cement|\bHA cement\b/i);
    const porp = firstMatch(note, /\bPORP\b|partial ossicular replacement prosthesis/i);
    const torp = firstMatch(note, /\bTORP\b|total ossicular replacement prosthesis/i);
    if (torp && !hasNegationNear(note, torp.index)) {
      operativeCase.repair.reconstructionType = {
        value: "torp",
        evidence: [evidence(torp)],
        editedByClinician: false,
      };
      operativeCase.repair.reconstructionMaterial = {
        value: /titanium/i.test(torp.text) ? "titanium" : "not_documented",
        evidence: /titanium/i.test(torp.text) ? [evidence(torp)] : [],
        editedByClinician: false,
      };
    } else if (porp && !hasNegationNear(note, porp.index)) {
      operativeCase.repair.reconstructionType = {
        value: "porp",
        evidence: [evidence(porp)],
        editedByClinician: false,
      };
      operativeCase.repair.reconstructionMaterial = {
        value: /titanium/i.test(porp.text) ? "titanium" : "not_documented",
        evidence: /titanium/i.test(porp.text) ? [evidence(porp)] : [],
        editedByClinician: false,
      };
    } else if (otomimix && !hasNegationNear(note, otomimix.index)) {
      operativeCase.repair.reconstructionType = {
        value: "bone_cement_bridge",
        evidence: [evidence(otomimix, "rules", /\bHA cement\b/i.test(otomimix.match) ? "medium" : "high")],
        editedByClinician: false,
      };
      operativeCase.repair.reconstructionMaterial = {
        value: /\bOtoMimix\b/i.test(otomimix.text) ? "otomimix" : "hydroxyapatite_bone_cement",
        evidence: [evidence(otomimix, "rules", /\bHA cement\b/i.test(otomimix.match) ? "medium" : "high")],
        editedByClinician: false,
      };
    } else if (noReconstruction) {
      operativeCase.repair.reconstructionType = {
        value: "none",
        evidence: [evidence(noReconstruction)],
        editedByClinician: false,
      };
      operativeCase.repair.reconstructionMaterial = {
        value: "not_applicable",
        evidence: [evidence(noReconstruction)],
        editedByClinician: false,
      };
    }

    const fascia = firstMatch(note, /temporalis fascia/i);
    const cartilage = firstMatch(note, /cartilage graft|cartilage/i);
    if (fascia && !hasNegationNear(note, fascia.index)) {
      operativeCase.repair.graftType = {
        value: "temporalis_fascia",
        evidence: [evidence(fascia)],
        editedByClinician: false,
      };
    } else if (cartilage && !/considered/i.test(cartilage.text) && !hasNegationNear(note, cartilage.index)) {
      operativeCase.repair.graftType = {
        value: "cartilage",
        evidence: [evidence(cartilage)],
        editedByClinician: false,
      };
    } else if (cartilage && /considered/i.test(cartilage.text)) {
      operativeCase.ambiguities.push({
        message: "Cartilage was mentioned as considered, not confirmed.",
        sourceText: cartilage.text,
        severity: "warning",
      });
    }

    if (operativeCase.repair.reconstructionMaterial.value === "not_documented" && operativeCase.repair.reconstructionType.value !== "not_documented") {
      operativeCase.ambiguities.push({
        message: "Reconstruction type was detected, but material was not documented.",
        severity: "warning",
      });
    }

    if (
      operativeCase.anatomy.stapes.value === "superstructure_absent" &&
      operativeCase.repair.reconstructionType.value === "porp"
    ) {
      operativeCase.ambiguities.push({
        message: "The note contains a possible contradiction: stapes superstructure absent, but PORP usually requires an intact stapes superstructure.",
        severity: "critical",
      });
    }

    const normalized = normalizeOperativeCase(operativeCase);
    return {
      case: normalized.case,
      raw: operativeCase,
      warnings: [...warnings, ...normalized.warnings],
      durationMs: performance.now() - started,
    };
  },
};

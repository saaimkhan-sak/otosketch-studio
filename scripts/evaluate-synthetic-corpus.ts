import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { syntheticCases } from "../src/fixtures/syntheticCases";
import { adversarialCaseNotes } from "../src/fixtures/adversarialCases";
import { mockExtractor } from "../src/extractors/mockExtractor";
import { rulesExtractor } from "../src/extractors/rulesExtractor";
import type { ExtractorProvider, NoteExtractor } from "../src/extractors/NoteExtractor";
import type { OperativeCase } from "../src/domain/schema";

const OUT_DIR = path.resolve("docs/evaluation");
const JSON_PATH = path.join(OUT_DIR, "synthetic-corpus-report.json");
const MD_PATH = path.join(OUT_DIR, "synthetic-corpus-report.md");

const fields = [
  "procedure.family",
  "procedure.laterality",
  "anatomy.tympanicMembrane",
  "anatomy.malleus",
  "anatomy.incus",
  "anatomy.incudostapedialJoint",
  "anatomy.stapes",
  "repair.reconstructionType",
  "repair.reconstructionMaterial",
  "repair.graftType",
] as const;

type FieldPath = (typeof fields)[number];

function valueAt(operativeCase: OperativeCase, field: FieldPath) {
  switch (field) {
    case "procedure.family":
      return operativeCase.procedure.family.value;
    case "procedure.laterality":
      return operativeCase.procedure.laterality.value;
    case "anatomy.tympanicMembrane":
      return operativeCase.anatomy.tympanicMembrane.value;
    case "anatomy.malleus":
      return operativeCase.anatomy.malleus.value;
    case "anatomy.incus":
      return operativeCase.anatomy.incus.value;
    case "anatomy.incudostapedialJoint":
      return operativeCase.anatomy.incudostapedialJoint.value;
    case "anatomy.stapes":
      return operativeCase.anatomy.stapes.value;
    case "repair.reconstructionType":
      return operativeCase.repair.reconstructionType.value;
    case "repair.reconstructionMaterial":
      return operativeCase.repair.reconstructionMaterial.value;
    case "repair.graftType":
      return operativeCase.repair.graftType.value;
  }
}

async function evaluateProvider(provider: ExtractorProvider, extractor: NoteExtractor) {
  const cases = [];
  let matches = 0;
  let total = 0;

  for (const fixture of syntheticCases) {
    const result = await extractor.extract({
      note: fixture.note,
      caseHint: fixture.id,
      provider,
    });
    const mismatches = fields
      .map((field) => ({
        field,
        expected: valueAt(fixture.expected, field),
        actual: valueAt(result.case, field),
      }))
      .filter((item) => item.expected !== item.actual);

    matches += fields.length - mismatches.length;
    total += fields.length;
    cases.push({
      id: fixture.id,
      title: fixture.title,
      matchedFields: fields.length - mismatches.length,
      totalFields: fields.length,
      mismatches,
      warnings: result.warnings,
    });
  }

  return {
    provider,
    fieldAccuracy: total === 0 ? 0 : matches / total,
    matchedFields: matches,
    totalFields: total,
    cases,
  };
}

async function evaluateAdversarial() {
  const results = [];
  for (const item of adversarialCaseNotes) {
    const result = await rulesExtractor.extract({
      note: item.note,
      provider: "rules",
    });
    const passed =
      item.id === "negated-incus-erosion"
        ? result.case.anatomy.incus.value !== "long_process_eroded" &&
          !["bone_cement_bridge", "porp", "torp"].includes(result.case.repair.reconstructionType.value)
        : item.id === "uncertain-incus-erosion"
          ? result.case.anatomy.incus.value === "not_documented" &&
            result.case.ambiguities.some((ambiguity) => /Possible incus erosion/i.test(ambiguity.message))
        : item.id === "contradictory-stapes-porp"
          ? result.case.anatomy.stapes.value === "superstructure_absent" &&
            result.case.repair.reconstructionType.value === "porp" &&
            result.case.ambiguities.some((ambiguity) => ambiguity.severity === "critical")
        : item.id === "missing-laterality"
          ? result.case.procedure.laterality.value === "not_documented"
        : item.id === "unsupported-ossiculoplasty-inference"
          ? result.case.procedure.family.value === "ossiculoplasty" &&
            result.case.repair.reconstructionType.value === "not_documented"
        : item.id === "abbreviation-heavy"
          ? result.case.procedure.laterality.value === "right" &&
            result.case.anatomy.incudostapedialJoint.value === "discontinuous" &&
            result.case.repair.reconstructionType.value === "bone_cement_bridge" &&
            result.case.repair.reconstructionMaterial.value === "hydroxyapatite_bone_cement"
        : item.id === "unsupported-procedure"
          ? result.case.procedure.family.value === "unsupported" &&
            result.case.safety.suitableForRendering === false
          : item.id === "phi-like-input"
            ? result.case.safety.containsPossiblePhi === true &&
              result.case.safety.suitableForRendering === false
            : false;

    results.push({
      id: item.id,
      title: item.title,
      passed,
      teachingPoint: item.teachingPoint,
      extracted: {
        laterality: result.case.procedure.laterality.value,
        family: result.case.procedure.family.value,
        incus: result.case.anatomy.incus.value,
        stapes: result.case.anatomy.stapes.value,
        incudostapedialJoint: result.case.anatomy.incudostapedialJoint.value,
        reconstructionType: result.case.repair.reconstructionType.value,
        reconstructionMaterial: result.case.repair.reconstructionMaterial.value,
        ambiguityCount: result.case.ambiguities.length,
        containsPossiblePhi: result.case.safety.containsPossiblePhi,
        suitableForRendering: result.case.safety.suitableForRendering,
      },
    });
  }
  return results;
}

function markdown(report: Awaited<ReturnType<typeof buildReport>>) {
  const lines = [
    "# Synthetic Corpus Evaluation",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    "## Provider Field Accuracy",
    "",
    "| Provider | Matched fields | Total fields | Accuracy |",
    "|---|---:|---:|---:|",
    ...report.providers.map(
      (provider) =>
        `| ${provider.provider} | ${provider.matchedFields} | ${provider.totalFields} | ${(provider.fieldAccuracy * 100).toFixed(1)}% |`,
    ),
    "",
    "## Rules Extractor Mismatches",
    "",
  ];

  const rules = report.providers.find((provider) => provider.provider === "rules");
  if (rules) {
    for (const item of rules.cases) {
      if (item.mismatches.length === 0) {
        lines.push(`- ${item.id}: none`);
      } else {
        lines.push(
          `- ${item.id}: ${item.mismatches
            .map((mismatch) => `${mismatch.field} expected ${mismatch.expected}, got ${mismatch.actual}`)
            .join("; ")}`,
        );
      }
    }
  }

  lines.push("", "## Adversarial Rules Checks", "", "| Case | Passed | Extracted summary |", "|---|---:|---|");
  for (const item of report.adversarialRulesChecks) {
    lines.push(
      `| ${item.id} | ${item.passed ? "yes" : "no"} | ${JSON.stringify(item.extracted).replaceAll("|", "\\|")} |`,
    );
  }

  lines.push("");
  return `${lines.join("\n")}\n`;
}

async function buildReport() {
  return {
    generatedAt: new Date().toISOString(),
    fixtureCount: syntheticCases.length,
    fieldCount: fields.length,
    fields,
    providers: [
      await evaluateProvider("mock", mockExtractor),
      await evaluateProvider("rules", rulesExtractor),
    ],
    adversarialRulesChecks: await evaluateAdversarial(),
  };
}

await mkdir(OUT_DIR, { recursive: true });
const report = await buildReport();
await writeFile(JSON_PATH, `${JSON.stringify(report, null, 2)}\n`);
await writeFile(MD_PATH, markdown(report));
console.log(
  JSON.stringify(
    {
      ok: true,
      json: JSON_PATH,
      markdown: MD_PATH,
      providers: report.providers.map((provider) => ({
        provider: provider.provider,
        accuracy: provider.fieldAccuracy,
        mismatchingCases: provider.cases.filter((item) => item.mismatches.length > 0).length,
      })),
      adversarialPassed: report.adversarialRulesChecks.filter((item) => item.passed).length,
      adversarialTotal: report.adversarialRulesChecks.length,
    },
    null,
    2,
  ),
);

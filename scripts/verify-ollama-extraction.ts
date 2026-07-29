import { getSyntheticCase } from "../src/fixtures/syntheticCases";
import { ollamaExtractor } from "../src/extractors/ollamaExtractor";

process.env.OLLAMA_MODEL ??= "qwen2.5:3b";

const hero = getSyntheticCase("hero-otomimix-is-joint");
const result = await ollamaExtractor.extract({
  provider: "ollama",
  note: hero.note,
  caseHint: hero.id,
});

const checks = [
  {
    field: "procedure.family",
    expected: "tympanoplasty_with_ossiculoplasty",
    actual: result.case.procedure.family.value,
  },
  { field: "procedure.laterality", expected: "left", actual: result.case.procedure.laterality.value },
  { field: "anatomy.incus", expected: "long_process_eroded", actual: result.case.anatomy.incus.value },
  {
    field: "anatomy.incudostapedialJoint",
    expected: "discontinuous",
    actual: result.case.anatomy.incudostapedialJoint.value,
  },
  {
    field: "repair.reconstructionType",
    expected: "bone_cement_bridge",
    actual: result.case.repair.reconstructionType.value,
  },
  {
    field: "repair.reconstructionMaterial",
    expected: "otomimix",
    actual: result.case.repair.reconstructionMaterial.value,
  },
];

const mismatches = checks.filter((check) => check.expected !== check.actual);
const report = {
  ok: mismatches.length === 0,
  model: process.env.OLLAMA_MODEL,
  durationMs: Math.round(result.durationMs),
  warnings: result.warnings,
  checks,
  mismatches,
};

console.log(JSON.stringify(report, null, 2));
if (!report.ok) {
  process.exitCode = 1;
}

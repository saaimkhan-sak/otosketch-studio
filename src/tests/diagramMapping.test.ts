import { describe, expect, it } from "vitest";
import { buildDiagramState, buildFeatureMap } from "@/domain/diagramMapping";
import { updateCaseField } from "@/domain/editCase";
import { getSyntheticCase } from "@/fixtures/syntheticCases";

describe("diagram mapping", () => {
  it("maps the hero case to incus erosion and bone cement features", () => {
    const hero = getSyntheticCase("hero-otomimix-is-joint").expected;
    const features = buildFeatureMap(hero);
    expect(features.map((feature) => feature.id)).toContain("feature-incus");
    expect(features.map((feature) => feature.id)).toContain("feature-is-joint");
    expect(features.map((feature) => feature.id)).toContain("feature-reconstruction");
    expect(features.find((feature) => feature.id === "feature-reconstruction")?.label).toMatch(/cement/i);
  });

  it("updates the repaired panel when the reconstruction is corrected", () => {
    const hero = getSyntheticCase("hero-otomimix-is-joint").expected;
    const edited = updateCaseField(hero, "repair.reconstructionType", "porp");
    const repairedState = buildDiagramState(edited, "repaired");
    expect(repairedState.reconstructionType).toBe("porp");
  });
});

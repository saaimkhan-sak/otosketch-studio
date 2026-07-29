"use client";

import { CheckCircle2, CircleAlert, CircleHelp } from "lucide-react";
import { buildFeatureMap } from "@/domain/diagramMapping";
import { anatomyFieldLabels, labelValue } from "@/domain/ontology";
import type { OperativeCase } from "@/domain/schema";
import type { SurgeryPlan } from "@/domain/surgeryPlan";
import { labelSurgeryLayer } from "@/components/diagram/ComposedSurgeryDiagram";
import { cn } from "@/lib/cn";

interface FindingsPanelProps {
  operativeCase: OperativeCase;
  surgeryPlan?: SurgeryPlan;
  selectedFeatureId: string | null;
  onSelectFeature: (featureId: string) => void;
}

function SupportIcon({ support }: { support: "supported" | "ambiguous" | "unsupported" }) {
  if (support === "supported") return <CheckCircle2 className="h-4 w-4 text-emerald-700" />;
  if (support === "ambiguous") return <CircleAlert className="h-4 w-4 text-amber-700" />;
  return <CircleHelp className="h-4 w-4 text-red-700" />;
}

function EditedBadge({ edited }: { edited: boolean }) {
  if (!edited) return null;
  return (
    <span className="rounded border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-800">
      clinician edited
    </span>
  );
}

export function FindingsPanel({ operativeCase, surgeryPlan, selectedFeatureId, onSelectFeature }: FindingsPanelProps) {
  const featureMap = buildFeatureMap(operativeCase);
  const customLayers = (surgeryPlan?.layers ?? []).filter(
    (layer) => layer.documentation === "documented" && !layer.id.startsWith("legacy-"),
  );
  const notDocumented = Object.entries(operativeCase.anatomy)
    .filter(([, field]) => field.value === "not_documented")
    .map(([key]) => anatomyFieldLabels[key as keyof typeof anatomyFieldLabels]);

  return (
    <section className="surface p-5">
      <h2 className="section-heading">Case details</h2>
      <div className="mt-4 space-y-2">
        {featureMap.map((feature) => (
          <button
            key={feature.id}
            type="button"
            onClick={() => onSelectFeature(feature.id)}
            className={cn("fact-row w-full text-left hover:border-slate-400", selectedFeatureId === feature.id && "border-slate-900 bg-slate-50")}
          >
            <span className="flex items-center gap-2 font-medium">
              <SupportIcon support={feature.support} />
              {feature.label}
              <EditedBadge
                edited={
                  feature.fieldPath === "procedure.laterality"
                    ? operativeCase.procedure.laterality.editedByClinician
                    : feature.fieldPath === "procedure.family"
                      ? operativeCase.procedure.family.editedByClinician
                      : feature.fieldPath === "anatomy.tympanicMembrane"
                        ? operativeCase.anatomy.tympanicMembrane.editedByClinician
                        : feature.fieldPath === "anatomy.malleus"
                          ? operativeCase.anatomy.malleus.editedByClinician
                          : feature.fieldPath === "anatomy.incus"
                            ? operativeCase.anatomy.incus.editedByClinician
                            : feature.fieldPath === "anatomy.incudostapedialJoint"
                              ? operativeCase.anatomy.incudostapedialJoint.editedByClinician
                              : feature.fieldPath === "anatomy.stapes"
                                ? operativeCase.anatomy.stapes.editedByClinician
                                : feature.fieldPath === "repair.reconstructionType"
                                  ? operativeCase.repair.reconstructionType.editedByClinician
                                  : feature.fieldPath === "repair.reconstructionMaterial"
                                    ? operativeCase.repair.reconstructionMaterial.editedByClinician
                                    : operativeCase.repair.graftType.editedByClinician
                }
              />
            </span>
            {feature.support !== "supported" ? <span className="capitalize">{feature.support}</span> : null}
          </button>
        ))}
        {customLayers.map((layer) => (
          <button
            key={layer.id}
            type="button"
            onClick={() => onSelectFeature(layer.id)}
            className={cn(
              "fact-row w-full text-left hover:border-slate-400",
              selectedFeatureId === layer.id && "border-slate-900 bg-slate-50",
            )}
          >
            <span className="flex items-center gap-2 font-medium">
              <CheckCircle2 className="h-4 w-4 text-emerald-700" aria-hidden="true" />
              {labelSurgeryLayer(layer)}
            </span>
            <span className="text-xs text-slate-600">clinician added</span>
          </button>
        ))}
        {notDocumented.length > 0 ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
            Not documented, not assumed normal: {notDocumented.join(", ")}
          </div>
        ) : null}
      </div>
    </section>
  );
}

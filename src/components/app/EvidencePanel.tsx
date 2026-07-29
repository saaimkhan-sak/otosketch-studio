"use client";

import { buildFeatureMap } from "@/domain/diagramMapping";
import type { OperativeCase } from "@/domain/schema";
import { labelSurgeryLayerKind, type SurgeryPlan } from "@/domain/surgeryPlan";

interface EvidencePanelProps {
  operativeCase: OperativeCase;
  surgeryPlan?: SurgeryPlan;
  selectedFeatureId: string | null;
}

export function EvidencePanel({ operativeCase, surgeryPlan, selectedFeatureId }: EvidencePanelProps) {
  const featureMap = buildFeatureMap(operativeCase);
  const selected = featureMap.find((feature) => feature.id === selectedFeatureId) ?? null;
  const selectedLayer = surgeryPlan?.layers.find((layer) => layer.id === selectedFeatureId) ?? null;

  return (
    <section className="surface p-5">
      <h2 className="section-heading">Evidence</h2>
      {selected ? (
        <div className="mt-4 space-y-3">
          <p className="text-sm font-medium text-slate-900">{selected.label}</p>
          {selected.evidenceQuotes.length > 0 ? (
            selected.evidenceQuotes.map((quote, index) => (
              <blockquote key={`${quote}-${index}`} className="rounded-md border-l-4 border-slate-900 bg-slate-50 p-3 text-sm text-slate-700">
                {quote}
              </blockquote>
            ))
          ) : (
            <p className="text-sm text-red-800">No supporting source text is attached.</p>
          )}
        </div>
      ) : selectedLayer ? (
        <div className="mt-4 space-y-3">
          <p className="text-sm font-medium text-slate-900">
            {labelSurgeryLayerKind(selectedLayer.kind)}
          </p>
          {selectedLayer.evidence.length > 0 ? (
            selectedLayer.evidence.map((item, index) => (
              <blockquote
                key={`${item.sourceText}-${index}`}
                className="rounded-md border-l-4 border-slate-900 bg-slate-50 p-3 text-sm text-slate-700"
              >
                {item.sourceText}
              </blockquote>
            ))
          ) : selectedLayer.enteredBy === "clinician" ? (
            <p className="text-sm text-slate-700">
              Clinician-added structured selection. Confirm it during review; it is not presented as a note quote.
            </p>
          ) : (
            <p className="text-sm text-red-800">No supporting source text is attached.</p>
          )}
          {selectedLayer.note ? <p className="text-xs leading-5 text-slate-600">{selectedLayer.note}</p> : null}
        </div>
      ) : (
        <p className="mt-4 text-sm text-slate-600">
          Select a visual label or case detail to inspect its source.
        </p>
      )}
    </section>
  );
}

"use client";

import { RotateCcw, Undo2 } from "lucide-react";
import {
  graftTypeValues,
  incudostapedialJointStateValues,
  incusStateValues,
  labelValue,
  lateralityValues,
  malleusStateValues,
  procedureFamilyValues,
  reconstructionMaterialValues,
  reconstructionTypeValues,
  stapesStateValues,
  tympanicMembraneStateValues,
} from "@/domain/ontology";
import type { OperativeCase } from "@/domain/schema";
import type { CaseFieldPath } from "@/domain/types";
import { Button } from "@/components/ui/Button";
import { FieldLabel, Select } from "@/components/ui/Field";

interface CorrectionPanelProps {
  operativeCase: OperativeCase;
  onEdit: (fieldPath: CaseFieldPath, value: string) => void;
  canUndo?: boolean;
  canReset?: boolean;
  onUndo?: () => void;
  onReset?: () => void;
}

interface ControlConfig {
  id: string;
  label: string;
  fieldPath: CaseFieldPath;
  value: string;
  options: readonly string[];
}

export function CorrectionPanel({
  operativeCase,
  onEdit,
  canUndo = false,
  canReset = false,
  onUndo,
  onReset,
}: CorrectionPanelProps) {
  const controls: ControlConfig[] = [
    {
      id: "laterality",
      label: "Laterality",
      fieldPath: "procedure.laterality",
      value: operativeCase.procedure.laterality.value,
      options: lateralityValues,
    },
    {
      id: "procedure-family",
      label: "Procedure family",
      fieldPath: "procedure.family",
      value: operativeCase.procedure.family.value,
      options: procedureFamilyValues,
    },
    {
      id: "tm-state",
      label: "Tympanic membrane",
      fieldPath: "anatomy.tympanicMembrane",
      value: operativeCase.anatomy.tympanicMembrane.value,
      options: tympanicMembraneStateValues,
    },
    {
      id: "malleus-state",
      label: "Malleus",
      fieldPath: "anatomy.malleus",
      value: operativeCase.anatomy.malleus.value,
      options: malleusStateValues,
    },
    {
      id: "incus-state",
      label: "Incus",
      fieldPath: "anatomy.incus",
      value: operativeCase.anatomy.incus.value,
      options: incusStateValues,
    },
    {
      id: "is-joint-state",
      label: "Incus-stapes joint",
      fieldPath: "anatomy.incudostapedialJoint",
      value: operativeCase.anatomy.incudostapedialJoint.value,
      options: incudostapedialJointStateValues,
    },
    {
      id: "stapes-state",
      label: "Stapes",
      fieldPath: "anatomy.stapes",
      value: operativeCase.anatomy.stapes.value,
      options: stapesStateValues,
    },
    {
      id: "reconstruction-type",
      label: "Reconstruction",
      fieldPath: "repair.reconstructionType",
      value: operativeCase.repair.reconstructionType.value,
      options: reconstructionTypeValues,
    },
    {
      id: "reconstruction-material",
      label: "Material",
      fieldPath: "repair.reconstructionMaterial",
      value: operativeCase.repair.reconstructionMaterial.value,
      options: reconstructionMaterialValues,
    },
    {
      id: "graft-type",
      label: "Graft",
      fieldPath: "repair.graftType",
      value: operativeCase.repair.graftType.value,
      options: graftTypeValues,
    },
  ];

  return (
    <section className="surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="section-heading">Clinician review fields</h2>
          <p className="mt-1 text-sm text-slate-600">
            Manual changes return the case to draft until reviewed again.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={onUndo} disabled={!canUndo}>
            <Undo2 className="h-4 w-4" aria-hidden="true" />
            Undo edit
          </Button>
          <Button type="button" variant="secondary" onClick={onReset} disabled={!canReset}>
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Reset to generated
          </Button>
        </div>
      </div>
      <details className="review-fields-details mt-4">
        <summary>Review 10 structured fields</summary>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {controls.map((control) => (
          <div key={control.id} className="space-y-2">
            <FieldLabel htmlFor={control.id}>{control.label}</FieldLabel>
            <Select
              id={control.id}
              value={control.value}
              onChange={(event) => onEdit(control.fieldPath, event.target.value)}
            >
              {control.options.map((option) => (
                <option key={option} value={option}>
                  {labelValue(option)}
                </option>
              ))}
            </Select>
          </div>
        ))}
        </div>
      </details>
    </section>
  );
}

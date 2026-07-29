"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { EducationMode } from "@/domain/educationMode";
import {
  createDefaultLayer,
  layerCatalog,
  normalizeSurgeryPlan,
  procedureCatalog,
  type SurgeryLayer,
  type SurgeryPlan,
  type SurgeryProcedureFamily,
} from "@/domain/surgeryPlan";
import {
  coveringGraftGeometry,
  templatePerforationGeometry,
} from "@/domain/tmGeometry";
import { Button } from "@/components/ui/Button";
import { FieldLabel, Select, Textarea } from "@/components/ui/Field";

interface SurgeryBuilderProps {
  plan: SurgeryPlan;
  onChange: (plan: SurgeryPlan) => void;
  mode?: EducationMode;
}

type LayerRole = SurgeryLayer["role"];

const lateralityOptions = ["not_documented", "left", "right", "bilateral"] as const;
const revisionOptions = ["not_documented", "primary", "revision"] as const;
const tmStateOptions = ["not_documented", "intact", "retraction"] as const;
const perforationRegionOptions = [
  "not_documented",
  "anterior",
  "posterior",
  "central",
  "subtotal",
] as const;
const graftMaterialOptions = [
  "not_documented",
  "temporalis_fascia",
  "cartilage",
  "perichondrium",
  "fat",
  "other",
  "none",
] as const;
const graftTechniqueOptions = ["not_documented", "medial", "lateral", "butterfly"] as const;
const graftPurposeOptions = [
  "not_documented",
  "tympanic_membrane_repair",
  "prosthesis_protection",
] as const;
const ossicleStructureOptions = [
  "malleus",
  "incus",
  "incudostapedial_joint",
  "stapes_superstructure",
  "stapes_footplate",
] as const;
const ossicleStateOptions = [
  "not_documented",
  "intact",
  "eroded",
  "long_process_eroded",
  "body_eroded",
  "absent",
  "discontinuous",
  "reconstructed",
  "fixed",
  "mobile",
] as const;
const reconstructionMethodOptions = [
  "not_documented",
  "none",
  "bone_cement_bridge",
  "porp",
  "torp",
  "cartilage_interposition",
  "autologous_incus",
] as const;
const reconstructionMaterialOptions = [
  "not_documented",
  "not_applicable",
  "otomimix",
  "hydroxyapatite_bone_cement",
  "titanium",
  "cartilage",
  "autologous_bone",
  "other",
] as const;
const endpointOptions = [
  "not_documented",
  "tympanic_membrane",
  "malleus",
  "incus_long_process",
  "incus_body",
  "incudostapedial_joint",
  "stapes_capitulum",
  "stapes_superstructure",
  "stapes_footplate",
] as const;
const tympanostomyActionOptions = [
  "not_documented",
  "myringotomy_only",
  "tube_placed",
  "tube_not_placed",
] as const;
const tympanostomyQuadrantOptions = [
  "not_documented",
  "anteroinferior",
  "inferior",
  "posteroinferior",
  "posterosuperior",
] as const;
const tubeTypeOptions = ["not_documented", "short_term", "t_tube", "other", "none"] as const;
const mastoidTechniqueOptions = [
  "not_documented",
  "canal_wall_up",
  "canal_wall_down",
  "canal_wall_reconstruction",
  "mastoid_obliteration",
  "subtotal_petrosectomy",
] as const;
const cholesteatomaRegionOptions = [
  "epitympanum",
  "mesotympanum",
  "hypotympanum",
  "facial_recess",
  "sinus_tympani",
  "mastoid",
  "external_auditory_canal",
] as const;
const stapesTechniqueOptions = [
  "not_documented",
  "stapedotomy",
  "stapedectomy",
  "exploration_only",
] as const;
const fenestraOptions = ["not_documented", "small", "large"] as const;
const pistonAttachmentOptions = [
  "not_documented",
  "incus_long_process",
  "malleus",
  "none",
] as const;
const cochlearRouteOptions = [
  "not_documented",
  "round_window",
  "extended_round_window",
  "cochleostomy",
  "mid_turn_cochleostomy",
] as const;
const completionOptions = ["not_documented", "full", "partial", "aborted"] as const;
const cochlearArrayOptions = ["not_documented", "standard", "split"] as const;
const couplingOptions = [
  "not_documented",
  "percutaneous",
  "passive_transcutaneous",
  "active_transcutaneous",
] as const;
const implantStageOptions = [
  "not_documented",
  "one_stage",
  "two_stage_first",
  "two_stage_second",
] as const;
const canalRegionOptions = [
  "not_documented",
  "anterior",
  "posterior",
  "circumferential",
  "multiple",
] as const;
const procedureResultOptions = ["not_documented", "widened", "partial", "aborted"] as const;
const dilationResultOptions = ["not_documented", "completed", "partial", "aborted"] as const;
const deviationOptions = [
  "not_documented",
  "unexpected_anatomy",
  "procedure_changed",
  "staged",
  "aborted",
  "csf_leak",
  "perilymph_leak",
  "facial_nerve_exposure",
  "lateral_canal_fistula",
  "thin_bone",
  "other_documented",
] as const;
const verificationOptions = [
  "not_documented",
  "ossicular_mobility",
  "tube_patency",
  "electrode_insertion",
  "telemetry",
  "leak_control",
  "facial_nerve_monitoring",
] as const;
const verificationResultOptions = [
  "not_documented",
  "confirmed",
  "not_confirmed",
  "abnormal",
] as const;

const procedureGroups: Array<{ label: string; families: SurgeryProcedureFamily[] }> = [
  {
    label: "Eardrum and pressure",
    families: ["myringotomy_tympanostomy", "tympanoplasty", "eustachian_tube_dilation"],
  },
  {
    label: "Middle ear and mastoid",
    families: ["ossiculoplasty", "tympanomastoidectomy", "stapes_surgery"],
  },
  {
    label: "Hearing implants",
    families: ["cochlear_implant", "bone_conduction_implant"],
  },
  { label: "Ear canal", families: ["canalplasty"] },
];

const roleSections: Array<{ role: LayerRole; title: string; addLabel: string }> = [
  { role: "finding", title: "Findings", addLabel: "Add finding" },
  { role: "action", title: "Actions and implants", addLabel: "Add action or implant" },
  { role: "deviation", title: "Intraoperative changes", addLabel: "Add change" },
  { role: "verification", title: "Verification", addLabel: "Add verification" },
];

const specialChoiceLabels: Record<string, string> = {
  not_documented: "Not documented",
  porp: "PORP",
  torp: "TORP",
  otomimix: "OtoMimix",
  csf_leak: "CSF leak",
  t_tube: "T-tube",
  tm_state: "Eardrum state",
  tm_perforation: "Eardrum perforation",
  tm_graft: "Eardrum graft",
  incudostapedial_joint: "Incus–stapes joint",
  external_auditory_canal: "External ear canal",
  tympanic_membrane: "Tympanic membrane",
};

function choiceLabel(value: string) {
  if (specialChoiceLabels[value]) return specialChoiceLabels[value];
  const words = value.replaceAll("_", " ");
  return `${words.charAt(0).toUpperCase()}${words.slice(1)}`;
}

function markDraft(plan: SurgeryPlan): SurgeryPlan {
  return { ...plan, review: { status: "draft_unreviewed" } };
}

function documentedLayer<Kind extends SurgeryLayer["kind"]>(
  kind: Kind,
  side: SurgeryLayer["side"],
  fields: Record<string, unknown>,
): Extract<SurgeryLayer, { kind: Kind }> {
  return {
    ...createDefaultLayer(kind, side),
    ...fields,
    documentation: "documented",
    enteredBy: "clinician",
    evidence: [],
  } as Extract<SurgeryLayer, { kind: Kind }>;
}

function sameDocumentedSide(first: SurgeryLayer["side"], second: SurgeryLayer["side"]) {
  if (first === "not_documented" || second === "not_documented") return false;
  return first === second || first === "bilateral" || second === "bilateral";
}

export function createPresetPlan(
  family: SurgeryProcedureFamily,
  mode: EducationMode = "postoperative_summary",
): SurgeryPlan {
  const catalogEntry = procedureCatalog.find((entry) => entry.id === family);
  if (!catalogEntry) throw new Error(`Unknown surgery family: ${family}`);
  const side = "right" as const;
  let layers: SurgeryLayer[];

  switch (family) {
    case "myringotomy_tympanostomy":
      layers = [
        documentedLayer("tympanostomy", side, {
          action: "tube_placed",
          quadrant: "anteroinferior",
          tubeType: "short_term",
        }),
        documentedLayer("verification_status", side, {
          verification: "tube_patency",
          result: "confirmed",
        }),
      ];
      break;
    case "tympanoplasty": {
      const perforation = documentedLayer("tm_perforation", side, {
        region: "central",
        geometry: templatePerforationGeometry("central"),
      });
      layers = [
        perforation,
        documentedLayer("tm_graft", side, {
          material: "temporalis_fascia",
          technique: "medial",
          purpose: "tympanic_membrane_repair",
          targetLayerId: perforation.id,
          geometry: coveringGraftGeometry(perforation.geometry),
        }),
      ];
      break;
    }
    case "ossiculoplasty": {
      const reconstruction = documentedLayer("ossicular_reconstruction", side, {
        method: "porp",
        material: "titanium",
        lateralEndpoint: "tympanic_membrane",
        medialEndpoint: "stapes_capitulum",
      });
      layers = [
        documentedLayer("ossicle_state", side, {
          structure: "incus",
          state: "long_process_eroded",
        }),
        reconstruction,
        documentedLayer("tm_graft", side, {
          material: "cartilage",
          technique: "medial",
          purpose: "prosthesis_protection",
          targetLayerId: reconstruction.id,
        }),
        documentedLayer("verification_status", side, {
          verification: "ossicular_mobility",
          result: "confirmed",
        }),
      ];
      break;
    }
    case "tympanomastoidectomy":
      layers = [
        documentedLayer("cholesteatoma_extent", side, {
          regions: ["epitympanum", "mastoid"],
        }),
        documentedLayer("mastoid_technique", side, { technique: "canal_wall_up" }),
        documentedLayer("verification_status", side, {
          verification: "facial_nerve_monitoring",
          result: "confirmed",
        }),
      ];
      break;
    case "stapes_surgery":
      layers = [
        documentedLayer("ossicle_state", side, {
          structure: "stapes_footplate",
          state: "fixed",
        }),
        documentedLayer("stapes_procedure", side, {
          technique: "stapedotomy",
          fenestra: "small",
          pistonAttachment: "incus_long_process",
        }),
        documentedLayer("verification_status", side, {
          verification: "ossicular_mobility",
          result: "confirmed",
        }),
      ];
      break;
    case "cochlear_implant":
      layers = [
        documentedLayer("cochlear_insertion", side, {
          route: "round_window",
          completion: "full",
          array: "standard",
        }),
        documentedLayer("verification_status", side, {
          verification: "telemetry",
          result: "confirmed",
        }),
      ];
      break;
    case "bone_conduction_implant":
      layers = [
        documentedLayer("bone_conduction_implant", side, {
          coupling: "active_transcutaneous",
          stage: "one_stage",
        }),
      ];
      break;
    case "canalplasty":
      layers = [
        documentedLayer("canalplasty", side, { region: "multiple", result: "widened" }),
      ];
      break;
    case "eustachian_tube_dilation":
      layers = [
        documentedLayer("eustachian_tube_dilation", side, { result: "completed" }),
      ];
      break;
  }

  const visibleLayers =
    mode === "preoperative_education"
      ? layers
          .filter((layer) => layer.role === "finding" || layer.role === "action")
          .map((layer): SurgeryLayer => {
            if (layer.kind === "cochlear_insertion") {
              return { ...layer, completion: "not_documented" };
            }
            if (layer.kind === "canalplasty") {
              return { ...layer, result: "not_documented" };
            }
            if (layer.kind === "eustachian_tube_dilation") {
              return { ...layer, result: "not_documented" };
            }
            return layer;
          })
      : layers;

  return {
    schemaVersion: "1.0",
    laterality: side,
    procedureFamilies: [family],
    revisionStatus: "primary",
    baseViews: [...catalogEntry.defaultBaseViews],
    layers: visibleLayers,
    sourceSafety: { status: "cleared" },
    review: { status: "draft_unreviewed" },
  };
}

function hasDocumentedSubtype(layer: SurgeryLayer) {
  switch (layer.kind) {
    case "tm_state":
      return layer.state !== "not_documented";
    case "tm_perforation":
      return layer.region !== "not_documented";
    case "tm_graft":
      return (
        layer.material !== "not_documented" ||
        layer.technique !== "not_documented" ||
        layer.purpose !== "not_documented"
      );
    case "ossicle_state":
      return layer.state !== "not_documented";
    case "ossicular_reconstruction":
      return (
        layer.method !== "not_documented" ||
        layer.material !== "not_documented" ||
        layer.lateralEndpoint !== "not_documented" ||
        layer.medialEndpoint !== "not_documented"
      );
    case "tympanostomy":
      return (
        layer.action !== "not_documented" ||
        layer.quadrant !== "not_documented" ||
        layer.tubeType !== "not_documented"
      );
    case "mastoid_technique":
      return layer.technique !== "not_documented";
    case "cholesteatoma_extent":
      return layer.regions.length > 0;
    case "stapes_procedure":
      return (
        layer.technique !== "not_documented" ||
        layer.fenestra !== "not_documented" ||
        layer.pistonAttachment !== "not_documented"
      );
    case "cochlear_insertion":
      return (
        layer.route !== "not_documented" ||
        layer.completion !== "not_documented" ||
        layer.array !== "not_documented"
      );
    case "bone_conduction_implant":
      return layer.coupling !== "not_documented" || layer.stage !== "not_documented";
    case "canalplasty":
      return layer.region !== "not_documented" || layer.result !== "not_documented";
    case "eustachian_tube_dilation":
      return layer.result !== "not_documented";
    case "intraoperative_deviation":
      return (
        layer.deviation !== "not_documented" ||
        Boolean(layer.management?.trim()) ||
        layer.affectedLayerIds.length > 0 ||
        Boolean(layer.supersedingLayerId)
      );
    case "verification_status":
      return layer.verification !== "not_documented" || layer.result !== "not_documented";
  }
}

interface ChoiceFieldProps {
  id: string;
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
}

function ChoiceField({ id, label, value, options, onChange }: ChoiceFieldProps) {
  return (
    <div className="surgery-builder-field space-y-1.5">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Select id={id} value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {choiceLabel(option)}
          </option>
        ))}
      </Select>
    </div>
  );
}

interface LayerFieldsProps {
  layer: SurgeryLayer;
  plan: SurgeryPlan;
  mode: EducationMode;
  update: (fields: Record<string, unknown>) => void;
}

function LayerFields({ layer, plan, mode, update }: LayerFieldsProps) {
  const id = (field: string) => `${layer.id}-${field}`;

  switch (layer.kind) {
    case "tm_state":
      return (
        <ChoiceField id={id("state")} label="State" value={layer.state} options={tmStateOptions} onChange={(state) => update({ state })} />
      );
    case "tm_perforation":
      return (
        <ChoiceField id={id("region")} label="Region" value={layer.region} options={perforationRegionOptions} onChange={(region) => update({ region, geometry: templatePerforationGeometry(region) })} />
      );
    case "tm_graft": {
      const targets = plan.layers.filter(
        (candidate) =>
          candidate.id !== layer.id &&
          candidate.documentation === "documented" &&
          sameDocumentedSide(candidate.side, layer.side) &&
          (layer.purpose === "tympanic_membrane_repair"
            ? candidate.kind === "tm_perforation"
            : layer.purpose === "prosthesis_protection"
              ? candidate.kind === "ossicular_reconstruction"
              : false),
      );
      return (
        <>
          <ChoiceField id={id("material")} label="Material" value={layer.material} options={graftMaterialOptions} onChange={(material) => update({ material })} />
          <ChoiceField id={id("technique")} label="Technique" value={layer.technique} options={graftTechniqueOptions} onChange={(technique) => update({ technique })} />
          <ChoiceField id={id("purpose")} label="Purpose" value={layer.purpose} options={graftPurposeOptions} onChange={(purpose) => update({ purpose })} />
          <div className="surgery-builder-field space-y-1.5">
            <FieldLabel htmlFor={id("target")}>Repair target</FieldLabel>
            <Select id={id("target")} value={layer.targetLayerId ?? ""} onChange={(event) => update({ targetLayerId: event.target.value || undefined })}>
              <option value="">Not documented</option>
              {targets.map((target) => (
                <option key={target.id} value={target.id}>
                  {choiceLabel(target.kind)} · {choiceLabel(target.side)}
                </option>
              ))}
            </Select>
          </div>
        </>
      );
    }
    case "ossicle_state":
      return (
        <>
          <ChoiceField id={id("structure")} label="Structure" value={layer.structure} options={ossicleStructureOptions} onChange={(structure) => update({ structure })} />
          <ChoiceField id={id("state")} label="State" value={layer.state} options={ossicleStateOptions} onChange={(state) => update({ state })} />
        </>
      );
    case "ossicular_reconstruction":
      return (
        <>
          <ChoiceField id={id("method")} label="Method" value={layer.method} options={reconstructionMethodOptions} onChange={(method) => update({ method })} />
          <ChoiceField id={id("material")} label="Material" value={layer.material} options={reconstructionMaterialOptions} onChange={(material) => update({ material })} />
          <ChoiceField id={id("lateral-endpoint")} label="Lateral endpoint" value={layer.lateralEndpoint} options={endpointOptions} onChange={(lateralEndpoint) => update({ lateralEndpoint })} />
          <ChoiceField id={id("medial-endpoint")} label="Medial endpoint" value={layer.medialEndpoint} options={endpointOptions} onChange={(medialEndpoint) => update({ medialEndpoint })} />
        </>
      );
    case "tympanostomy":
      return (
        <>
          <ChoiceField id={id("action")} label="Action" value={layer.action} options={tympanostomyActionOptions} onChange={(action) => update({ action })} />
          <ChoiceField id={id("quadrant")} label="Quadrant" value={layer.quadrant} options={tympanostomyQuadrantOptions} onChange={(quadrant) => update({ quadrant })} />
          <ChoiceField id={id("tube-type")} label="Tube type" value={layer.tubeType} options={tubeTypeOptions} onChange={(tubeType) => update({ tubeType })} />
        </>
      );
    case "mastoid_technique":
      return (
        <ChoiceField id={id("technique")} label="Technique" value={layer.technique} options={mastoidTechniqueOptions} onChange={(technique) => update({ technique })} />
      );
    case "cholesteatoma_extent":
      return (
        <fieldset className="surgery-builder-region-field sm:col-span-2">
          <legend className="text-sm font-semibold text-[#17302d]">Documented regions</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {cholesteatomaRegionOptions.map((region) => (
              <label key={region} className="flex min-h-9 items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={layer.regions.includes(region)}
                  onChange={(event) =>
                    update({
                      regions: event.target.checked
                        ? [...layer.regions, region]
                        : layer.regions.filter((item) => item !== region),
                    })
                  }
                />
                <span>{choiceLabel(region)}</span>
              </label>
            ))}
          </div>
        </fieldset>
      );
    case "stapes_procedure":
      return (
        <>
          <ChoiceField id={id("technique")} label="Technique" value={layer.technique} options={stapesTechniqueOptions} onChange={(technique) => update({ technique })} />
          <ChoiceField id={id("fenestra")} label="Fenestra" value={layer.fenestra} options={fenestraOptions} onChange={(fenestra) => update({ fenestra })} />
          <ChoiceField id={id("piston-attachment")} label="Piston attachment" value={layer.pistonAttachment} options={pistonAttachmentOptions} onChange={(pistonAttachment) => update({ pistonAttachment })} />
        </>
      );
    case "cochlear_insertion":
      return (
        <>
          <ChoiceField id={id("route")} label="Insertion route" value={layer.route} options={cochlearRouteOptions} onChange={(route) => update({ route })} />
          {mode === "postoperative_summary" ? (
            <ChoiceField id={id("completion")} label="Completion" value={layer.completion} options={completionOptions} onChange={(completion) => update({ completion })} />
          ) : null}
          <ChoiceField id={id("array")} label="Array" value={layer.array} options={cochlearArrayOptions} onChange={(array) => update({ array })} />
        </>
      );
    case "bone_conduction_implant":
      return (
        <>
          <ChoiceField id={id("coupling")} label="Coupling" value={layer.coupling} options={couplingOptions} onChange={(coupling) => update({ coupling })} />
          <ChoiceField id={id("stage")} label="Stage" value={layer.stage} options={implantStageOptions} onChange={(stage) => update({ stage })} />
        </>
      );
    case "canalplasty":
      return (
        <>
          <ChoiceField id={id("region")} label="Region" value={layer.region} options={canalRegionOptions} onChange={(region) => update({ region })} />
          {mode === "postoperative_summary" ? (
            <ChoiceField id={id("result")} label="Result" value={layer.result} options={procedureResultOptions} onChange={(result) => update({ result })} />
          ) : null}
        </>
      );
    case "eustachian_tube_dilation":
      return mode === "postoperative_summary" ? (
        <ChoiceField id={id("result")} label="Result" value={layer.result} options={dilationResultOptions} onChange={(result) => update({ result })} />
      ) : null;
    case "intraoperative_deviation":
      {
        const actionLayers = plan.layers.filter(
          (candidate) =>
            candidate.role === "action" &&
            candidate.documentation === "documented" &&
            sameDocumentedSide(candidate.side, layer.side),
        );
        const supersedingOptions = actionLayers.filter(
          (candidate) => !layer.affectedLayerIds.includes(candidate.id),
        );
      return (
        <>
          <ChoiceField id={id("deviation")} label="Change" value={layer.deviation} options={deviationOptions} onChange={(deviation) => update({ deviation })} />
          <div className="surgery-builder-field space-y-1.5">
            <FieldLabel htmlFor={id("superseding-layer")}>Final action</FieldLabel>
            <Select
              id={id("superseding-layer")}
              value={layer.supersedingLayerId ?? ""}
              onChange={(event) => update({ supersedingLayerId: event.target.value || undefined })}
            >
              <option value="">No replacement documented</option>
              {supersedingOptions.map((candidate, candidateIndex) => (
                <option key={candidate.id} value={candidate.id}>
                  {choiceLabel(candidate.kind)} {candidateIndex + 1} · {choiceLabel(candidate.side)}
                </option>
              ))}
            </Select>
          </div>
          <fieldset className="surgery-builder-affected-actions sm:col-span-2">
            <legend className="text-sm font-semibold text-[#17302d]">Affected earlier actions</legend>
            {actionLayers.length > 0 ? (
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {actionLayers.map((candidate, candidateIndex) => (
                  <label key={candidate.id} className="flex min-h-9 items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={layer.affectedLayerIds.includes(candidate.id)}
                      disabled={layer.supersedingLayerId === candidate.id}
                      onChange={(event) =>
                        update({
                          affectedLayerIds: event.target.checked
                            ? [...layer.affectedLayerIds, candidate.id]
                            : layer.affectedLayerIds.filter((item) => item !== candidate.id),
                        })
                      }
                    />
                    <span>{choiceLabel(candidate.kind)} {candidateIndex + 1}</span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-xs text-slate-600">Add a documented action before linking a change.</p>
            )}
          </fieldset>
          <div className="surgery-builder-management-field space-y-1.5 sm:col-span-2">
            <FieldLabel htmlFor={id("management")}>Management note</FieldLabel>
            <Textarea
              id={id("management")}
              className="min-h-24"
              value={layer.management ?? ""}
              onChange={(event) => update({ management: event.target.value || undefined })}
            />
            <p className="text-xs leading-5 text-slate-600">
              Text only — this note does not generate anatomy or a visual layer.
            </p>
          </div>
        </>
      );
      }
    case "verification_status":
      return (
        <>
          <ChoiceField id={id("verification")} label="Check" value={layer.verification} options={verificationOptions} onChange={(verification) => update({ verification })} />
          <ChoiceField id={id("result")} label="Result" value={layer.result} options={verificationResultOptions} onChange={(result) => update({ result })} />
        </>
      );
  }
}

interface LayerEditorProps {
  layer: SurgeryLayer;
  index: number;
  plan: SurgeryPlan;
  mode: EducationMode;
  onUpdate: (layerId: string, fields: Record<string, unknown>, documentation?: boolean) => void;
  onRemove: (layerId: string) => void;
}

function LayerEditor({ layer, index, plan, mode, onUpdate, onRemove }: LayerEditorProps) {
  const title = `${choiceLabel(layer.kind)} ${index + 1}`;
  return (
    <article className="surgery-builder-layer-card rounded-md border border-slate-200 bg-white p-4">
      <div className="surgery-builder-layer-header flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="font-semibold text-slate-950">{title}</h4>
          <span className="text-xs text-slate-600">
            {layer.documentation === "documented" ? "Documented" : "Not documented"}
          </span>
        </div>
        <Button
          type="button"
          variant="secondary"
          className="px-3"
          aria-label={`Remove ${title}`}
          onClick={() => onRemove(layer.id)}
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          Remove
        </Button>
      </div>
      <div className="surgery-builder-layer-common mt-4 grid gap-3 sm:grid-cols-2">
        <ChoiceField
          id={`${layer.id}-side`}
          label="Side"
          value={layer.side}
          options={lateralityOptions}
          onChange={(side) => onUpdate(layer.id, { side })}
        />
        <label className="surgery-builder-documentation-toggle flex min-h-10 items-center gap-2 self-end rounded-md border border-slate-200 px-3 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            checked={layer.documentation === "documented"}
            onChange={(event) => onUpdate(layer.id, {}, event.target.checked)}
          />
          <span>Documented</span>
        </label>
      </div>
      <div className="surgery-builder-layer-fields mt-3 grid gap-3 sm:grid-cols-2">
        <LayerFields layer={layer} plan={plan} mode={mode} update={(fields) => onUpdate(layer.id, fields)} />
      </div>
    </article>
  );
}

export function SurgeryBuilder({
  plan,
  onChange,
  mode = "postoperative_summary",
}: SurgeryBuilderProps) {
  const [selectedAddKinds, setSelectedAddKinds] = useState<Record<LayerRole, SurgeryLayer["kind"]>>({
    finding: "tm_state",
    action: "tm_graft",
    deviation: "intraoperative_deviation",
    verification: "verification_status",
  });
  const selectedProcedures = new Set(
    plan.procedureFamilies === "not_documented" ? [] : plan.procedureFamilies,
  );
  const selectedPreset =
    plan.procedureFamilies !== "not_documented" && plan.procedureFamilies.length === 1
      ? plan.procedureFamilies[0]
      : "";
  const normalized = normalizeSurgeryPlan(plan);
  const visibleValidationIssues = normalized.issues.filter(
    (issue) => issue.code !== "plan_not_clinician_approved",
  );
  const visibleRoleSections = roleSections
    .filter(
      (section) =>
        mode !== "preoperative_education" ||
        section.role === "finding" ||
        section.role === "action",
    )
    .map((section) => {
      if (mode !== "preoperative_education") return section;
      if (section.role === "finding") {
        return { ...section, title: "Anatomy being discussed", addLabel: "Add anatomy detail" };
      }
      return { ...section, title: "Planned steps and implants", addLabel: "Add planned step" };
    });

  const emit = (next: SurgeryPlan) => onChange(markDraft(next));

  const toggleProcedure = (family: SurgeryProcedureFamily, checked: boolean) => {
    const selected = new Set(selectedProcedures);
    if (checked) selected.add(family);
    else selected.delete(family);
    const families = procedureCatalog.map((entry) => entry.id).filter((id) => selected.has(id));
    const baseViews = procedureCatalog
      .filter((entry) => selected.has(entry.id))
      .flatMap((entry) => entry.defaultBaseViews)
      .filter((view, index, all) => all.indexOf(view) === index);
    emit({
      ...plan,
      procedureFamilies: families.length > 0 ? families : "not_documented",
      baseViews,
    });
  };

  const updateLayer = (
    layerId: string,
    fields: Record<string, unknown>,
    forcedDocumentation?: boolean,
  ) => {
    let layers = plan.layers.map((layer) => {
      if (layer.id !== layerId) return layer;
      const patched = { ...layer, ...fields } as SurgeryLayer;
      const documented = forcedDocumentation ?? hasDocumentedSubtype(patched);
      return {
        ...patched,
        documentation: documented ? "documented" : "not_documented",
        enteredBy: "clinician",
        evidence: [],
      } as SurgeryLayer;
    });
    const changedLayer = layers.find((layer) => layer.id === layerId);
    if (changedLayer?.kind === "tm_perforation") {
      layers = layers.map((layer) =>
        layer.kind === "tm_graft" &&
        layer.purpose === "tympanic_membrane_repair" &&
        layer.targetLayerId === changedLayer.id
          ? { ...layer, geometry: coveringGraftGeometry(changedLayer.geometry) }
          : layer,
      );
    }
    if (changedLayer?.kind === "tm_graft") {
      const target = layers.find((layer) => layer.id === changedLayer.targetLayerId);
      const targetMatchesPurpose =
        (changedLayer.purpose === "tympanic_membrane_repair" && target?.kind === "tm_perforation") ||
        (changedLayer.purpose === "prosthesis_protection" && target?.kind === "ossicular_reconstruction");
      const targetMatchesSide = target ? sameDocumentedSide(changedLayer.side, target.side) : false;
      layers = layers.map((layer) => {
        if (layer.id !== changedLayer.id || layer.kind !== "tm_graft") return layer;
        if (!targetMatchesPurpose || !targetMatchesSide) {
          return { ...layer, targetLayerId: undefined, geometry: undefined };
        }
        return {
          ...layer,
          geometry:
            layer.purpose === "tympanic_membrane_repair" && target?.kind === "tm_perforation"
              ? coveringGraftGeometry(target.geometry)
              : undefined,
        };
      });
    }
    emit({ ...plan, layers });
  };

  const removeLayer = (layerId: string) => {
    emit({
      ...plan,
      layers: plan.layers
        .filter((layer) => layer.id !== layerId)
        .map((layer) =>
          layer.kind === "tm_graft" && layer.targetLayerId === layerId
            ? { ...layer, targetLayerId: undefined, geometry: undefined }
            : layer.kind === "intraoperative_deviation"
              ? {
                  ...layer,
                  affectedLayerIds: layer.affectedLayerIds.filter((id) => id !== layerId),
                  supersedingLayerId:
                    layer.supersedingLayerId === layerId ? undefined : layer.supersedingLayerId,
                }
              : layer,
        ),
    });
  };

  const addLayer = (role: LayerRole) => {
    const kind = selectedAddKinds[role];
    const side = plan.laterality;
    emit({ ...plan, layers: [...plan.layers, createDefaultLayer(kind, side)] });
  };

  return (
    <section className="surgery-builder-root space-y-6" aria-labelledby="surgery-builder-heading">
      <header className="surgery-builder-header">
        <h2 id="surgery-builder-heading" className="text-lg font-semibold text-slate-950">
          {mode === "preoperative_education" ? "Procedure" : "Surgery details"}
        </h2>
      </header>

      <div className="surgery-builder-preset rounded-md border border-slate-200 bg-slate-50 p-4">
        <FieldLabel htmlFor="surgery-plan-preset">
          {mode === "preoperative_education" ? "Common planned procedure" : "Synthetic surgery example"}
        </FieldLabel>
        <Select
          id="surgery-plan-preset"
          className="mt-2"
          value={selectedPreset}
          onChange={(event) => {
            if (!event.target.value) return;
            onChange(createPresetPlan(event.target.value as SurgeryProcedureFamily, mode));
          }}
        >
          <option value="">Choose a procedure</option>
          {procedureCatalog.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.label}
            </option>
          ))}
        </Select>
      </div>

      <div className="surgery-builder-basics grid gap-4 sm:grid-cols-2">
        <ChoiceField
          id="surgery-plan-laterality"
          label="Laterality"
          value={plan.laterality}
          options={lateralityOptions}
          onChange={(laterality) => emit({ ...plan, laterality: laterality as SurgeryPlan["laterality"] })}
        />
        <ChoiceField
          id="surgery-plan-revision"
          label="Case type"
          value={plan.revisionStatus}
          options={revisionOptions}
          onChange={(revisionStatus) => emit({ ...plan, revisionStatus: revisionStatus as SurgeryPlan["revisionStatus"] })}
        />
      </div>

      <details className="surgery-builder-procedures rounded-md border border-slate-200 bg-white">
        <summary className="surgery-builder-procedure-summary">
          <span>
            <strong>Procedures</strong>
            <span className="text-xs text-slate-600">{selectedProcedures.size} selected</span>
          </span>
        </summary>
        <fieldset className="p-4">
          <legend className="sr-only">Common procedures</legend>
          <label className="flex min-h-9 items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={plan.procedureFamilies === "not_documented"}
              onChange={(event) => {
                if (event.target.checked) emit({ ...plan, procedureFamilies: "not_documented", baseViews: [] });
              }}
            />
            <span>Not documented</span>
          </label>
          <div className="surgery-builder-procedure-groups mt-3 grid gap-4 sm:grid-cols-2">
            {procedureGroups.map((group) => (
              <section key={group.label} className="surgery-builder-procedure-group" aria-label={group.label}>
                <h3 className="text-sm font-semibold text-slate-950">{group.label}</h3>
                <div className="mt-2 space-y-2">
                  {group.families.map((family) => {
                    const entry = procedureCatalog.find((item) => item.id === family);
                    return (
                      <label key={family} className="flex min-h-9 items-start gap-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={selectedProcedures.has(family)}
                          onChange={(event) => toggleProcedure(family, event.target.checked)}
                        />
                        <span>{entry?.label ?? family}</span>
                      </label>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </fieldset>
      </details>

      <div className="surgery-builder-layer-groups space-y-5">
        {visibleRoleSections.map((section) => {
          const roleKinds = layerCatalog.filter((entry) => entry.role === section.role);
          const roleLayers = plan.layers.filter((layer) => layer.role === section.role);
          return (
            <details
              key={section.role}
              className="surgery-builder-layer-group rounded-md border border-slate-200 bg-slate-50"
            >
              <summary className="surgery-builder-layer-summary">
                <span>
                  <strong id={`surgery-builder-${section.role}-heading`} className="font-semibold text-slate-950">
                    {section.title}
                  </strong>
                  <span className="text-xs text-slate-600">{roleLayers.length} added</span>
                </span>
              </summary>
              <div className="surgery-builder-layer-body">
                <div className="surgery-builder-layer-group-header flex flex-wrap items-end justify-end gap-3">
                <div className="flex min-w-0 flex-1 flex-wrap justify-end gap-2 sm:flex-none">
                  <label className="sr-only" htmlFor={`add-${section.role}-kind`}>
                    {section.title} layer type
                  </label>
                  <Select
                    id={`add-${section.role}-kind`}
                    className="w-auto min-w-48 flex-1 sm:flex-none"
                    value={selectedAddKinds[section.role]}
                    onChange={(event) =>
                      setSelectedAddKinds((current) => ({
                        ...current,
                        [section.role]: event.target.value as SurgeryLayer["kind"],
                      }))
                    }
                  >
                    {roleKinds.map((entry) => (
                      <option key={entry.kind} value={entry.kind}>
                        {entry.label}
                      </option>
                    ))}
                  </Select>
                  <Button type="button" variant="secondary" onClick={() => addLayer(section.role)}>
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    {section.addLabel}
                  </Button>
                </div>
              </div>
              <div className="surgery-builder-layer-list mt-4 space-y-3">
                {roleLayers.map((layer, index) => (
                  <LayerEditor
                    key={layer.id}
                    layer={layer}
                    index={index}
                    plan={plan}
                    mode={mode}
                    onUpdate={updateLayer}
                    onRemove={removeLayer}
                  />
                ))}
                {roleLayers.length === 0 ? (
                  <p className="text-sm text-slate-600">No {section.title.toLowerCase()} added.</p>
                ) : null}
              </div>
              </div>
            </details>
          );
        })}
      </div>

      {visibleValidationIssues.length > 0 ? (
        <section
          className="surgery-builder-validation rounded-md border border-slate-200 bg-white p-4"
          aria-labelledby="surgery-builder-validation-heading"
          aria-live="polite"
        >
          <h3 id="surgery-builder-validation-heading" className="font-semibold text-slate-950">
            {normalized.canRender ? "Check plan" : "Resolve conflicts"}
          </h3>
          <ul className="mt-3 space-y-2">
            {visibleValidationIssues.map((issue, index) => (
              <li key={`${issue.code}-${issue.layerIds.join("-")}-${index}`} className="text-sm text-slate-700">
                <span
                  className={
                    issue.level === "blocking"
                      ? "mr-2 inline-flex rounded bg-red-100 px-2 py-0.5 font-semibold text-red-800"
                      : "mr-2 inline-flex rounded bg-amber-100 px-2 py-0.5 font-semibold text-amber-900"
                  }
                >
                  {issue.level === "blocking" ? "Blocking" : "Needs review"}
                </span>
                {issue.message}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </section>
  );
}

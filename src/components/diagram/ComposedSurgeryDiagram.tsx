"use client";
import { useId, type CSSProperties } from "react";
import type { EducationMode } from "@/domain/educationMode";
import {
  getActiveSurgeryLayers,
  labelSurgeryLayerKind,
  type SurgeryBaseView,
  type SurgeryLayer,
  type SurgeryPlan,
} from "@/domain/surgeryPlan";
import { cn } from "@/lib/cn";
import { AtlasIllustrationDefs } from "./AtlasIllustrationDefs";

export type SurgeryDiagramPhase = "finding" | "procedure";

interface ComposedSurgeryDiagramProps {
  plan: SurgeryPlan;
  phase: SurgeryDiagramPhase;
  presentationMode?: EducationMode;
  selectedLayerId?: string | null;
  onLayerSelect?: (layerId: string) => void;
}

const viewLabels: Record<SurgeryBaseView, string> = {
  otoscopic_tm: "Eardrum view",
  transcanal_middle_ear: "Middle-ear view",
  mastoid_middle_ear: "Mastoid and middle ear",
  cochlea_implant_path: "Cochlear implant path",
  postauricular_implant: "Bone-conduction implant",
  external_auditory_canal: "Ear-canal view",
  eustachian_tube: "Eustachian-tube view",
};

const viewLayerKinds: Record<SurgeryBaseView, SurgeryLayer["kind"][]> = {
  otoscopic_tm: ["tm_state", "tm_perforation", "tm_graft", "tympanostomy"],
  transcanal_middle_ear: [
    "tm_graft",
    "ossicle_state",
    "ossicular_reconstruction",
    "stapes_procedure",
  ],
  mastoid_middle_ear: [
    "cholesteatoma_extent",
    "mastoid_technique",
  ],
  cochlea_implant_path: ["cochlear_insertion"],
  postauricular_implant: ["bone_conduction_implant"],
  external_auditory_canal: ["canalplasty"],
  eustachian_tube: ["eustachian_tube_dilation"],
};

const atlasResourceNames = [
  "paper",
  "field-glow",
  "skin",
  "canal",
  "tm",
  "tm-side",
  "bone",
  "bone-cut",
  "ossicle",
  "cavity",
  "mucosa",
  "bone-deep",
  "perforation",
  "fascia",
  "cartilage",
  "fat",
  "metal",
  "cement",
  "cholesteatoma",
  "nerve",
  "sinus",
  "cochlea",
  "balloon",
  "fascia-fibers",
  "bone-speckle",
  "cartilage-hatch",
  "cancellous",
  "mucosal-vessels",
  "soft-shadow",
  "small-shadow",
  "inner-soften",
  "pearl-glow",
] as const;

function atlasResourceStyle(prefix: string) {
  return Object.fromEntries(
    atlasResourceNames.map((name) => [`--atlas-${name}`, `url(#${prefix}-atlas-${name})`]),
  ) as CSSProperties;
}

function humanize(value: string) {
  if (value === "porp") return "PORP";
  if (value === "torp") return "TORP";
  if (value === "csf_leak") return "CSF leak";
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function documentedDetail(value: string, excluded: string[] = []) {
  return value === "not_documented" || excluded.includes(value) ? null : humanize(value);
}

function joinLabel(primary: string, ...details: Array<string | null>) {
  return [primary, ...details].filter((detail): detail is string => Boolean(detail)).join(" · ");
}

export function labelSurgeryLayer(layer: SurgeryLayer) {
  switch (layer.kind) {
    case "tm_state":
      return layer.state === "not_documented" ? "Eardrum state not documented" : `Eardrum · ${humanize(layer.state)}`;
    case "tm_perforation":
      return layer.region === "not_documented"
        ? "Eardrum perforation · location not documented"
        : `${humanize(layer.region)} eardrum perforation`;
    case "tm_graft":
      if (layer.material === "none") return "No graft placed";
      return joinLabel(
        layer.material === "not_documented" ? "Eardrum graft" : `${humanize(layer.material)} graft`,
        documentedDetail(layer.technique),
      );
    case "ossicle_state":
      return layer.state === "not_documented"
        ? `${humanize(layer.structure)} · state not documented`
        : `${humanize(layer.structure)} · ${humanize(layer.state)}`;
    case "ossicular_reconstruction":
      return layer.method === "none"
        ? "No ossicular reconstruction performed"
        : joinLabel(
            layer.method === "not_documented" ? "Ossicular reconstruction" : humanize(layer.method),
            documentedDetail(layer.material, ["not_applicable"]),
          );
    case "tympanostomy":
      return joinLabel(
        layer.action === "not_documented" ? "Tympanostomy details not documented" : humanize(layer.action),
        documentedDetail(layer.quadrant),
      );
    case "mastoid_technique":
      return layer.technique === "not_documented" ? "Mastoid technique not documented" : humanize(layer.technique);
    case "cholesteatoma_extent":
      return layer.regions.length > 0
        ? `Cholesteatoma · ${layer.regions.map(humanize).join(", ")}`
        : "Cholesteatoma extent not documented";
    case "stapes_procedure":
      return joinLabel(
        layer.technique === "not_documented" ? "Stapes procedure" : humanize(layer.technique),
        documentedDetail(layer.pistonAttachment, ["none"]),
      );
    case "cochlear_insertion":
      return joinLabel(
        layer.route === "not_documented" ? "Cochlear implant insertion" : `${humanize(layer.route)} insertion`,
        documentedDetail(layer.completion),
      );
    case "bone_conduction_implant":
      return joinLabel(
        layer.coupling === "not_documented" ? "Bone-conduction implant" : `${humanize(layer.coupling)} implant`,
        documentedDetail(layer.stage),
      );
    case "canalplasty":
      return joinLabel("Canalplasty", documentedDetail(layer.region), documentedDetail(layer.result));
    case "eustachian_tube_dilation":
      return joinLabel("Eustachian-tube dilation", documentedDetail(layer.result));
    case "intraoperative_deviation":
      return layer.deviation === "not_documented"
        ? "Intraoperative change · details not documented"
        : `Intraoperative change · ${humanize(layer.deviation)}`;
    case "verification_status":
      return joinLabel(
        layer.verification === "not_documented" ? "Verification" : humanize(layer.verification),
        documentedDetail(layer.result),
      );
  }
}

function isVisibleInPhase(layer: SurgeryLayer, phase: SurgeryDiagramPhase) {
  if (layer.documentation !== "documented") return false;
  return phase === "finding" ? layer.role === "finding" : layer.role !== "finding";
}

function layersForView(
  plan: SurgeryPlan,
  view: SurgeryBaseView,
  phase: SurgeryDiagramPhase,
  includeStatuses: boolean,
) {
  return getActiveSurgeryLayers(plan).filter((layer) => {
    if (!isVisibleInPhase(layer, phase)) return false;
    if (layer.kind === "tm_graft") {
      if (view === "otoscopic_tm" && layer.purpose !== "tympanic_membrane_repair") return false;
      if (view === "transcanal_middle_ear" && layer.purpose !== "prosthesis_protection") return false;
    }
    if (
      includeStatuses &&
      (layer.kind === "intraoperative_deviation" || layer.kind === "verification_status")
    ) {
      return true;
    }
    return viewLayerKinds[view].includes(layer.kind);
  });
}

const endpointPosition: Record<string, { x: number; y: number }> = {
  tympanic_membrane: { x: 306, y: 286 },
  malleus: { x: 360, y: 215 },
  incus_long_process: { x: 603, y: 300 },
  incus_body: { x: 404, y: 169 },
  incudostapedial_joint: { x: 632, y: 307 },
  stapes_capitulum: { x: 650, y: 310 },
  stapes_superstructure: { x: 650, y: 310 },
  stapes_footplate: { x: 650, y: 374 },
};

function markerAnchor(view: SurgeryBaseView, layer: SurgeryLayer, index: number) {
  const offsets = [0, 26, -26, 52, -52];
  const offset = offsets[index % offsets.length];
  if ((layer.kind === "tm_perforation" || layer.kind === "tm_graft") && layer.geometry) {
    const centroid = layer.geometry.points.reduce(
      (sum, point) => ({ x: sum.x + point.x, y: sum.y + point.y }),
      { x: 0, y: 0 },
    );
    return {
      x: 480 + (centroid.x / layer.geometry.points.length - 0.5) * 360,
      y: 260 + (centroid.y / layer.geometry.points.length - 0.5) * 344,
    };
  }
  switch (view) {
    case "otoscopic_tm":
      if (layer.kind === "tympanostomy") return { x: 492 + offset, y: 340 };
      return { x: 480 + offset, y: 260 };
    case "transcanal_middle_ear":
      if (layer.kind === "tm_graft") return { x: 350, y: 270 };
      if (layer.kind === "ossicle_state") {
        const structurePosition: Record<string, { x: number; y: number }> = {
          malleus: { x: 350, y: 250 },
          incus: { x: 426, y: 190 },
          incudostapedial_joint: { x: 632, y: 282 },
          stapes_superstructure: { x: 548, y: 277 },
          stapes_footplate: { x: 626, y: 323 },
        };
        return structurePosition[layer.structure];
      }
      if (layer.kind === "ossicular_reconstruction") {
        const start = endpointPosition[layer.lateralEndpoint];
        const end = endpointPosition[layer.medialEndpoint];
        if (start && end) return { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
      }
      if (layer.kind === "stapes_procedure") return { x: 626, y: 323 + offset };
      return { x: 510 + offset, y: 220 };
    case "mastoid_middle_ear":
      return { x: layer.kind === "cholesteatoma_extent" ? 655 + offset : 760 + offset, y: 220 };
    case "cochlea_implant_path":
      return { x: 650 + offset, y: 314 };
    case "postauricular_implant":
      return { x: 675 + offset, y: 195 };
    case "external_auditory_canal":
      return { x: 520 + offset, y: 250 };
    case "eustachian_tube":
      return { x: 525 + offset, y: 290 };
  }
}

function layerHasVisualShape(layer: SurgeryLayer, view: SurgeryBaseView) {
  switch (layer.kind) {
    case "tm_state":
      return view === "otoscopic_tm" && layer.state !== "not_documented";
    case "tm_perforation":
      return view === "otoscopic_tm" && layer.region !== "not_documented" && Boolean(layer.geometry);
    case "tm_graft":
      if (layer.material === "none" || layer.material === "not_documented") return false;
      if (view === "otoscopic_tm") {
        return layer.purpose === "tympanic_membrane_repair" && Boolean(layer.targetLayerId && layer.geometry);
      }
      return view === "transcanal_middle_ear" && layer.purpose === "prosthesis_protection" && Boolean(layer.targetLayerId);
    case "ossicle_state":
      return view === "transcanal_middle_ear" && layer.state !== "not_documented";
    case "ossicular_reconstruction":
      return (
        view === "transcanal_middle_ear" &&
        !["none", "not_documented"].includes(layer.method) &&
        layer.lateralEndpoint !== "not_documented" &&
        layer.medialEndpoint !== "not_documented"
      );
    case "tympanostomy":
      return (
        view === "otoscopic_tm" &&
        ["myringotomy_only", "tube_placed"].includes(layer.action) &&
        layer.quadrant !== "not_documented"
      );
    case "mastoid_technique":
      return view === "mastoid_middle_ear" && layer.technique !== "not_documented";
    case "cholesteatoma_extent":
      return view === "mastoid_middle_ear" && layer.regions.length > 0;
    case "stapes_procedure":
      return (
        view === "transcanal_middle_ear" &&
        !["exploration_only", "not_documented"].includes(layer.technique) &&
        !["none", "not_documented"].includes(layer.pistonAttachment)
      );
    case "cochlear_insertion":
      return (
        view === "cochlea_implant_path" &&
        layer.route !== "not_documented" &&
        ["full", "partial"].includes(layer.completion)
      );
    case "bone_conduction_implant":
      return (
        view === "postauricular_implant" &&
        layer.coupling !== "not_documented" &&
        layer.stage !== "not_documented"
      );
    case "canalplasty":
      return (
        view === "external_auditory_canal" &&
        layer.region !== "not_documented" &&
        ["widened", "partial"].includes(layer.result)
      );
    case "eustachian_tube_dilation":
      return view === "eustachian_tube" && ["completed", "partial"].includes(layer.result);
    case "intraoperative_deviation":
    case "verification_status":
      return false;
  }
}

function LayerMarker({
  view,
  layer,
  index,
  selected,
  mirrored,
}: {
  view: SurgeryBaseView;
  layer: SurgeryLayer;
  index: number;
  selected: boolean;
  mirrored: boolean;
}) {
  const target = markerAnchor(view, layer, index);
  const targetX = mirrored ? 960 - target.x : target.x;
  const badge = {
    x: mirrored ? 42 : 918,
    y: Math.min(452, 78 + index * 54),
  };
  const controlX = badge.x + (targetX - badge.x) * 0.42;
  const controlY = badge.y + (target.y - badge.y) * 0.18;
  const status = layer.kind === "intraoperative_deviation" || layer.kind === "verification_status";
  return (
    <g
      className={cn("surgery-marker", status && "is-status", selected && "is-selected")}
      data-layer-marker={layer.id}
      data-marker-target-x={Math.round(targetX)}
      data-marker-target-y={Math.round(target.y)}
      aria-hidden="true"
    >
      <path
        d={`M${badge.x} ${badge.y} Q${controlX} ${controlY} ${targetX} ${target.y}`}
        className="surgery-annotation-leader"
      />
      <circle cx={targetX} cy={target.y} r="3.5" className="surgery-annotation-target" />
      <circle cx={badge.x} cy={badge.y} r="16" className="surgery-annotation-badge" />
      <text x={badge.x} y={badge.y + 5}>{index + 1}</text>
    </g>
  );
}

function normalizedPoints(
  geometry: Extract<SurgeryLayer, { kind: "tm_perforation" | "tm_graft" }>["geometry"],
) {
  if (!geometry) return undefined;
  return geometry.points
    .map((point) => `${480 + (point.x - 0.5) * 360},${260 + (point.y - 0.5) * 344}`)
    .join(" ");
}

function normalizedSmoothPath(
  geometry: Extract<SurgeryLayer, { kind: "tm_perforation" | "tm_graft" }>["geometry"],
) {
  if (!geometry || geometry.points.length < 3) return undefined;
  const points = geometry.points.map((point) => ({
    x: 480 + (point.x - 0.5) * 360,
    y: 260 + (point.y - 0.5) * 344,
  }));
  const format = (value: number) => Math.round(value * 100) / 100;
  let path = `M${format(points[0].x)} ${format(points[0].y)}`;
  for (let index = 0; index < points.length; index += 1) {
    const previous = points[(index - 1 + points.length) % points.length];
    const current = points[index];
    const next = points[(index + 1) % points.length];
    const following = points[(index + 2) % points.length];
    const firstControl = {
      x: current.x + (next.x - previous.x) / 6,
      y: current.y + (next.y - previous.y) / 6,
    };
    const secondControl = {
      x: next.x - (following.x - current.x) / 6,
      y: next.y - (following.y - current.y) / 6,
    };
    path += ` C${format(firstControl.x)} ${format(firstControl.y)} ${format(secondControl.x)} ${format(secondControl.y)} ${format(next.x)} ${format(next.y)}`;
  }
  return `${path} Z`;
}

function uniqueLayers(layers: SurgeryLayer[]) {
  return Array.from(new Map(layers.map((layer) => [layer.id, layer])).values());
}

function OtoscopicView({
  layers,
  contextLayers,
  phase,
  definitionPrefix,
}: {
  layers: SurgeryLayer[];
  contextLayers: SurgeryLayer[];
  phase: SurgeryDiagramPhase;
  definitionPrefix: string;
}) {
  const allLayers = uniqueLayers([...contextLayers, ...layers]);
  const perforations = allLayers.filter(
    (layer): layer is Extract<SurgeryLayer, { kind: "tm_perforation" }> =>
      layer.kind === "tm_perforation" &&
      layer.region !== "not_documented" &&
      Boolean(layer.geometry),
  );
  const grafts = layers.filter(
    (layer): layer is Extract<SurgeryLayer, { kind: "tm_graft" }> =>
      layer.kind === "tm_graft" &&
      layer.material !== "none" &&
      layer.material !== "not_documented" &&
      layer.purpose === "tympanic_membrane_repair" &&
      Boolean(layer.targetLayerId && layer.geometry),
  );
  const tubes = layers.filter(
    (layer): layer is Extract<SurgeryLayer, { kind: "tympanostomy" }> => layer.kind === "tympanostomy",
  );
  const states = allLayers.filter(
    (layer): layer is Extract<SurgeryLayer, { kind: "tm_state" }> => layer.kind === "tm_state",
  );

  const tmDiscPath = "M301 137 C343 87 420 62 499 68 C584 74 647 118 674 188 C707 274 677 366 607 420 C541 471 434 473 357 425 C287 381 257 296 273 215 C280 181 287 156 301 137 Z";
  const tmClipId = `${definitionPrefix}-tm-disc`;
  const tubePosition = (quadrant: Extract<SurgeryLayer, { kind: "tympanostomy" }>["quadrant"]) => {
    if (quadrant === "posteroinferior") return { x: 394, y: 350 };
    if (quadrant === "posterosuperior") return { x: 399, y: 191 };
    if (quadrant === "inferior") return { x: 482, y: 389 };
    if (quadrant === "anteroinferior") return { x: 558, y: 350 };
    return null;
  };
  const renderGraft = (layer: Extract<SurgeryLayer, { kind: "tm_graft" }>) => {
    const points = normalizedPoints(layer.geometry);
    const smoothPath = normalizedSmoothPath(layer.geometry);
    const clipId = `${definitionPrefix}-graft-clip-${layer.id.replaceAll(/[^a-zA-Z0-9_-]/g, "-")}`;
    const centroid = layer.geometry?.points.reduce(
      (sum, point) => ({ x: sum.x + point.x, y: sum.y + point.y }),
      { x: 0, y: 0 },
    );
    const center = centroid && layer.geometry
      ? {
          x: 480 + (centroid.x / layer.geometry.points.length - 0.5) * 360,
          y: 260 + (centroid.y / layer.geometry.points.length - 0.5) * 344,
        }
      : { x: 480, y: 260 };
    return points && smoothPath ? (
      <g key={layer.id} className={`is-${layer.material} is-${layer.technique}`}>
        <defs><clipPath id={clipId}><path d={smoothPath} /></clipPath></defs>
        <polygon points={points} className={cn("surgery-graft-overlay", "surgery-geometry-contract", `is-${layer.material}`, `is-${layer.technique}`)} data-layer-id={layer.id} />
        <path d={smoothPath} className={cn("surgery-graft-surface", `is-${layer.material}`, `is-${layer.technique}`)} />
        <path d={smoothPath} className={cn("surgery-graft-material", `is-${layer.material}`)} />
        <g clipPath={`url(#${clipId})`}>
          <path d="M300 205 C405 168 555 170 666 222 M292 255 C415 218 568 224 680 272 M300 311 C425 275 568 286 671 333" className="surgery-graft-fibers" />
          <path d="M300 183 C420 145 570 151 686 211" className="surgery-graft-highlight" />
        </g>
        {layer.technique === "butterfly" ? (
          <g transform={`translate(${center.x} ${center.y}) scale(.72) translate(${-center.x} ${-center.y})`}>
            <path d={smoothPath} className="surgery-butterfly-lateral-wing" />
            <path d={smoothPath} className="surgery-butterfly-groove" />
          </g>
        ) : null}
        {layer.material === "fat" ? (
          <g className="surgery-fat-lobules" clipPath={`url(#${clipId})`}>
            <ellipse cx={center.x - 21} cy={center.y - 8} rx="27" ry="21" />
            <ellipse cx={center.x + 13} cy={center.y - 14} rx="28" ry="23" />
            <ellipse cx={center.x - 4} cy={center.y + 17} rx="31" ry="23" />
          </g>
        ) : null}
      </g>
    ) : null;
  };

  return (
    <g className="atlas-otoscopic-view">
      <defs><clipPath id={tmClipId}><path d={tmDiscPath} /></clipPath></defs>
      <ellipse cx="500" cy="260" rx="384" ry="256" className="surgery-field-glow" />
      <path d="M223 105 C287 34 403 12 520 30 C642 49 724 127 743 229 C763 339 699 433 596 475 C482 521 341 487 264 408 C194 337 176 210 223 105 Z" className="surgery-canal-shadow" data-anatomy-id="external-canal-depth" />
      <path d="M237 111 C298 48 400 30 506 43 C620 57 703 126 724 222 C747 324 690 418 594 458 C490 501 361 473 285 404 C214 340 194 211 237 111 Z" className="surgery-canal-ring" data-anatomy-id="external-auditory-canal" />
      <path d="M260 127 C315 73 403 54 495 62 C594 70 665 127 690 210 C720 308 676 395 596 440 C508 489 396 469 326 412 C260 358 230 219 260 127 Z" className="surgery-canal-lumen" data-anatomy-id="canal-lumen" />
      <g clipPath={`url(#${tmClipId})`}>
        {grafts.filter((layer) => layer.technique === "medial" || layer.technique === "not_documented").map(renderGraft)}
        <path d={tmDiscPath} className="surgery-tm-base" data-anatomy-id="tympanic-membrane" />
        <path d={tmDiscPath} className="surgery-tm-mucosal-texture" aria-hidden="true" />
        {[153, 181, 210, 239, 269, 299, 329, 358].map((y, index) => (
          <path
            key={`tm-fiber-${y}`}
            d={`M${307 + Math.abs(250 - y) * 0.18} ${y} Q478 ${232 + (y - 245) * 0.35} ${650 - Math.abs(250 - y) * 0.16} ${y + 5}`}
            className={cn("surgery-tm-fiber", index % 2 === 0 && "is-soft")}
          />
        ))}
        <path d="M482 270 L621 174 M482 270 L624 355 M482 270 L354 371 M482 270 L340 185" className="surgery-tm-radials" />
        <path d="M326 187 C349 178 360 160 369 142 M361 214 C374 199 385 184 395 166 M580 179 C604 167 623 152 636 132 M567 207 C594 201 619 189 641 171" className="surgery-tm-vessels" />
        <path d="M486 276 C522 301 555 339 572 391 C535 374 505 356 484 334 C469 315 469 292 486 276 Z" className="surgery-cone-of-light" />
        {states.some((layer) => layer.state === "retraction") ? (
          <g>
            <path d="M367 192 C421 156 530 157 590 215 C631 255 622 326 575 363 C523 403 426 392 376 342 C334 300 327 232 367 192 Z" className="surgery-retraction-pocket" />
            <path d="M370 196 C423 163 526 163 584 218 C621 254 614 318 571 354" className="surgery-finding-dashed" />
          </g>
        ) : null}
        {perforations.map((layer) => {
          const points = normalizedPoints(layer.geometry);
          const smoothPath = normalizedSmoothPath(layer.geometry);
          const repaired = phase === "procedure" && grafts.some((graft) => graft.targetLayerId === layer.id);
          if (points && smoothPath) {
            return (
              <g key={`surface-${layer.id}`}>
                <polygon points={points} className={cn(repaired ? "surgery-repaired-defect-outline" : "surgery-perforation", "surgery-geometry-contract")} data-layer-id={layer.id} />
                {!repaired ? <><path d={smoothPath} className="surgery-perforation-depth" /><path d={smoothPath} className="surgery-perforation-surface" /></> : null}
              </g>
            );
          }
          const center = layer.region === "anterior" ? 552 : layer.region === "posterior" ? 410 : 480;
          const radius = layer.region === "subtotal" ? 110 : 43;
          return (
            <g key={`surface-${layer.id}`}>
              <circle cx={center} cy="278" r={radius} className={repaired ? "surgery-repaired-defect-outline" : "surgery-perforation"} data-layer-id={layer.id} />
              {!repaired ? <ellipse cx={center - radius * 0.2} cy={278 - radius * 0.24} rx={radius * 0.55} ry={radius * 0.28} className="surgery-perforation-highlight" /> : null}
            </g>
          );
        })}
        {grafts.filter((layer) => layer.technique === "medial" || layer.technique === "not_documented").map((layer) => {
          const target = perforations.find((perforation) => perforation.id === layer.targetLayerId);
          const targetPath = normalizedSmoothPath(target?.geometry);
          const graftPath = normalizedSmoothPath(layer.geometry);
          if (!targetPath || !graftPath) return null;
          return (
            <g key={`window-${layer.id}`} className={`surgery-medial-graft-window is-${layer.material}`}>
              <path d={targetPath} className="surgery-graft-window-fill" />
              <path d={targetPath} className="surgery-graft-window-texture" />
              <path d={graftPath} className="surgery-graft-underlay-outline" />
            </g>
          );
        })}
        {perforations.map((layer) => {
          const smoothPath = normalizedSmoothPath(layer.geometry);
          const repaired = phase === "procedure" && grafts.some((graft) => graft.targetLayerId === layer.id);
          if (smoothPath) return <path key={`rim-${layer.id}`} d={smoothPath} className={cn("surgery-perforation-rim", repaired && "is-repaired")} />;
          const center = layer.region === "anterior" ? 552 : layer.region === "posterior" ? 410 : 480;
          const radius = layer.region === "subtotal" ? 110 : 43;
          return <circle key={`rim-${layer.id}`} cx={center} cy="278" r={radius + 5} className={cn("surgery-perforation-rim", repaired && "is-repaired")} />;
        })}
        <path d="M322 176 C364 125 426 103 492 110 C555 116 607 143 638 183" className="surgery-pars-flaccida" data-anatomy-id="pars-flaccida" />
        <path d="M414 153 Q454 176 478 218 M548 154 Q512 179 489 218" className="surgery-malleolar-folds" />
        <path d="M419 144 C442 118 479 110 508 127 C525 138 527 155 514 170 C491 197 474 226 482 270 C462 241 447 202 430 173 C421 160 416 151 419 144 Z" className="surgery-malleus-handle" data-anatomy-id="malleus-handle" />
        <path d="M431 144 C456 128 484 129 505 142" className="surgery-malleus-highlight" />
        <ellipse cx="482" cy="270" rx="10" ry="8" className="surgery-umbo" data-anatomy-id="umbo" />
        {grafts.filter((layer) => layer.technique === "lateral" || layer.technique === "butterfly").map(renderGraft)}
      </g>
      <path d={tmDiscPath} className="surgery-tm-annulus" data-anatomy-id="annulus" />
      <path d="M288 168 C326 83 426 39 539 63 C625 81 683 133 704 201 C650 158 599 145 542 145 C446 145 359 161 288 168 Z" className="surgery-canal-overhang" data-anatomy-id="superior-canal-overhang" />
      {tubes.filter((layer) => layer.action === "myringotomy_only").map((layer) => {
        const position = tubePosition(layer.quadrant);
        if (!position) return null;
        return (
          <path
            key={layer.id}
            d={`M${position.x - 30} ${position.y + 8} Q${position.x} ${position.y - 8} ${position.x + 30} ${position.y + 8}`}
            className="surgery-myringotomy"
            data-layer-id={layer.id}
          />
        );
      })}
      {tubes.filter((layer) => layer.action === "tube_placed").map((layer) => {
        const position = tubePosition(layer.quadrant);
        if (!position) return null;
        return (
          <g key={layer.id} transform={`translate(${position.x} ${position.y}) rotate(-18)`} data-layer-id={layer.id} className="surgery-tube-device">
            {layer.tubeType === "t_tube" ? (
              <>
                <path d="M0 -27 V19 M-29 18 H29" className="surgery-device-shadow surgery-t-tube-shadow" />
                <rect x="-9" y="-29" width="18" height="50" rx="7" className="surgery-device-fill" />
                <path d="M-8 17 H-29 M8 17 H29" className="surgery-tube-wing" />
              </>
            ) : layer.tubeType === "short_term" ? (
              <>
                <ellipse cx="0" cy="0" rx="31" ry="18" className="surgery-device-shadow" />
                <ellipse cx="0" cy="0" rx="28" ry="16" className="surgery-device-fill" />
                <ellipse cx="0" cy="0" rx="14" ry="9" className="surgery-device-inner-lip" />
              </>
            ) : (
              <>
                <ellipse cx="0" cy="0" rx="22" ry="13" className="surgery-device-shadow" />
                <rect x="-17" y="-10" width="34" height="20" rx="8" className="surgery-device-fill surgery-device-untyped" />
              </>
            )}
            <ellipse cx="-5" cy="-6" rx="8" ry="3" className="surgery-device-highlight" />
            <circle cx="0" cy="0" r="6" className="surgery-device-opening" />
          </g>
        );
      })}
    </g>
  );
}

function StapesSurgicalView({
  layers,
  contextLayers,
}: {
  layers: SurgeryLayer[];
  contextLayers: SurgeryLayer[];
}) {
  const allLayers = uniqueLayers([...contextLayers, ...layers]);
  const footplateState = allLayers.find(
    (layer): layer is Extract<SurgeryLayer, { kind: "ossicle_state" }> =>
      layer.kind === "ossicle_state" && layer.structure === "stapes_footplate",
  )?.state;
  const procedures = layers.filter(
    (layer): layer is Extract<SurgeryLayer, { kind: "stapes_procedure" }> =>
      layer.kind === "stapes_procedure" && layerHasVisualShape(layer, "transcanal_middle_ear"),
  );
  const completed = procedures.length > 0;

  return (
    <g className="atlas-stapes-view">
      <ellipse cx="500" cy="260" rx="438" ry="252" className="surgery-field-glow" />
      <path d="M65 422 C119 229 259 84 442 51 C616 20 815 93 891 241 C916 291 908 361 862 413 C782 476 641 493 487 468 C317 441 176 475 65 422 Z" className="surgery-middle-ear-bone" data-anatomy-id="stapes-surgical-field" />
      <path d="M118 394 C163 238 288 118 445 90 C601 62 755 120 824 233 C859 289 844 351 794 391 C722 447 593 450 478 422 C344 390 226 435 118 394 Z" className="surgery-middle-ear-cavity" data-anatomy-id="tympanic-cavity" />
      <path d="M146 369 C202 215 310 133 445 112 C572 91 708 126 790 225" className="surgery-cavity-line" />
      <path d="M340 108 C402 74 473 66 535 82 C593 96 642 125 676 167" className="surgery-facial-nerve-canal" data-anatomy-id="facial-nerve-canal" />
      <path d="M357 116 C413 88 472 83 527 96 C579 108 619 132 649 166" className="surgery-facial-nerve" data-anatomy-id="facial-nerve" />
      <path d="M694 207 C768 224 812 292 783 350 C753 410 655 433 573 399 C505 371 484 304 526 255 C566 208 632 192 694 207 Z" className="surgery-promontory" data-anatomy-id="cochlear-promontory" />
      <path d="M710 243 C741 258 758 284 753 312 M696 260 C719 273 730 292 728 316 M675 279 C694 291 703 305 702 325" className="surgery-promontory-vessels" />
      <ellipse cx="625" cy="322" rx="118" ry="42" transform="rotate(-4 625 322)" className="surgery-oval-window-niche is-stapes-closeup" data-anatomy-id="oval-window-niche" />
      <ellipse cx="626" cy="323" rx="98" ry="22" transform="rotate(-4 626 323)" className={cn("surgery-footplate is-stapes-closeup", footplateState ? "is-documented" : "is-reference", footplateState === "fixed" && "is-fixed")} data-anatomy-id="stapes-footplate" />
      <path d="M743 371 C766 346 807 346 826 373 C846 402 826 437 792 439 C759 441 729 407 743 371 Z" className="surgery-round-window-recess" data-anatomy-id="round-window-niche" />
      <path d="M755 382 C773 365 801 368 811 388 C821 407 804 424 784 420 C765 417 751 399 755 382 Z" className="surgery-round-window-membrane" data-anatomy-id="round-window-membrane" />
      <path d="M504 283 C474 258 449 254 426 267 C405 279 395 302 401 327 C422 312 442 304 464 305" className="surgery-pyramidal-eminence" data-anatomy-id="pyramidal-eminence" />
      <path d="M463 305 C497 307 523 313 548 323" className="surgery-stapedius-tendon" data-anatomy-id="stapedius-tendon" />
      <path d="M384 92 C405 79 435 84 448 105 C456 120 452 139 438 151 C449 176 468 199 486 222 C499 239 509 254 512 273 C495 271 478 257 463 239 C440 212 422 185 410 158 C383 154 369 123 384 92 Z" className="surgery-ossicle is-documented" data-anatomy-id="incus-long-process" />
      <path d="M391 97 C407 91 425 96 435 110 M420 155 C437 194 470 237 503 266" className="surgery-ossicle-highlight" />
      {!completed ? (
        <g className="surgery-stapes-anatomy" data-anatomy-id="stapes-superstructure">
          <ellipse cx="548" cy="277" rx="17" ry="12" className="surgery-ossicle-node is-documented" />
          <path d="M540 286 C520 298 517 316 530 327 M556 286 C576 298 583 312 579 326" className="surgery-ossicle is-documented" />
          <path d="M530 316 C545 325 564 327 579 318" className="surgery-stapes-obturator" />
        </g>
      ) : null}
      {procedures.map((layer) => {
        const attachment = layer.pistonAttachment === "malleus" ? { x: 425, y: 176 } : { x: 504, y: 265 };
        const fenestra = { x: 626, y: 323 };
        return (
          <g key={layer.id} data-layer-id={layer.id} className="surgery-stapes-reconstruction is-closeup">
            {layer.technique === "stapedectomy" ? (
              <g>
                <ellipse cx={fenestra.x} cy={fenestra.y} rx="62" ry="18" transform={`rotate(-4 ${fenestra.x} ${fenestra.y})`} className="surgery-fenestra is-stapedectomy" />
                <ellipse cx={fenestra.x} cy={fenestra.y} rx="73" ry="27" transform={`rotate(-4 ${fenestra.x} ${fenestra.y})`} className="surgery-stapedectomy-seal" />
                <path d="M568 322 C598 306 655 303 686 319 C659 337 601 341 568 322 Z" className="surgery-stapes-seal-fibers" />
              </g>
            ) : (
              <circle cx={fenestra.x} cy={fenestra.y} r={layer.fenestra === "large" ? 9 : 6} className="surgery-fenestra" />
            )}
            <path d={`M${attachment.x} ${attachment.y} C${attachment.x + 36} ${attachment.y + 10} ${fenestra.x - 34} ${fenestra.y - 24} ${fenestra.x} ${fenestra.y}`} className="surgery-piston-shadow" />
            <path d={`M${attachment.x} ${attachment.y} C${attachment.x + 36} ${attachment.y + 10} ${fenestra.x - 34} ${fenestra.y - 24} ${fenestra.x} ${fenestra.y}`} className="surgery-piston" />
            <ellipse cx={attachment.x} cy={attachment.y} rx="18" ry="9" transform={`rotate(28 ${attachment.x} ${attachment.y})`} className="surgery-piston-loop" />
            <path d={`M${attachment.x - 6} ${attachment.y - 6} Q${attachment.x + 2} ${attachment.y - 13} ${attachment.x + 10} ${attachment.y - 4}`} className="surgery-prosthesis-highlight" />
            <circle cx={fenestra.x} cy={fenestra.y} r="3.5" className="surgery-piston-tip" />
          </g>
        );
      })}
      <path d="M111 126 C177 88 262 79 331 104 C280 120 241 151 215 195 C179 257 164 329 174 400" className="surgery-scutum-foreground" data-anatomy-id="scutum" />
    </g>
  );
}

function MiddleEarView({ layers, contextLayers }: { layers: SurgeryLayer[]; contextLayers: SurgeryLayer[] }) {
  const states = uniqueLayers([...contextLayers, ...layers]).filter(
    (layer): layer is Extract<SurgeryLayer, { kind: "ossicle_state" }> => layer.kind === "ossicle_state",
  );
  const stateFor = (structure: string) => states.find((layer) => layer.structure === structure)?.state;
  const anatomyClass = (state?: string) =>
    cn(
      "surgery-ossicle",
      state ? "is-documented" : "is-reference",
      state && ["eroded", "long_process_eroded", "body_eroded", "discontinuous", "fixed"].includes(state)
        ? "is-abnormal"
        : undefined,
    );
  const reconstructions = layers.filter(
    (layer): layer is Extract<SurgeryLayer, { kind: "ossicular_reconstruction" }> => layer.kind === "ossicular_reconstruction",
  );
  const stapesProcedures = layers.filter(
    (layer): layer is Extract<SurgeryLayer, { kind: "stapes_procedure" }> => layer.kind === "stapes_procedure",
  );
  const protectionGrafts = layers.filter(
    (layer): layer is Extract<SurgeryLayer, { kind: "tm_graft" }> =>
      layer.kind === "tm_graft" &&
      layer.purpose === "prosthesis_protection" &&
      layer.material !== "none" &&
      layer.material !== "not_documented" &&
      Boolean(layer.targetLayerId),
  );
  const malleusState = stateFor("malleus");
  const incusState = stateFor("incus");
  const jointState = stateFor("incudostapedial_joint");
  const stapesState = stateFor("stapes_superstructure");
  const footplateState = stateFor("stapes_footplate");
  const completedStapesReconstruction = stapesProcedures.some((layer) =>
    layerHasVisualShape(layer, "transcanal_middle_ear"),
  );
  const stapesFocused = stapesProcedures.length > 0 || states.some((layer) => layer.structure === "stapes_footplate");

  if (stapesFocused) {
    return <StapesSurgicalView layers={layers} contextLayers={contextLayers} />;
  }

  return (
    <g className="atlas-middle-ear-view">
      <ellipse cx="510" cy="260" rx="414" ry="246" className="surgery-field-glow" />
      <path d="M86 433 C162 444 246 442 327 425 C428 404 520 354 601 282 C665 225 719 148 779 68 C833 101 873 164 882 244 C893 343 828 431 725 462 C583 505 375 468 212 468 C151 468 107 455 86 433 Z" className="surgery-middle-ear-bone" data-anatomy-id="middle-ear-cutaway" />
      <path d="M142 399 C250 430 354 407 451 363 C548 319 622 245 691 166 C733 118 782 104 818 142 C859 186 852 275 805 337 C732 434 564 447 418 419 C297 396 213 417 142 399 Z" className="surgery-middle-ear-cavity" data-anatomy-id="tympanic-cavity" />
      <path d="M112 420 C230 438 338 424 440 380 C575 322 680 214 770 92" className="surgery-cavity-line" />
      <ellipse cx="228" cy="282" rx="92" ry="158" className="surgery-tm-side-shadow" />
      <ellipse cx="228" cy="282" rx="86" ry="152" className="surgery-tm-side" data-anatomy-id="tympanic-membrane-medial" />
      <path d="M221 137 C232 196 239 281 229 430" className="surgery-tm-side-highlight" />
      <path d="M492 224 C548 177 647 172 712 221 C768 264 763 341 707 386 C650 432 555 428 497 382 C447 342 444 265 492 224 Z" className="surgery-promontory" data-anatomy-id="cochlear-promontory" />
      <path d="M514 253 C549 232 583 236 608 258 M495 302 C540 287 581 298 612 327 M531 366 C574 349 617 355 651 379" className="surgery-promontory-vessels" />
      <path d="M276 115 C333 82 419 75 487 101 C449 108 419 124 397 148 C355 157 314 149 276 115 Z" className="surgery-scutum-foreground" data-anatomy-id="scutum" />
      <path d="M590 330 C606 313 631 310 650 326 C630 333 613 345 602 360 C592 354 587 343 590 330 Z" className="surgery-pyramidal-eminence" data-anatomy-id="pyramidal-eminence" />
      <path d="M526 397 C548 372 582 366 609 381 C580 395 560 414 548 435" className="surgery-sinus-tympani" data-anatomy-id="sinus-tympani" />
      <path d="M690 137 C748 109 812 128 831 181 C851 238 811 282 754 273 C716 267 682 236 681 194 C680 170 683 151 690 137 Z" className="surgery-vestibule" />
      <path d="M751 270 C820 241 874 291 856 350 C839 407 758 415 719 365 C690 327 710 288 751 270 Z" className="surgery-cochlea-reference" />
      <path d="M770 294 C814 278 837 309 823 338 C807 371 755 367 746 333 C739 309 752 296 770 294 Z M770 312 C786 305 797 316 791 328" className="surgery-cochlea-reference-spiral" />
      <path d="M610 126 C654 96 707 94 747 118" className="surgery-facial-nerve-canal" />
      <path d="M607 139 C650 111 696 111 731 129" className="surgery-facial-nerve" />
      <ellipse cx="650" cy="374" rx="52" ry="24" className="surgery-oval-window-niche" />
      <ellipse cx="706" cy="426" rx="31" ry="21" className="surgery-round-window-niche" />
      <path d="M364 368 C432 410 502 439 596 457" className="surgery-eustachian-opening" />
      <path d="M305 169 C352 124 421 105 485 122" className="surgery-chorda-tympani" />
      <path d="M271 251 C300 235 322 219 343 196" className="surgery-tensor-tendon" />
      {malleusState === "absent" ? (
        <g className="surgery-absence-symbol">
          <path d="M306 139 L333 169 M355 267 L373 305" className="surgery-absent-gap" />
        </g>
      ) : (
        <g className="surgery-malleus-anatomy">
          <path d="M302 131 C318 111 347 114 359 133 C366 147 359 163 343 170 C350 193 364 218 374 245 C385 276 382 306 370 322 C359 311 355 285 350 259 C344 227 331 198 320 174 C298 170 287 148 302 131 Z" className={anatomyClass(malleusState)} />
          <path d="M307 132 C322 122 339 123 349 135 M331 173 C344 211 360 256 365 302" className="surgery-ossicle-highlight" />
          <circle cx="322" cy="143" r="18" className={cn("surgery-ossicle-node", malleusState ? "is-documented" : "is-reference")} />
        </g>
      )}
      {incusState === "absent" ? (
        <g className="surgery-absence-symbol">
          <path d="M382 160 L421 177 M575 286 L626 305" className="surgery-absent-gap" />
        </g>
      ) : incusState === "long_process_eroded" ? (
        <g className="surgery-incus-anatomy">
          <path d="M382 150 C406 134 437 145 443 169 C465 179 487 198 503 222 C511 234 507 246 497 251 C482 225 461 204 437 194 C419 207 392 201 380 181 C373 169 374 158 382 150 Z" className={anatomyClass("intact")} />
          <path d="M519 266 C548 280 577 292 626 305" className="surgery-absent-gap" />
          <circle cx="404" cy="169" r="22" className="surgery-ossicle-node is-documented" />
        </g>
      ) : (
        <g className="surgery-incus-anatomy">
          <path d="M382 150 C406 134 437 145 443 169 C470 179 494 203 512 235 C530 267 558 294 632 306 C632 318 617 325 603 320 C558 304 527 283 503 252 C484 226 465 204 437 194 C419 207 392 201 380 181 C373 169 374 158 382 150 Z" className={anatomyClass(incusState)} />
          <path d="M388 153 C404 146 422 151 430 165 M444 179 C477 199 500 230 519 260 C542 286 575 301 615 309" className="surgery-ossicle-highlight" />
          <circle cx="404" cy="169" r="22" className={cn("surgery-ossicle-node", incusState ? "is-documented" : "is-reference")} />
        </g>
      )}
      {malleusState !== "absent" && incusState !== "absent" ? (
        <ellipse
          cx="368"
          cy="153"
          rx="19"
          ry="10"
          transform="rotate(11 368 153)"
          className={cn("surgery-malleoincudal-joint", malleusState || incusState ? "is-documented" : "is-reference")}
        />
      ) : null}
      {stapesState === "absent" || completedStapesReconstruction ? (
        <g className="surgery-absence-symbol">
          {stapesState === "absent" ? (
            <path d="M625 312 H673" className="surgery-absent-gap" />
          ) : null}
        </g>
      ) : (
        <g className="surgery-stapes-anatomy">
          <ellipse cx="650" cy="310" rx="16" ry="12" className={cn("surgery-ossicle-node", stapesState ? "is-documented" : "is-reference")} />
          <path d="M642 319 C628 332 620 349 618 369 M658 319 C673 333 681 350 682 369" className={anatomyClass(stapesState)} />
          <path d="M626 352 C642 360 660 360 675 352" className="surgery-stapes-obturator" />
        </g>
      )}
      {footplateState === "absent" ? (
        <path d="M612 374 H635 M665 374 H688" className="surgery-absent-gap" />
      ) : (
        <ellipse
          cx="650"
          cy="374"
          rx="42"
          ry="11"
          className={cn(
            "surgery-footplate",
            footplateState ? "is-documented" : "is-reference",
            footplateState === "fixed" && "is-fixed",
          )}
        />
      )}
      {jointState === "discontinuous" ? (
        <g>
          <path d="M578 304 L626 309" className="surgery-finding-gap" />
        </g>
      ) : null}
      {reconstructions.filter((layer) => layer.method !== "none" && layer.method !== "not_documented").map((layer) => {
        const start = endpointPosition[layer.lateralEndpoint];
        const end = endpointPosition[layer.medialEndpoint];
        if (!start || !end) return null;
        if (layer.method === "bone_cement_bridge") {
          return (
            <g key={layer.id} data-layer-id={layer.id} className="surgery-cement-reconstruction">
              <path d={`M${start.x} ${start.y} Q${(start.x + end.x) / 2} ${Math.min(start.y, end.y) - 22} ${end.x} ${end.y}`} className="surgery-cement-shadow" />
              <path d={`M${start.x} ${start.y} Q${(start.x + end.x) / 2} ${Math.min(start.y, end.y) - 22} ${end.x} ${end.y}`} className="surgery-cement-bridge" />
              <path d={`M${start.x + 3} ${start.y - 4} Q${(start.x + end.x) / 2} ${Math.min(start.y, end.y) - 29} ${end.x - 3} ${end.y - 4}`} className="surgery-cement-highlight" />
            </g>
          );
        }
        if (layer.method === "cartilage_interposition") {
          const cx = (start.x + end.x) / 2;
          const cy = (start.y + end.y) / 2;
          const angle = Math.atan2(end.y - start.y, end.x - start.x) * (180 / Math.PI);
          return (
            <g key={layer.id} data-layer-id={layer.id} transform={`rotate(${angle} ${cx} ${cy})`}>
              <ellipse cx={cx} cy={cy} rx="46" ry="23" className="surgery-cartilage-interposition" />
              <ellipse cx={cx} cy={cy} rx="40" ry="18" className="surgery-cartilage-texture" />
              <path d={`M${cx - 28} ${cy - 8} Q${cx} ${cy - 17} ${cx + 28} ${cy - 8}`} className="surgery-cartilage-highlight" />
            </g>
          );
        }
        if (layer.method === "autologous_incus") {
          return (
            <g key={layer.id} data-layer-id={layer.id}>
              <path d={`M${start.x} ${start.y} Q${(start.x + end.x) / 2 + 34} ${(start.y + end.y) / 2 - 32} ${end.x} ${end.y}`} className="surgery-autologous-reconstruction" />
              <path d={`M${start.x + 3} ${start.y - 3} Q${(start.x + end.x) / 2 + 32} ${(start.y + end.y) / 2 - 39} ${end.x - 2} ${end.y - 4}`} className="surgery-ossicle-highlight is-reconstruction" />
            </g>
          );
        }
        const angle = Math.atan2(end.y - start.y, end.x - start.x) * (180 / Math.PI);
        const shaftStart = { x: start.x + 20, y: start.y };
        const shaftEnd = { x: end.x - (layer.method === "torp" ? 16 : 12), y: end.y };
        return (
          <g key={layer.id} data-layer-id={layer.id} className={layer.method === "torp" ? "is-torp" : "is-porp"}>
            <path d={`M${shaftStart.x} ${shaftStart.y} L${shaftEnd.x} ${shaftEnd.y}`} className="surgery-prosthesis-shadow" />
            <path d={`M${shaftStart.x} ${shaftStart.y} L${shaftEnd.x} ${shaftEnd.y}`} className="surgery-prosthesis-line" />
            <g transform={`rotate(${angle} ${start.x} ${start.y})`}>
              <path d={`M${start.x - 24} ${start.y - 11} C${start.x - 5} ${start.y - 17} ${start.x + 19} ${start.y - 14} ${start.x + 27} ${start.y - 3} C${start.x + 17} ${start.y + 10} ${start.x - 6} ${start.y + 15} ${start.x - 26} ${start.y + 8} Z`} className="surgery-prosthesis-head" />
              <path d={`M${start.x - 15} ${start.y - 6} Q${start.x + 1} ${start.y - 12} ${start.x + 16} ${start.y - 5}`} className="surgery-prosthesis-highlight" />
            </g>
            {layer.method === "porp" ? (
              <g className="surgery-prosthesis-cup-assembly" transform={`rotate(${angle} ${end.x} ${end.y})`}>
                <path d={`M${end.x - 17} ${end.y - 10} Q${end.x + 2} ${end.y - 19} ${end.x + 18} ${end.y - 5} L${end.x + 13} ${end.y + 7} Q${end.x} ${end.y - 1} ${end.x - 13} ${end.y + 7} Z`} className="surgery-prosthesis-cup" />
                <path d={`M${end.x - 10} ${end.y - 5} Q${end.x} ${end.y - 11} ${end.x + 10} ${end.y - 4}`} className="surgery-prosthesis-cup-rim" />
              </g>
            ) : (
              <g transform={`rotate(${angle} ${end.x} ${end.y})`}>
                <ellipse cx={end.x} cy={end.y} rx="22" ry="9" className="surgery-prosthesis-foot" />
                <ellipse cx={end.x - 2} cy={end.y - 2} rx="13" ry="3" className="surgery-prosthesis-highlight-fill" />
              </g>
            )}
          </g>
        );
      })}
      {protectionGrafts.map((layer) => {
        const target = reconstructions.find((reconstruction) => reconstruction.id === layer.targetLayerId);
        if (!target) return null;
        const start = endpointPosition[target.lateralEndpoint];
        const end = endpointPosition[target.medialEndpoint];
        if (!start || !end) return null;
        const cx = start.x + (end.x - start.x) * 0.12;
        const cy = start.y + (end.y - start.y) * 0.12 - 17;
        return (
          <g key={layer.id}>
            <ellipse cx={cx} cy={cy} rx="42" ry="15" className="surgery-protection-cap" data-layer-id={layer.id} />
            <ellipse cx={cx} cy={cy} rx="36" ry="11" className="surgery-protection-cap-texture" />
            <path d={`M${cx - 25} ${cy - 5} Q${cx} ${cy - 12} ${cx + 25} ${cy - 5}`} className="surgery-cartilage-highlight" />
          </g>
        );
      })}
      {stapesProcedures.filter((layer) => layerHasVisualShape(layer, "transcanal_middle_ear")).map((layer) => {
        const start = layer.pistonAttachment === "malleus" ? endpointPosition.malleus : endpointPosition.incus_long_process;
        const end = endpointPosition.stapes_footplate;
        return (
          <g key={layer.id} data-layer-id={layer.id} className="surgery-stapes-reconstruction">
            {layer.technique === "stapedectomy" ? (
              <g>
                <ellipse cx={end.x} cy={end.y} rx="24" ry="14" className="surgery-fenestra is-stapedectomy" />
                <ellipse cx={end.x} cy={end.y} rx="34" ry="18" className="surgery-stapedectomy-seal" />
              </g>
            ) : (
              <circle cx={end.x} cy={end.y} r={layer.fenestra === "large" ? 9 : 6} className="surgery-fenestra" />
            )}
            <path d={`M${start.x} ${start.y} L${end.x} ${end.y}`} className="surgery-piston-shadow" />
            <path d={`M${start.x} ${start.y} L${end.x} ${end.y}`} className="surgery-piston" />
            <ellipse cx={start.x} cy={start.y} rx="17" ry="9" transform={`rotate(18 ${start.x} ${start.y})`} className="surgery-piston-loop" />
            <path d={`M${start.x - 7} ${start.y - 4} Q${start.x} ${start.y - 11} ${start.x + 8} ${start.y - 4}`} className="surgery-prosthesis-highlight" />
            <circle cx={end.x} cy={end.y} r="4" className="surgery-piston-tip" />
          </g>
        );
      })}
      <path d="M142 126 C183 108 229 111 261 139 C286 161 298 201 296 260 C294 328 279 388 248 433 C205 445 166 436 139 408 C175 327 184 226 142 126 Z" className="surgery-tm-side-foreground" data-anatomy-id="tympanic-membrane-medial-surface" />
    </g>
  );
}

function MastoidView({ layers }: { layers: SurgeryLayer[] }) {
  const cholesteatoma = layers.filter(
    (layer): layer is Extract<SurgeryLayer, { kind: "cholesteatoma_extent" }> => layer.kind === "cholesteatoma_extent",
  );
  const mastoid = layers.filter(
    (layer): layer is Extract<SurgeryLayer, { kind: "mastoid_technique" }> => layer.kind === "mastoid_technique",
  );
  const regionPosition: Record<string, { x: number; y: number }> = {
    epitympanum: { x: 475, y: 165 },
    mesotympanum: { x: 480, y: 270 },
    hypotympanum: { x: 475, y: 370 },
    facial_recess: { x: 590, y: 285 },
    sinus_tympani: { x: 550, y: 350 },
    mastoid: { x: 725, y: 220 },
    external_auditory_canal: { x: 300, y: 285 },
  };
  const cellCenters = [
    [578, 132], [618, 126], [661, 130], [706, 137], [751, 147], [794, 164], [828, 187],
    [560, 169], [602, 166], [647, 171], [692, 181], [739, 192], [784, 207], [823, 228],
    [551, 211], [592, 210], [635, 216], [679, 229], [724, 239], [771, 252], [817, 272],
    [555, 252], [596, 256], [638, 265], [681, 279], [726, 290], [771, 305], [811, 325],
    [570, 294], [612, 302], [655, 313], [700, 326], [745, 340], [786, 359],
    [590, 338], [632, 349], [675, 361], [718, 377], [759, 393],
  ] as const;
  const mastoidCells = cellCenters.map(([x, y], index) => ({
    x,
    y,
    rx: 17 + (index % 4) * 2,
    ry: 13 + ((index * 3) % 4) * 1.5,
  }));
  const mastoidCellPath = (
    cell: (typeof mastoidCells)[number],
    index: number,
    scale = 1,
  ) => {
    const rx = cell.rx * scale;
    const ry = cell.ry * scale;
    const skew = ((index % 3) - 1) * rx * 0.12;
    return [
      `M${cell.x - rx} ${cell.y + skew * 0.16}`,
      `C${cell.x - rx * 0.86} ${cell.y - ry * 0.7} ${cell.x - rx * 0.22} ${cell.y - ry * 1.04} ${cell.x + skew} ${cell.y - ry}`,
      `C${cell.x + rx * 0.68} ${cell.y - ry * 0.9} ${cell.x + rx * 1.03} ${cell.y - ry * 0.22} ${cell.x + rx} ${cell.y + ry * 0.12}`,
      `C${cell.x + rx * 0.86} ${cell.y + ry * 0.78} ${cell.x + rx * 0.18} ${cell.y + ry * 1.05} ${cell.x - skew * 0.4} ${cell.y + ry}`,
      `C${cell.x - rx * 0.7} ${cell.y + ry * 0.88} ${cell.x - rx * 1.05} ${cell.y + ry * 0.3} ${cell.x - rx} ${cell.y + skew * 0.16} Z`,
    ].join(" ");
  };
  const technique = mastoid.find((layer) => layer.technique !== "not_documented")?.technique;
  const canalWallDown = technique === "canal_wall_down" || technique === "canal_wall_reconstruction";
  const subtotalPetrosectomy = technique === "subtotal_petrosectomy";
  const showNativeCanalWall = !canalWallDown && !subtotalPetrosectomy;
  const hasEpitympanicToMastoidDisease = cholesteatoma.some(
    (layer) => layer.regions.includes("epitympanum") && layer.regions.includes("mastoid"),
  );
  return (
    <g className="atlas-mastoid-view">
      <ellipse cx="500" cy="260" rx="440" ry="252" className="surgery-field-glow" />
      <path d="M74 94 C239 31 487 45 683 70 C809 86 891 148 908 241 C929 359 826 454 668 475 C501 497 282 466 125 422 C65 405 43 337 50 250 C56 184 58 129 74 94 Z" className="surgery-temporal-bone" data-anatomy-id="temporal-bone-cutaway" />
      <path d="M74 94 C239 31 487 45 683 70 C809 86 891 148 908 241 C929 359 826 454 668 475 C501 497 282 466 125 422 C65 405 43 337 50 250 C56 184 58 129 74 94 Z" className="surgery-temporal-bone-texture" />
      <path d="M88 248 C182 218 288 220 391 252 L390 332 C280 345 177 345 90 319 C67 303 67 267 88 248 Z" className="surgery-canal-lumen-side" data-anatomy-id="external-auditory-canal" />
      <path d="M92 232 C190 196 302 202 396 241" className="surgery-canal-line" />
      <path d="M93 332 C193 366 303 354 395 335" className="surgery-canal-line is-lower" />
      {!subtotalPetrosectomy ? <path d="M394 176 Q366 280 397 386" className="surgery-tm-side-line" data-anatomy-id="tympanic-membrane" /> : null}
      <path d="M421 124 C548 81 761 92 850 201 C904 267 879 363 801 414 C713 472 546 448 445 385 C398 355 387 302 402 244 C414 197 415 153 421 124 Z" className="surgery-mastoid-shell" data-anatomy-id="mastoid-cortex-cut" />
      {mastoidCells.map((cell, index) => (
        <g key={index} data-anatomy-id={`mastoid-air-cell-${index + 1}`}>
          <path d={mastoidCellPath(cell, index)} className={cn("surgery-mastoid-cell", index % 3 === 0 ? "is-deep" : index % 3 === 1 ? "is-mid" : "is-superficial")} />
          <path d={mastoidCellPath(cell, index, 0.58)} className="surgery-mastoid-cell-highlight" />
        </g>
      ))}
      <path d="M515 178 C548 148 597 144 629 168 C652 185 648 219 624 238 C596 260 548 252 521 223 C509 210 505 192 515 178 Z" className="surgery-antrum" data-anatomy-id="mastoid-antrum" />
      <path d="M474 202 C501 194 527 196 549 211 C538 229 520 240 495 242" className="surgery-aditus" data-anatomy-id="aditus-ad-antrum" />
      <path d="M441 143 C548 103 728 108 824 191" className="surgery-tegmen" data-anatomy-id="tegmen-mastoideum" />
      <path d="M838 178 C885 235 875 337 817 392" className="surgery-sigmoid-sinus" data-anatomy-id="sigmoid-sinus" />
      <path d="M814 190 C833 171 850 174 861 196" className="surgery-sinodural-angle" data-anatomy-id="sinodural-angle" />
      <path d="M562 170 C595 196 607 234 600 280 C596 314 601 349 625 385" className="surgery-facial-nerve" data-anatomy-id="facial-nerve-mastoid-segment" />
      <path d="M532 183 C552 151 587 138 614 155 C633 168 630 195 608 208 C583 223 548 211 532 183 Z" className="surgery-lateral-canal" data-anatomy-id="lateral-semicircular-canal" />
      <path d="M511 260 C541 248 571 260 583 286 C594 312 584 337 559 351" className="surgery-facial-recess-boundary" data-anatomy-id="facial-recess" />
      <path d="M486 424 C587 452 709 445 793 403" className="surgery-digastric-ridge" data-anatomy-id="digastric-ridge" />
      {showNativeCanalWall ? <path d="M414 154 C392 215 387 295 409 371" className="surgery-posterior-canal-wall" data-anatomy-id="posterior-canal-wall" /> : null}
      <ellipse cx="523" cy="238" rx="38" ry="29" className="surgery-vestibule-small" data-anatomy-id="vestibule" />
      {!subtotalPetrosectomy ? <><path d="M430 208 C457 188 486 196 495 218 C512 223 533 239 547 261 C556 275 563 293 572 308" className="surgery-ossicle small" data-anatomy-id="ossicular-chain" /><path d="M437 204 C455 196 475 202 483 215" className="surgery-ossicle-highlight is-small" /></> : null}
      {hasEpitympanicToMastoidDisease ? <path d="M473 161 C500 174 515 189 529 205 C566 190 621 186 671 198 C710 207 731 220 749 239" className="surgery-disease-corridor" /> : null}
      {cholesteatoma.flatMap((layer) => layer.regions.map((region, regionIndex) => {
        const point = regionPosition[region];
        return point ? (
          <g key={`${layer.id}-${region}`} transform={`translate(${point.x} ${point.y}) rotate(${regionIndex % 2 === 0 ? -11 : 14}) scale(${region === "mastoid" ? 1.28 : region === "facial_recess" || region === "sinus_tympani" ? 0.72 : 0.94})`} data-layer-id={layer.id} className="surgery-cholesteatoma-group">
            <path d="M-34 -3 C-39 -25 -19 -42 3 -36 C20 -48 43 -28 37 -8 C50 8 37 34 15 34 C-3 47 -29 35 -31 15 C-44 10 -43 2 -34 -3 Z" className="surgery-disease-mass" />
            <path d="M-19 -11 C-6 -27 18 -23 25 -7 C31 9 16 23 -1 20 C-17 17 -24 2 -19 -11 Z" className="surgery-disease-core" />
            <path d="M-14 -8 C-5 -17 10 -16 15 -6 C19 3 11 12 1 12" className="surgery-disease-whorl" />
          </g>
        ) : null;
      }))}
      {mastoid.map((layer) => {
        if (layer.technique === "not_documented") return null;
        if (layer.technique === "mastoid_obliteration") {
          return (
            <g key={layer.id} data-layer-id={layer.id}>
              <path d="M512 138 C628 101 785 128 833 230 C852 298 800 371 705 397 C617 420 548 378 520 332 C494 287 493 200 512 138 Z" className="surgery-mastoid-action is-obliteration" />
              <path d="M530 155 C631 126 758 151 803 232 C818 286 775 339 699 361 C628 381 571 348 547 310 C525 275 518 205 530 155 Z" className="surgery-obliteration-neutral" />
            </g>
          );
        }
        if (layer.technique === "canal_wall_reconstruction") {
          return (
            <g key={layer.id} data-layer-id={layer.id}>
              <path d="M292 220 C374 174 435 143 520 118 C659 78 801 111 851 236 C806 360 637 418 456 369 C390 351 338 325 285 305 C263 279 267 244 292 220 Z" className="surgery-mastoid-action is-canal-wall-down" />
              <path d="M407 163 Q376 273 410 370" className="surgery-canal-wall-reconstruction-shadow" />
              <path d="M412 164 Q384 274 416 367" className="surgery-canal-wall-reconstruction" />
              <path d="M420 180 Q400 274 425 348" className="surgery-canal-wall-highlight" />
            </g>
          );
        }
        const path =
          layer.technique === "canal_wall_down"
            ? "M285 220 C365 177 431 145 520 118 C660 78 803 112 852 238 C808 362 641 420 456 370 C387 351 333 325 281 304 C260 278 263 243 285 220 Z"
            : layer.technique === "subtotal_petrosectomy"
              ? "M122 223 C241 176 353 146 486 105 C654 53 823 96 879 241 C834 389 643 450 419 397 C290 366 184 334 111 300 C86 275 91 242 122 223 Z"
              : "M510 145 C633 98 791 132 835 246 C812 331 715 384 586 372 C527 366 487 333 478 286 C469 237 478 178 510 145 Z";
        return (
          <g key={layer.id} data-layer-id={layer.id}>
            <path d={path} className="surgery-mastoid-action-shadow" />
            <path
              d={path}
              className={cn(
                "surgery-mastoid-action",
                layer.technique === "canal_wall_down" && "is-canal-wall-down",
                layer.technique === "subtotal_petrosectomy" && "is-subtotal-petrosectomy",
              )}
            />
            <path d={layer.technique === "canal_wall_down" ? "M315 230 C436 158 691 103 817 222" : layer.technique === "subtotal_petrosectomy" ? "M154 231 C335 171 677 74 843 220" : "M535 161 C642 126 765 155 804 239"} className="surgery-drilled-cavity-highlight" />
            {layer.technique === "subtotal_petrosectomy" ? <><path d="M110 226 C132 249 135 279 112 301" className="surgery-blind-sac-closure" /><path d="M430 357 C474 378 520 384 565 376" className="surgery-et-closure" /></> : null}
          </g>
        );
      })}
      {mastoid.some((layer) => layer.technique !== "not_documented") ? (
        <g className="surgery-mastoid-landmarks-foreground" aria-hidden="true">
          <path d="M440 143 C544 107 728 110 824 191" className="surgery-tegmen" />
          <path d="M838 178 C885 235 875 337 817 392" className="surgery-sigmoid-sinus" />
          <path d="M562 170 C595 196 607 234 600 280 C596 314 601 349 625 385" className="surgery-facial-nerve" />
          <path d="M532 183 C552 151 587 138 614 155 C633 168 630 195 608 208 C583 223 548 211 532 183 Z" className="surgery-lateral-canal" />
          <path d="M486 424 C587 452 709 445 793 403" className="surgery-digastric-ridge" />
        </g>
      ) : null}
    </g>
  );
}

function CochleaView({ layers, definitionPrefix }: { layers: SurgeryLayer[]; definitionPrefix: string }) {
  const insertions = layers.filter(
    (layer): layer is Extract<SurgeryLayer, { kind: "cochlear_insertion" }> =>
      layer.kind === "cochlear_insertion" && layerHasVisualShape(layer, "cochlea_implant_path"),
  );
  const entryPoint: Record<string, { x: number; y: number }> = {
    round_window: { x: 608, y: 338 },
    extended_round_window: { x: 614, y: 332 },
    cochleostomy: { x: 635, y: 326 },
    mid_turn_cochleostomy: { x: 692, y: 270 },
  };
  const leadPath: Record<string, string> = {
    round_window: "M452 245 C496 259 535 279 568 306 C584 319 597 330 608 338",
    extended_round_window: "M452 245 C498 258 538 277 572 302 C588 314 602 324 614 332",
    cochleostomy: "M452 245 C502 255 548 272 583 294 C602 306 620 318 635 326",
    mid_turn_cochleostomy: "M452 245 C511 246 568 250 619 257 C647 261 672 266 692 270",
  };
  const fullArrayPath: Record<string, string> = {
    round_window: "M608 338 C636 335 662 319 686 301 C716 279 752 280 772 303 C797 332 778 367 744 377 C704 388 667 365 666 333 C664 304 696 283 728 285 C753 286 768 304 763 325 C758 344 735 351 719 341 C707 334 704 321 712 311",
    extended_round_window: "M614 332 C641 328 664 314 687 298 C718 276 755 279 775 304 C798 333 778 369 742 378 C702 387 666 362 667 331 C668 302 699 282 731 285 C757 288 770 307 763 328 C756 347 733 352 717 340 C705 331 705 318 714 309",
    cochleostomy: "M635 326 C656 317 672 308 689 297 C720 276 757 281 775 307 C796 337 774 371 739 378 C700 384 667 359 669 329 C671 301 702 283 732 288 C757 292 769 311 760 332 C752 349 730 352 715 339 C704 330 706 317 715 308",
    mid_turn_cochleostomy: "M692 270 C724 264 759 281 774 309 C790 340 769 371 735 377 C699 384 669 359 671 331 C672 303 700 286 729 290 C752 294 764 312 757 331 C750 348 730 351 716 339 C705 330 706 318 715 309",
  };
  const partialArrayPath: Record<string, string> = {
    round_window: "M608 338 C636 335 662 319 686 301 C716 279 741 279 756 291",
    extended_round_window: "M614 332 C641 328 664 314 687 298 C718 276 744 279 758 292",
    cochleostomy: "M635 326 C656 317 672 308 689 297 C720 276 744 281 758 294",
    mid_turn_cochleostomy: "M692 270 C718 266 744 276 760 294",
  };
  const routeContacts: Record<string, Array<{ x: number; y: number }>> = {
    round_window: [
      { x: 620, y: 336 }, { x: 650, y: 325 }, { x: 686, y: 301 }, { x: 724, y: 284 },
      { x: 758, y: 289 }, { x: 779, y: 317 }, { x: 769, y: 351 }, { x: 739, y: 376 },
      { x: 698, y: 377 }, { x: 668, y: 349 },
    ],
    extended_round_window: [
      { x: 626, y: 329 }, { x: 655, y: 319 }, { x: 688, y: 298 }, { x: 726, y: 282 },
      { x: 760, y: 291 }, { x: 780, y: 320 }, { x: 768, y: 354 }, { x: 737, y: 377 },
      { x: 696, y: 376 }, { x: 668, y: 346 },
    ],
    cochleostomy: [
      { x: 645, y: 322 }, { x: 668, y: 309 }, { x: 691, y: 296 }, { x: 727, y: 282 },
      { x: 760, y: 293 }, { x: 779, y: 323 }, { x: 766, y: 355 }, { x: 734, y: 377 },
      { x: 695, y: 373 }, { x: 669, y: 343 },
    ],
    mid_turn_cochleostomy: [
      { x: 700, y: 269 }, { x: 726, y: 270 }, { x: 748, y: 280 }, { x: 766, y: 299 },
      { x: 779, y: 323 }, { x: 767, y: 354 }, { x: 736, y: 376 }, { x: 699, y: 374 },
      { x: 672, y: 346 }, { x: 671, y: 320 },
    ],
  };
  const scalaMaskId = `${definitionPrefix}-scala-mask`;
  const splitPaths = {
    basal: {
      full: "M621 334 C650 325 674 306 699 291 C725 276 750 284 760 304",
      partial: "M621 334 C646 327 668 313 690 299",
    },
    midTurn: {
      full: "M692 270 C720 263 748 276 763 298",
      partial: "M692 270 C711 265 728 269 741 279",
    },
  } as const;
  const splitContacts = {
    basal: [{x:638,y:330},{x:660,y:318},{x:682,y:304},{x:705,y:287},{x:731,y:280},{x:752,y:291}],
    midTurn: [{x:702,y:268},{x:727,y:270},{x:749,y:282}],
  } as const;
  return (
    <g className="atlas-cochlear-view">
      <defs>
        <mask id={scalaMaskId}>
          <rect width="960" height="520" fill="black" />
          <path d="M608 338 C636 335 662 319 686 301 C716 279 752 280 772 303 C797 332 778 367 744 377 C704 388 667 365 666 333 C664 304 696 283 728 285 C753 286 768 304 763 325 C758 344 735 351 719 341 C707 334 704 321 712 311" fill="none" stroke="white" strokeWidth="34" strokeLinecap="round" />
          <path d="M686 270 C718 259 758 278 776 308 C794 341 769 379 732 382 C693 385 661 356 665 325 C668 296 698 278 728 283" fill="none" stroke="white" strokeWidth="32" strokeLinecap="round" />
        </mask>
      </defs>
      <ellipse cx="500" cy="260" rx="442" ry="252" className="surgery-field-glow" />
      <path d="M58 435 C74 287 136 164 238 95 C302 52 360 63 394 112 C423 153 417 230 389 302 C356 389 269 456 165 469 C116 475 77 462 58 435 Z" className="surgery-skull-outline" data-anatomy-id="postauricular-overview" />
      <path d="M58 435 C74 287 136 164 238 95 C302 52 360 63 394 112 C423 153 417 230 389 302 C356 389 269 456 165 469 C116 475 77 462 58 435 Z" className="surgery-temporal-bone-texture" />
      <path d="M86 420 C97 287 151 180 242 116 C296 78 343 83 371 123" className="surgery-scalp-layer" data-anatomy-id="scalp" />
      <path d="M116 256 C90 229 83 190 102 163 C124 132 167 137 185 170 C204 207 182 255 145 275" className="surgery-pinna" data-anatomy-id="pinna" />
      <path d="M345 219 C375 232 393 253 401 278" className="surgery-mastoid-window" data-anatomy-id="mastoidectomy-access" />
      <rect x="412" y="46" width="500" height="430" rx="30" className="surgery-inset-paper surgery-ci-inset" />
      <path d="M435 112 C514 68 623 73 718 105 C810 136 873 206 885 290 C896 372 842 435 756 451 C649 472 521 438 456 376 C404 327 399 210 435 112 Z" className="surgery-ci-inset-bone" data-anatomy-id="facial-recess-cutaway" />
      <path d="M457 192 C501 151 554 142 597 162 C627 177 638 208 625 238 C608 279 551 292 502 267 C463 247 441 216 457 192 Z" className="surgery-mastoid-window" />
      <path d="M518 148 C542 167 555 200 552 240 C550 268 558 293 577 315" className="surgery-facial-nerve" data-anatomy-id="facial-nerve" />
      <path d="M574 157 C594 181 605 212 604 248" className="surgery-chorda-tympani" data-anatomy-id="chorda-tympani" />
      <path d="M552 239 L604 248 L592 312 Z" className="surgery-facial-recess-window" data-anatomy-id="facial-recess" />
      <path d="M471 243 C500 260 528 274 557 287" className="surgery-canal-lumen-side" data-anatomy-id="posterior-canal-wall" />
      <path d="M514 219 C539 204 566 210 578 233 C588 251 583 270 565 282" className="surgery-ossicle small" data-anatomy-id="incus-short-process" />
      <path d="M585 308 C603 292 629 295 641 313 C654 332 641 351 619 352 C597 352 578 331 585 308 Z" className="surgery-round-window-niche" data-anatomy-id="round-window-niche" />
      <path d="M597 318 C609 307 626 309 633 321 C639 333 629 343 616 341 C604 340 596 330 597 318 Z" className="surgery-round-window-membrane" data-anatomy-id="round-window-membrane" />
      <path d="M626 227 C644 196 683 188 710 210 C730 226 728 253 707 270" className="surgery-semicircular-canal" data-anatomy-id="lateral-semicircular-canal" />
      <path d="M662 189 C681 160 720 160 738 187 C752 211 738 236 713 245" className="surgery-semicircular-canal is-superior" />
      <ellipse cx="674" cy="270" rx="42" ry="34" className="surgery-vestibule" data-anatomy-id="vestibule" />
      <path d="M626 324 C612 287 622 258 650 239" className="surgery-cochlea-basal-bridge" />
      <path d="M620 378 C646 427 717 447 781 424 C842 402 866 341 842 284 C817 226 746 207 690 233 C637 258 611 322 620 378 Z" className="surgery-cochlea-shell" data-anatomy-id="cochlea" />
      <path d="M640 366 C656 405 712 421 759 405 C807 389 831 348 814 307 C796 264 745 247 704 266 C665 284 647 326 656 359 C665 389 704 401 735 389 C765 377 780 350 770 325 C761 302 731 292 710 303 C691 313 684 337 695 353" className="surgery-cochlea-lumen" data-anatomy-id="cochlear-turns" />
      <path d="M642 363 C658 397 707 410 750 396 C794 382 815 345 800 312 C783 275 740 261 706 277 C675 291 661 326 669 355 C677 380 710 389 737 379 C761 369 773 347 765 327 C757 309 734 300 717 309" className="surgery-cochlea-scala" data-anatomy-id="scala-tympani" />
      {insertions.map((layer) => {
        const contacts = routeContacts[layer.route] ?? [];
        const visibleContacts = layer.completion === "partial" ? contacts.slice(0, 4) : contacts;
        const endpoint = visibleContacts.at(-1);
        const entry = entryPoint[layer.route];
        if (!entry) return null;
        return (
          <g key={layer.id} data-layer-id={layer.id} className={`surgery-cochlear-implant is-${layer.route} is-${layer.completion}`}>
            <rect x="181" y="105" width="132" height="94" rx="38" className="surgery-receiver-shadow" />
            <rect x="186" y="100" width="126" height="92" rx="36" className="surgery-receiver-base" />
            <ellipse cx="232" cy="146" rx="32" ry="31" className="surgery-receiver-coil" />
            <ellipse cx="232" cy="146" rx="14" ry="14" className="surgery-receiver-magnet" />
            <path d="M201 122 Q232 105 268 122" className="surgery-receiver-highlight" />
            <rect x="267" y="123" width="34" height="43" rx="11" className="surgery-receiver-electronics" />
            <path d="M306 169 C343 184 363 211 381 245" className="surgery-electrode-overview-lead" />
            <path d="M388 225 L419 184 M388 262 L419 296" className="surgery-scale-transition" />
            {layer.array !== "split" ? (
              <>
                <path d={leadPath[layer.route]} className="surgery-electrode-shadow" />
                <path d={leadPath[layer.route]} className="surgery-electrode-lead" />
                {layer.route === "extended_round_window" ? <path d="M580 303 C597 294 618 292 635 300" className="surgery-round-window-overhang-removed" /> : null}
                {layer.route === "cochleostomy" || layer.route === "mid_turn_cochleostomy" ? <circle cx={entry.x} cy={entry.y} r="8" className="surgery-cochleostomy-opening" /> : null}
                <g mask={`url(#${scalaMaskId})`}>
                  <path d={layer.completion === "partial" ? partialArrayPath[layer.route] : fullArrayPath[layer.route]} className={cn("surgery-electrode-path", layer.completion === "partial" && "is-partial")} />
                  {visibleContacts.map((contact, index) => (
                    <g key={index}>
                      <circle cx={contact.x} cy={contact.y} r="5.3" className="surgery-electrode-contact" />
                      <circle cx={contact.x - 1.2} cy={contact.y - 1.5} r="1.7" className="surgery-electrode-contact-highlight" />
                    </g>
                  ))}
                </g>
                {layer.completion === "partial" && endpoint ? (
                  <g>
                    <circle cx={endpoint.x} cy={endpoint.y} r="9" className="surgery-partial-endpoint" />
                    <path d={`M${endpoint.x + 12} ${endpoint.y - 12} Q${endpoint.x + 21} ${endpoint.y} ${endpoint.x + 12} ${endpoint.y + 12}`} className="surgery-partial-marker" />
                  </g>
                ) : null}
              </>
            ) : (
              <g>
                <circle cx="621" cy="334" r="8" className="surgery-cochleostomy-opening" />
                <circle cx="692" cy="270" r="8" className="surgery-cochleostomy-opening" />
                <path d="M452 245 C479 248 501 254 521 265" className="surgery-electrode-split-trunk" />
                <path d="M521 265 C552 281 584 310 621 334" className="surgery-electrode-lead is-split-array" />
                <path d="M521 265 C574 250 635 255 692 270" className="surgery-electrode-lead is-split-array" />
                <g mask={`url(#${scalaMaskId})`}>
                  <path d={layer.completion === "partial" ? splitPaths.basal.partial : splitPaths.basal.full} className={cn("surgery-electrode-path is-split-array", layer.completion === "partial" && "is-partial")} />
                  <path d={layer.completion === "partial" ? splitPaths.midTurn.partial : splitPaths.midTurn.full} className={cn("surgery-electrode-path is-split-array", layer.completion === "partial" && "is-partial")} />
                  {(layer.completion === "partial" ? splitContacts.basal.slice(0, 3) : splitContacts.basal).map((contact, index) => <circle key={`basal-${index}`} cx={contact.x} cy={contact.y} r="4.7" className="surgery-electrode-contact" />)}
                  {(layer.completion === "partial" ? splitContacts.midTurn.slice(0, 2) : splitContacts.midTurn).map((contact, index) => <circle key={`mid-${index}`} cx={contact.x} cy={contact.y} r="4.7" className="surgery-electrode-contact" />)}
                </g>
                {layer.completion === "partial" ? (
                  <g className="surgery-split-partial-endpoints">
                    <path d="M697 287 Q706 299 695 310" className="surgery-partial-marker" />
                    <path d="M745 267 Q754 279 744 289" className="surgery-partial-marker" />
                  </g>
                ) : null}
              </g>
            )}
            <path d="M86 420 C97 287 151 180 242 116 C296 78 343 83 371 123" className="surgery-scalp-overlay" />
          </g>
        );
      })}
    </g>
  );
}

function PostauricularView({ layers }: { layers: SurgeryLayer[] }) {
  const implants = layers.filter(
    (layer): layer is Extract<SurgeryLayer, { kind: "bone_conduction_implant" }> =>
      layer.kind === "bone_conduction_implant" && layerHasVisualShape(layer, "postauricular_implant"),
  );
  return (
    <g className="atlas-postauricular-view">
      <ellipse cx="500" cy="260" rx="430" ry="252" className="surgery-field-glow" />
      <path d="M174 452 C124 333 153 175 285 82 C427 -18 683 35 790 204 C856 310 809 426 703 469 C543 500 324 484 174 452 Z" className="surgery-head-soft-tissue" data-anatomy-id="postauricular-soft-tissue" />
      <path d="M220 434 C173 325 204 189 317 111 C446 23 661 68 750 221 C801 309 769 405 674 448 C530 475 353 465 220 434 Z" className="surgery-skull-profile" data-anatomy-id="temporal-bone" />
      <path d="M220 434 C173 325 204 189 317 111 C446 23 661 68 750 221 C801 309 769 405 674 448 C530 475 353 465 220 434 Z" className="surgery-temporal-bone-texture" />
      <path d="M190 446 C139 324 174 162 303 73 C445 -25 694 27 799 204" className="surgery-scalp-outer" data-anatomy-id="skin" />
      <path d="M205 440 C158 325 190 181 314 94 C445 3 674 49 774 211" className="surgery-subcutaneous-layer" data-anatomy-id="subcutaneous-tissue" />
      <path d="M348 208 C304 174 259 208 268 270 C277 339 347 378 391 329 C423 293 413 241 369 214 C362 210 355 208 348 208 Z" className="surgery-pinna" />
      <path d="M345 238 C318 218 295 236 300 272 C305 310 340 329 360 307 C374 291 366 264 344 257 C329 252 323 270 337 279" className="surgery-pinna-relief" />
      <path d="M384 318 C412 324 438 320 460 304" className="surgery-postauricular-sulcus" />
      <path d="M540 118 C620 82 706 104 756 167" className="surgery-implant-pocket-guide" />
      {implants.map((layer) => {
        const firstStage = layer.stage === "two_stage_first";
        if (firstStage) {
          return (
            <g key={layer.id} data-layer-id={layer.id} className="surgery-bone-device is-first-stage">
              <ellipse cx="635" cy="208" rx="38" ry="18" className="surgery-bone-bed" />
              <ellipse cx="635" cy="202" rx="32" ry="19" className="surgery-stage-one-interface" />
              <path d="M617 197 Q635 185 653 197" className="surgery-stage-one-highlight" />
              <path d="M548 112 C610 86 687 101 742 158 L734 176 C680 126 616 116 557 137 Z" className="surgery-skin-veil" />
              <path d="M550 128 C618 97 688 112 735 162" className="surgery-intact-skin-line" />
            </g>
          );
        }
        if (layer.coupling === "percutaneous") {
          return (
            <g key={layer.id} data-layer-id={layer.id} className="surgery-bone-device is-percutaneous">
              <ellipse cx="635" cy="209" rx="32" ry="16" className="surgery-bone-bed" />
              <circle cx="635" cy="205" r="25" className="surgery-implant-body" />
              <path d="M619 197 H651 M619 205 H651 M619 213 H651" className="surgery-implant-thread" />
              <rect x="625" y="121" width="20" height="87" rx="7" className="surgery-abutment" />
              <path d="M548 112 C579 99 609 105 625 122 L625 143 C602 122 579 123 557 137 Z M645 122 C675 104 711 121 742 158 L734 176 C705 145 678 139 645 144 Z" className="surgery-skin-veil" />
              <path d="M550 128 C589 111 609 120 625 132 M645 133 C675 116 709 127 735 162" className="surgery-skin-breach" />
              <ellipse cx="635" cy="112" rx="37" ry="18" className="surgery-device-shadow" />
              <ellipse cx="635" cy="108" rx="34" ry="16" className="surgery-device-fill" />
              <ellipse cx="623" cy="103" rx="13" ry="4" className="surgery-device-highlight" />
            </g>
          );
        }
        if (layer.coupling === "active_transcutaneous") {
          return (
            <g key={layer.id} data-layer-id={layer.id} className="surgery-bone-device is-active-transcutaneous">
              <ellipse cx="626" cy="203" rx="60" ry="47" className="surgery-implant-body" />
              <ellipse cx="626" cy="203" rx="41" ry="33" className="surgery-implant-coil" />
              <circle cx="626" cy="203" r="19" className="surgery-implant-magnet" />
              <path d="M674 226 C699 243 716 257 729 276" className="surgery-actuator-lead-shadow" />
              <path d="M674 226 C699 243 716 257 729 276" className="surgery-actuator-lead" />
              <ellipse cx="746" cy="293" rx="41" ry="25" transform="rotate(22 746 293)" className="surgery-active-actuator" />
              <ellipse cx="746" cy="293" rx="18" ry="9" transform="rotate(22 746 293)" className="surgery-active-actuator-core" />
              <circle cx="720" cy="282" r="5" className="surgery-fixation-screw" />
              <circle cx="772" cy="304" r="5" className="surgery-fixation-screw" />
              <path d="M548 112 C610 86 687 101 742 158 L734 177 C680 126 616 116 557 137 Z" className="surgery-skin-veil" />
              <path d="M557 137 C626 112 710 137 766 210 C802 258 801 321 767 355 C720 320 659 300 590 298 C564 246 550 190 557 137 Z" className="surgery-subcutaneous-veil" />
              <path d="M550 128 C620 96 691 112 735 162" className="surgery-intact-skin-line" />
              <ellipse cx="626" cy="113" rx="48" ry="20" className="surgery-external-processor" />
              <ellipse cx="610" cy="107" rx="18" ry="5" className="surgery-device-highlight" />
            </g>
          );
        }
        return (
          <g key={layer.id} data-layer-id={layer.id} className="surgery-bone-device is-passive-transcutaneous">
            <ellipse cx="635" cy="204" rx="52" ry="39" className="surgery-implant-body" />
            <circle cx="635" cy="204" r="29" className="surgery-implant-magnet" />
            <circle cx="635" cy="204" r="12" className="surgery-implant-fixture" />
            <path d="M548 112 C610 86 687 101 742 158 L734 177 C680 126 616 116 557 137 Z" className="surgery-skin-veil" />
            <path d="M557 137 C626 112 710 137 766 210 C786 236 793 273 784 307 C727 285 661 273 590 278 C565 231 552 182 557 137 Z" className="surgery-subcutaneous-veil" />
            <path d="M550 128 C620 96 691 112 735 162" className="surgery-intact-skin-line" />
            <ellipse cx="635" cy="113" rx="50" ry="21" className="surgery-external-processor" />
            <ellipse cx="619" cy="107" rx="18" ry="6" className="surgery-device-highlight" />
            <path d="M635 136 V163" className="surgery-magnetic-coupling" />
          </g>
        );
      })}
    </g>
  );
}

function CanalView({ layers }: { layers: SurgeryLayer[] }) {
  const repairs = layers.filter(
    (layer): layer is Extract<SurgeryLayer, { kind: "canalplasty" }> =>
      layer.kind === "canalplasty" && layerHasVisualShape(layer, "external_auditory_canal"),
  );
  return (
    <g className="atlas-canal-view">
      <ellipse cx="480" cy="260" rx="430" ry="250" className="surgery-field-glow" />
      <path d="M63 105 C207 79 411 93 592 122 C742 146 845 186 885 238 C906 266 895 310 861 342 C798 401 664 426 511 439 C337 453 179 445 75 409 C48 399 35 361 38 309 C42 231 48 151 63 105 Z" className="surgery-canal-bone" data-anatomy-id="bony-ear-canal" />
      <path d="M63 105 C207 79 411 93 592 122 C742 146 845 186 885 238 C906 266 895 310 861 342 C798 401 664 426 511 439 C337 453 179 445 75 409 C48 399 35 361 38 309 C42 231 48 151 63 105 Z" className="surgery-temporal-bone-texture" />
      <path d="M72 183 C225 175 385 201 560 220 C673 232 751 235 810 225 C835 221 852 240 852 268 C852 297 835 317 810 313 C744 302 661 307 557 321 C388 344 226 374 72 367 C45 347 43 207 72 183 Z" className="surgery-canal-lumen" data-anatomy-id="ear-canal-lumen" />
      <path d="M76 171 C240 160 404 191 565 208 C675 220 758 222 817 211" className="surgery-canal-wall upper" />
      <path d="M76 380 C239 390 406 357 566 337 C674 324 756 323 817 332" className="surgery-canal-wall lower" />
      <path d="M83 190 C244 184 402 211 562 228 C673 240 751 241 809 232" className="surgery-canal-skin upper" />
      <path d="M83 360 C243 369 404 338 562 319 C669 306 750 305 809 315" className="surgery-canal-skin lower" />
      <ellipse cx="823" cy="273" rx="34" ry="119" className="surgery-tm-side-shadow" />
      <ellipse cx="819" cy="273" rx="28" ry="114" className="surgery-tm-side" data-anatomy-id="tympanic-membrane" />
      <path d="M814 172 C823 223 825 278 818 375" className="surgery-tm-side-highlight" />
      <path d="M226 103 C287 73 362 69 420 94" className="surgery-tmj-reference" />
      <ellipse cx="320" cy="103" rx="70" ry="32" className="surgery-tmj-condyle" />
      <path d="M580 404 C631 436 690 438 736 415" className="surgery-facial-nerve" />
      <path d="M659 111 C710 92 766 102 800 137" className="surgery-mastoid-cell-cluster" />
      {[{x:688,y:127,rx:20,ry:13},{x:733,y:126,rx:18,ry:12},{x:768,y:149,rx:17,ry:12}].map((cell,index)=><ellipse key={index} cx={cell.x} cy={cell.y} rx={cell.rx} ry={cell.ry} className="surgery-mastoid-cell" />)}
      {repairs.map((layer) => {
        const partial = layer.result === "partial";
        const expandsUpper = ["anterior", "circumferential", "multiple"].includes(layer.region);
        const expandsLower = ["posterior", "circumferential", "multiple"].includes(layer.region);
        const upperLumen = expandsUpper
          ? partial
            ? "M72 168 C229 158 394 184 559 202 C665 214 744 218 804 210"
            : "M72 149 C230 137 398 168 561 188 C671 202 748 205 804 198"
          : "M72 183 C225 175 385 201 560 220 C673 232 751 235 810 225";
        const lowerLumen = expandsLower
          ? partial
            ? "C748 325 667 330 557 344 C390 365 229 393 72 383"
            : "C747 340 665 345 555 360 C388 383 227 410 72 399"
          : "C744 302 661 307 557 321 C388 344 226 374 72 367";
        const expandedLumen = `${upperLumen} C829 204 842 230 842 270 C842 310 828 334 804 ${expandsLower ? (partial ? 325 : 340) : 313} ${lowerLumen} C45 ${expandsLower ? (partial ? 365 : 378) : 347} 43 ${expandsUpper ? (partial ? 188 : 169) : 207} 72 ${expandsUpper ? (partial ? 168 : 149) : 183} Z`;
        const upper = partial
          ? "M172 184 C326 184 456 207 574 220"
          : "M170 199 C330 198 509 225 728 235";
        const lower = partial
          ? "M172 366 C325 366 457 340 574 325"
          : "M170 351 C329 351 510 318 728 307";
        const treatmentClass = cn("surgery-canal-repaired", partial && "is-partial");
        return (
          <g key={layer.id} data-layer-id={layer.id} className={`surgery-canalplasty-result is-${layer.region} ${partial ? "is-partial" : "is-widened"}`}>
            <path d={expandedLumen} className="surgery-canal-expanded-lumen" />
            <path d={expandedLumen} className="surgery-canal-expanded-sheen" />
            {layer.region === "anterior" || layer.region === "circumferential" ? (
              <g>
                <path d={upper} className="surgery-canal-cut-shadow" />
                <path d={upper} className={treatmentClass} />
                <path d={upper} className="surgery-canal-redraped-skin" />
              </g>
            ) : null}
            {layer.region === "posterior" || layer.region === "circumferential" ? (
              <g>
                <path d={lower} className="surgery-canal-cut-shadow" />
                <path d={lower} className={treatmentClass} />
                <path d={lower} className="surgery-canal-redraped-skin" />
              </g>
            ) : null}
            {layer.region === "multiple" ? (
              <>
                <path d="M190 202 C300 203 371 214 445 224" className={treatmentClass} />
                <path d="M475 227 C554 234 624 237 705 235" className={treatmentClass} />
                <path d="M240 347 C340 345 421 330 502 320" className={treatmentClass} />
                <path d="M546 315 C601 309 646 307 705 307" className={treatmentClass} />
                <path d="M190 202 C300 203 371 214 445 224 M475 227 C554 234 624 237 705 235 M240 347 C340 345 421 330 502 320 M546 315 C601 309 646 307 705 307" className="surgery-canal-redraped-skin" />
              </>
            ) : null}
            {partial ? <path d="M548 222 Q589 248 554 278 Q519 299 559 325" className="surgery-canal-residual-contour" /> : null}
          </g>
        );
      })}
      {repairs.length > 0 ? (
        <g className="surgery-canal-tm-foreground" aria-hidden="true">
          <ellipse cx="823" cy="273" rx="31" ry="118" className="surgery-tm-side-shadow" />
          <ellipse cx="819" cy="273" rx="27" ry="112" className="surgery-tm-side" />
          <path d="M814 175 C823 225 825 279 818 371" className="surgery-tm-side-highlight" />
        </g>
      ) : null}
    </g>
  );
}

function EustachianView({ layers, mirrored }: { layers: SurgeryLayer[]; mirrored: boolean }) {
  const dilations = layers.filter(
    (layer): layer is Extract<SurgeryLayer, { kind: "eustachian_tube_dilation" }> =>
      layer.kind === "eustachian_tube_dilation" && layerHasVisualShape(layer, "eustachian_tube"),
  );
  return (
    <g className="atlas-eustachian-view">
      <ellipse cx="500" cy="260" rx="438" ry="252" className="surgery-field-glow" />
      <path d="M62 123 C170 47 323 57 429 133 C480 170 526 212 578 245 C648 290 757 309 863 330 C898 337 917 373 903 412 C887 456 842 475 789 462 C691 438 602 400 513 364 C431 330 354 342 272 369 C167 404 77 352 49 270 C32 220 33 160 62 123 Z" className="surgery-et-skull-base" data-anatomy-id="parasagittal-skull-base" />
      <path d="M89 174 C166 116 278 119 347 170 C398 208 411 274 375 325 C337 378 249 392 171 359 C106 332 71 280 75 231 C77 208 82 188 89 174 Z" className="surgery-middle-ear-space" data-anatomy-id="middle-ear-space" />
      <ellipse cx="131" cy="255" rx="34" ry="96" className="surgery-tm-side" />
      <path d="M137 169 C148 224 149 282 139 345" className="surgery-tm-side-highlight" />
      <path d="M352 286 C415 292 472 308 527 332" className="surgery-et-bony-segment" data-anatomy-id="eustachian-bony-third" />
      <path d="M520 331 C626 364 716 399 810 431" className="surgery-et-cartilaginous-segment" data-anatomy-id="eustachian-cartilaginous-segment" />
      <path d="M535 312 C628 337 721 374 824 414 C817 436 804 448 788 455 C690 421 605 387 515 354 Z" className="surgery-et-cartilage-plate" data-anatomy-id="eustachian-cartilage" />
      <path d="M351 286 C414 293 472 309 526 332 C627 365 718 400 811 431" className="surgery-et-lumen" data-anatomy-id="eustachian-lumen" />
      <ellipse cx="525" cy="332" rx="12" ry="17" transform="rotate(18 525 332)" className="surgery-et-isthmus" data-anatomy-id="eustachian-isthmus" />
      <path d="M788 424 C828 397 874 406 900 446" className="surgery-nasopharynx" data-anatomy-id="nasopharynx" />
      <path d="M805 405 C837 381 878 391 892 422 C900 441 892 458 875 468" className="surgery-torus-tubarius" data-anatomy-id="torus-tubarius" />
      <path d="M585 367 C635 411 693 445 753 467" className="surgery-tensor-veli" />
      <path d="M604 349 C652 380 707 402 765 412" className="surgery-levator-veli" />
      <path d="M742 428 C787 455 834 474 888 487" className="surgery-nasal-floor" />
      {dilations.map((layer) => {
        const partial = layer.result === "partial";
        return (
          <g key={layer.id} data-layer-id={layer.id} className={cn("surgery-et-dilation-result", partial && "is-partial")}>
            <path d={partial ? "M590 342 C628 355 663 369 697 383" : "M550 326 C618 348 681 374 748 397"} className="surgery-et-treated-wall is-superior" />
            <path d={partial ? "M586 369 C624 382 659 396 693 410" : "M546 354 C614 376 677 402 744 425"} className="surgery-et-treated-wall is-inferior" />
            <path d={partial ? "M590 355 C628 368 663 382 697 396" : "M550 341 C618 363 681 389 748 412"} className="surgery-et-treated-lumen" />
            <g className="surgery-balloon-inset" transform="translate(574 58)">
              <rect x="0" y="0" width="306" height="125" rx="20" className="surgery-inset-paper" />
              <text
                x="20"
                y="28"
                className="surgery-inset-label"
                transform={mirrored ? "translate(306 0) scale(-1 1)" : undefined}
              >
                Temporary balloon during dilation
              </text>
              <path d="M26 82 C101 72 190 76 276 97" className="surgery-inset-tube" />
              <path d="M18 89 C95 77 192 83 282 105" className="surgery-balloon-catheter" />
              <rect x={partial ? 124 : 92} y={partial ? 72 : 65} width={partial ? 72 : 142} height={partial ? 24 : 36} rx={partial ? 12 : 18} transform="rotate(8 164 83)" className={cn("surgery-balloon", partial && "is-partial")} />
              <path d="M249 75 L263 111" className="surgery-inset-isthmus" />
            </g>
          </g>
        );
      })}
    </g>
  );
}

function BaseView({
  view,
  layers,
  contextLayers,
  phase,
  mirrored,
  definitionPrefix,
}: {
  view: SurgeryBaseView;
  layers: SurgeryLayer[];
  contextLayers: SurgeryLayer[];
  phase: SurgeryDiagramPhase;
  mirrored: boolean;
  definitionPrefix: string;
}) {
  switch (view) {
    case "otoscopic_tm":
      return (
        <OtoscopicView
          layers={layers}
          contextLayers={contextLayers}
          phase={phase}
          definitionPrefix={definitionPrefix}
        />
      );
    case "transcanal_middle_ear":
      return <MiddleEarView layers={layers} contextLayers={contextLayers} />;
    case "mastoid_middle_ear":
      return <MastoidView layers={layers} />;
    case "cochlea_implant_path":
      return <CochleaView layers={layers} definitionPrefix={definitionPrefix} />;
    case "postauricular_implant":
      return <PostauricularView layers={layers} />;
    case "external_auditory_canal":
      return <CanalView layers={layers} />;
    case "eustachian_tube":
      return <EustachianView layers={layers} mirrored={mirrored} />;
  }
}

function SurgeryScene({
  plan,
  phase,
  presentationMode = "postoperative_summary",
  view,
  selectedLayerId,
  onLayerSelect,
  includeStatuses,
}: ComposedSurgeryDiagramProps & { view: SurgeryBaseView; includeStatuses: boolean }) {
  const sceneInstanceId = useId().replaceAll(/[^a-zA-Z0-9_-]/g, "");
  const layers = layersForView(plan, view, phase, includeStatuses);
  const procedureNeedsFindingContext =
    (view === "otoscopic_tm" && layers.some((layer) => layer.kind === "tm_graft")) ||
    (view === "transcanal_middle_ear" &&
      layers.some((layer) =>
        ["tm_graft", "ossicular_reconstruction", "stapes_procedure"].includes(layer.kind),
      ));
  const contextLayers = getActiveSurgeryLayers(plan).filter(
    (layer) =>
      (phase === "finding" || procedureNeedsFindingContext) &&
      layer.documentation === "documented" &&
      layer.role === "finding" &&
      viewLayerKinds[view].includes(layer.kind),
  );
  const title =
    presentationMode === "preoperative_education"
      ? phase === "finding"
        ? "Anatomy being discussed"
        : "Planned procedure"
      : phase === "finding"
        ? "Findings"
        : "Procedure and repair";
  const side = plan.laterality === "not_documented" ? "Side not documented" : `${humanize(plan.laterality)} ear`;
  const mirrored = plan.laterality === "left";
  const definitionPrefix = `${phase}-${plan.laterality}-${view}-${sceneInstanceId}`;

  return (
    <section className="surgery-scene" aria-label={`${title}: ${viewLabels[view]}`}>
      <header className="surgery-scene-header">
        <div>
          <p>{title}</p>
          <h3>{viewLabels[view]}</h3>
        </div>
        <div className="surgery-scene-meta">
          <span>{side}</span>
          <span>Generic anatomy</span>
        </div>
      </header>
      <div className="surgery-scene-canvas">
        <svg
          viewBox="0 0 960 520"
          className="diagram-svg composed-surgery-svg"
          role="img"
          style={atlasResourceStyle(definitionPrefix)}
          aria-label={`${title}: ${viewLabels[view]}. Generic reference anatomy with documented overlays.`}
          data-template-view={view}
          data-diagram-phase={phase}
        >
          <title>{`${title}: ${viewLabels[view]}`}</title>
          <desc>
            Generic orientation anatomy is muted. Integrated shapes show documented findings, repairs,
            devices, and treatment extent only.
          </desc>
          <AtlasIllustrationDefs idPrefix={definitionPrefix} />
          <rect width="960" height="520" className="surgery-scene-bg" />
          <g
            className={mirrored ? "surgery-anatomy-is-mirrored" : undefined}
            transform={mirrored ? "translate(960 0) scale(-1 1)" : undefined}
          >
            <BaseView
              view={view}
              layers={layers}
              contextLayers={contextLayers}
              phase={phase}
              mirrored={mirrored}
              definitionPrefix={definitionPrefix}
            />
          </g>
          {layers.map((layer, index) =>
            layerHasVisualShape(layer, view) ? (
              <LayerMarker
                key={layer.id}
                view={view}
                layer={layer}
                index={index}
                selected={selectedLayerId === layer.id}
                mirrored={mirrored}
              />
            ) : null,
          )}
        </svg>
      </div>
      {layers.length > 0 ? (
        <div className="surgery-layer-list" aria-label={`${viewLabels[view]} labels`}>
          {layers.map((layer, index) => (
            <button
              key={layer.id}
              type="button"
              className={cn("surgery-layer-row", selectedLayerId === layer.id && "is-active")}
              aria-pressed={selectedLayerId === layer.id}
              onClick={() => onLayerSelect?.(layer.id)}
            >
              <span className="surgery-layer-number">{index + 1}</span>
              <span className="surgery-layer-copy">
                <strong>{labelSurgeryLayer(layer)}</strong>
                {!layerHasVisualShape(layer, view) ? (
                  <small>
                    Status only{layer.enteredBy === "clinician" ? " · Clinician added" : ""}
                  </small>
                ) : null}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <p className="surgery-scene-empty">
          {phase === "finding" ? "No documented finding for this view." : "Repair details not documented."}
        </p>
      )}
    </section>
  );
}

export function ComposedSurgeryDiagram({
  plan,
  phase,
  presentationMode = "postoperative_summary",
  selectedLayerId,
  onLayerSelect,
}: ComposedSurgeryDiagramProps) {
  const visiblePlan: SurgeryPlan =
    presentationMode === "preoperative_education"
      ? {
          ...plan,
          layers: plan.layers.filter(
            (layer) => layer.role === "finding" || layer.role === "action",
          ),
        }
      : plan;
  const views = visiblePlan.baseViews;
  if (views.length === 0) {
    return (
      <div className="surgery-diagram-empty" role="status">
        <strong>Choose a procedure or view to begin.</strong>
        <span>No anatomy is inferred from an empty plan.</span>
      </div>
    );
  }

  const activeLayers = getActiveSurgeryLayers(visiblePlan);
  const plansBySide: SurgeryPlan[] =
    visiblePlan.laterality === "bilateral"
      ? (["left", "right"] as const).map((side) => ({
          ...visiblePlan,
          laterality: side,
          layers: activeLayers.filter((layer) => layer.side === side || layer.side === "bilateral"),
        }))
      : [visiblePlan];
  const scenePlans = plansBySide.flatMap((sidePlan) =>
    views
      .filter((view) => layersForView(sidePlan, view, phase, false).length > 0)
      .map((view) => ({ sidePlan, view })),
  );
  if (scenePlans.length === 0) {
    const statusLayers =
      phase === "procedure"
        ? activeLayers.filter(
            (layer) =>
              layer.documentation === "documented" &&
              (layer.kind === "intraoperative_deviation" || layer.kind === "verification_status"),
          )
        : [];
    if (statusLayers.length > 0) {
      return (
        <div className="surgery-layer-list surgery-status-only-list" aria-label="Procedure status labels">
          {statusLayers.map((layer, index) => (
            <button
              key={layer.id}
              type="button"
              className={cn("surgery-layer-row", selectedLayerId === layer.id && "is-active")}
              aria-pressed={selectedLayerId === layer.id}
              onClick={() => onLayerSelect?.(layer.id)}
            >
              <span className="surgery-layer-number">{index + 1}</span>
              <span className="surgery-layer-copy">
                <strong>{labelSurgeryLayer(layer)}</strong>
                <small>Status only</small>
              </span>
            </button>
          ))}
        </div>
      );
    }
    return (
      <div className="surgery-diagram-empty" role="status">
        <strong>{phase === "finding" ? "No documented finding to draw." : "No documented procedure layer to draw."}</strong>
        <span>Generic anatomy is not shown without a matching documented layer.</span>
      </div>
    );
  }
  return (
    <div className="surgery-scene-stack" data-composed-plan-version={visiblePlan.schemaVersion}>
      {scenePlans.map(({ sidePlan, view }, index) =>
          <SurgeryScene
            key={`${phase}-${sidePlan.laterality}-${view}`}
            plan={sidePlan}
            phase={phase}
            presentationMode={presentationMode}
            view={view}
            selectedLayerId={selectedLayerId}
            onLayerSelect={onLayerSelect}
            includeStatuses={index === 0}
          />
      )}
      {activeLayers.some(
        (layer) => layer.documentation === "documented" && !views.some((view) => viewLayerKinds[view].includes(layer.kind)) && layer.kind !== "intraoperative_deviation" && layer.kind !== "verification_status",
      ) ? (
        <div className="surgery-text-only-notice">
          <strong>Text-only detail</strong>
          <span>No reviewed visual module is assigned to one or more documented details.</span>
        </div>
      ) : null}
    </div>
  );
}

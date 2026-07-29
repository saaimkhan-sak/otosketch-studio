"use client";

import { useId, type KeyboardEvent, type ReactNode } from "react";
import type { EducationMode } from "@/domain/educationMode";
import { labelSurgeryLayer } from "@/domain/diagramLabels";
import {
  getMedicalArtAnchor,
  getMedicalArtAnchorForTarget,
  medicalArtSourceGeometry,
  selectMedicalArtAsset,
  type MedicalArtAnchor,
  type MedicalArtAnatomyTarget,
  type MedicalArtAsset,
  type MedicalArtComponent,
} from "@/domain/medicalArt";
import {
  deriveMedicalArtTympanicPolygon,
  deriveMedicalArtTympanostomyPoint,
  deriveServierProsthesisPlacement,
  mapTympanicPolygonToMedicalArtSource,
  smoothClosedSourcePath,
  type ServierProsthesisPlacement,
} from "@/domain/medicalArtPlacement";
import {
  layoutNumberedMedicalArtCallouts,
  medicalArtCalloutPointData,
  medicalArtCalloutRectData,
  resolveMedicalArtCalloutDescriptor,
} from "@/domain/medicalArtCallouts";
import { getActiveSurgeryLayers, type SurgeryLayer, type SurgeryPlan } from "@/domain/surgeryPlan";
import { cn } from "@/lib/cn";

export type MedicalIllustrationPhase = "finding" | "procedure";

interface MedicalIllustrationDiagramProps {
  plan: SurgeryPlan;
  phase: MedicalIllustrationPhase;
  presentationMode?: EducationMode;
  selectedLayerId?: string | null;
  onLayerSelect?: (layerId: string) => void;
}

const imageFrame = { x: 28, y: 78, width: 588, height: 454 };

type FittedImage = ReturnType<typeof fitMedicalArt>;

function fitMedicalArt(asset: MedicalArtAsset) {
  const scale = Math.min(imageFrame.width / asset.width, imageFrame.height / asset.height);
  const width = asset.width * scale;
  const height = asset.height * scale;
  return {
    x: imageFrame.x + (imageFrame.width - width) / 2,
    y: imageFrame.y + (imageFrame.height - height) / 2,
    width,
    height,
  };
}

function projectSourcePoint(
  asset: MedicalArtAsset,
  fitted: FittedImage,
  point: { x: number; y: number },
) {
  return {
    x: fitted.x + (point.x / asset.width) * fitted.width,
    y: fitted.y + (point.y / asset.height) * fitted.height,
  };
}

function projectAnchor(fitted: FittedImage, anchor: MedicalArtAnchor) {
  return {
    x: fitted.x + (anchor.x / 100) * fitted.width,
    y: fitted.y + (anchor.y / 100) * fitted.height,
  };
}

function targetPoint(asset: MedicalArtAsset, fitted: FittedImage, target: MedicalArtAnatomyTarget) {
  const anchor = getMedicalArtAnchorForTarget(asset.id, target);
  return anchor ? projectAnchor(fitted, anchor) : null;
}

function isVisibleInPhase(layer: SurgeryLayer, phase: MedicalIllustrationPhase) {
  if (layer.documentation !== "documented") return false;
  if (layer.kind === "ossicular_reconstruction" && layer.method === "none") {
    return false;
  }
  if (phase === "finding") {
    return layer.role === "finding" || layer.role === "deviation";
  }
  return layer.role !== "finding";
}

function phaseLabel(phase: MedicalIllustrationPhase, mode: EducationMode) {
  if (phase === "finding") {
    return mode === "preoperative_education" ? "Anatomy" : "Findings";
  }
  return mode === "preoperative_education" ? "Plan" : "Procedure";
}

function shouldReportUnillustratedLayer(layer: SurgeryLayer) {
  if (layer.kind === "verification_status" || layer.kind === "intraoperative_deviation") {
    return false;
  }
  if (layer.kind === "ossicular_reconstruction" && layer.method === "none") {
    return false;
  }
  if (layer.kind === "tm_graft" && layer.material === "none") {
    return false;
  }
  return true;
}

function lateralityLabel(plan: SurgeryPlan) {
  if (plan.laterality === "not_documented") return "Side not documented";
  return `${plan.laterality.charAt(0).toUpperCase()}${plan.laterality.slice(1)} ear`;
}

function markerColor(layer: SurgeryLayer) {
  if (layer.role === "finding") return "#b9573a";
  if (layer.role === "deviation") return "#c8861f";
  if (layer.role === "verification") return "#456b83";
  return "#087f78";
}

function markerFill(layer: SurgeryLayer) {
  if (layer.role === "finding") return "rgba(185, 87, 58, 0.20)";
  if (layer.role === "deviation") return "rgba(200, 134, 31, 0.20)";
  if (layer.role === "verification") return "rgba(69, 107, 131, 0.16)";
  return "rgba(8, 127, 120, 0.18)";
}

function wrapLabel(label: string, max = 30) {
  if (label.length <= max) return [label];
  const words = label.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > max && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 2);
}

function isRemovalLayer(layer: SurgeryLayer) {
  if (layer.kind === "tm_perforation") return true;
  if (layer.kind !== "ossicle_state") return false;
  return ["absent", "eroded", "long_process_eroded", "body_eroded", "discontinuous"].includes(
    layer.state,
  );
}

function sourceGeometryTransform(asset: MedicalArtAsset, fitted: FittedImage) {
  return `translate(${fitted.x} ${fitted.y}) scale(${fitted.width / asset.width} ${
    fitted.height / asset.height
  })`;
}

function sourcePointData(point: { x: number; y: number }) {
  return `${point.x.toFixed(3)},${point.y.toFixed(3)}`;
}

function leaderTerminalTick(
  start: { x: number; y: number },
  end: { x: number; y: number },
  length = 11,
) {
  const dx = start.x - end.x;
  const dy = start.y - end.y;
  const magnitude = Math.hypot(dx, dy) || 1;
  return {
    x: end.x + (dx / magnitude) * length,
    y: end.y + (dy / magnitude) * length,
  };
}

function sourcePerforationPaths(layers: readonly SurgeryLayer[], asset: MedicalArtAsset) {
  const tympanicMembrane = medicalArtSourceGeometry[asset.id]?.tympanicMembrane;
  if (!tympanicMembrane?.normalizedFrame && !tympanicMembrane?.normalizedSurface) {
    return [];
  }
  return layers.flatMap((layer) => {
    if (layer.kind !== "tm_perforation") return [];
    const points = deriveMedicalArtTympanicPolygon(asset.id, layer.region, layer.geometry);
    if (!points) return [];
    return [{ id: layer.id, path: smoothClosedSourcePath(points) }];
  });
}

function supportedOssicleState(
  layers: readonly SurgeryLayer[],
  structure: Extract<SurgeryLayer, { kind: "ossicle_state" }>["structure"],
) {
  return layers.find(
    (layer): layer is Extract<SurgeryLayer, { kind: "ossicle_state" }> =>
      layer.kind === "ossicle_state" && layer.structure === structure,
  );
}

function shouldRetainOnlyStapesFootplate(
  layers: readonly SurgeryLayer[],
  phase: MedicalIllustrationPhase,
) {
  const superstructure = supportedOssicleState(layers, "stapes_superstructure");
  if (superstructure?.state === "absent") return true;
  if (phase !== "procedure") return false;
  return layers.some(
    (layer) => layer.kind === "stapes_procedure" && layer.technique === "stapedotomy",
  );
}

function layeredComponentState(
  component: MedicalArtComponent,
  layers: readonly SurgeryLayer[],
  phase: MedicalIllustrationPhase,
) {
  if (component.id === "malleus") {
    const malleus = supportedOssicleState(layers, "malleus");
    if (malleus?.state === "absent") return "omitted";
  }
  if (component.id === "incus") {
    const incus = supportedOssicleState(layers, "incus");
    if (incus?.state === "absent") return "omitted";
    if (incus?.state === "long_process_eroded") return "long-process-eroded";
  }
  if (component.id === "stapes") {
    const footplate = supportedOssicleState(layers, "stapes_footplate");
    if (footplate?.state === "absent") return "omitted";
    if (shouldRetainOnlyStapesFootplate(layers, phase)) {
      return "footplate-only";
    }
  }
  return "intact";
}

function layeredComponentClipPath(
  component: MedicalArtComponent,
  state: ReturnType<typeof layeredComponentState>,
  id: string,
) {
  if (component.id === "incus" && state === "long-process-eroded") {
    return `url(#${id}-incus-retained)`;
  }
  if (component.id === "stapes" && state === "footplate-only") {
    return `url(#${id}-stapes-footplate)`;
  }
  return undefined;
}

function layeredMedicalArt(
  layers: readonly SurgeryLayer[],
  phase: MedicalIllustrationPhase,
  asset: MedicalArtAsset,
  fitted: FittedImage,
  id: string,
  foreground = false,
) {
  const components = asset.components;
  if (!components) return null;
  const selectedComponents = foreground
    ? components.filter(
        (component) => component.id === "tympanic_membrane" || component.id === "malleus",
      )
    : components;

  return (
    <g
      transform={sourceGeometryTransform(asset, fitted)}
      data-medical-art-composition={foreground ? "tm-foreground" : "official-layers"}
    >
      {selectedComponents.map((component) => {
        const state = layeredComponentState(component, layers, phase);
        if (state === "omitted") return null;
        const tympanicMask =
          component.id === "tympanic_membrane" ? `url(#${id}-tympanic-membrane)` : undefined;
        return (
          <image
            key={`${foreground ? "foreground" : "base"}-${component.id}`}
            href={component.localPath}
            x={component.x}
            y={component.y}
            width={component.width}
            height={component.height}
            preserveAspectRatio="none"
            mask={tympanicMask}
            clipPath={layeredComponentClipPath(component, state, id)}
            opacity={foreground && component.id === "tympanic_membrane" ? 0.52 : undefined}
            data-anatomy-component={component.id}
            data-anatomy-component-state={state}
            data-anatomy-component-sha256={component.sha256}
            data-anatomy-education-treatment={
              foreground && component.id === "tympanic_membrane"
                ? "translucent-foreground"
                : undefined
            }
            data-medical-art-source={
              !foreground && component.id === "cochlea" ? asset.sourcePage : undefined
            }
            data-medical-art-license={
              !foreground && component.id === "cochlea" ? asset.license : undefined
            }
          />
        );
      })}
    </g>
  );
}

function sourceTympanicForeground(asset: MedicalArtAsset, fitted: FittedImage, id: string) {
  const tympanicMembrane = medicalArtSourceGeometry[asset.id]?.tympanicMembrane;
  if (!tympanicMembrane) return null;
  return (
    <g
      transform={sourceGeometryTransform(asset, fitted)}
      data-medical-art-composition="tm-foreground"
    >
      <image
        href={asset.localPath}
        x="0"
        y="0"
        width={asset.width}
        height={asset.height}
        preserveAspectRatio="none"
        clipPath={`url(#${id}-tympanic-surface)`}
        mask={`url(#${id}-tympanic-membrane)`}
        opacity="0.52"
        data-anatomy-component="tympanic_membrane"
        data-anatomy-component-state="intact"
        data-anatomy-education-treatment="translucent-foreground"
      />
    </g>
  );
}

function anatomyRemovalShape(
  layer: SurgeryLayer,
  asset: MedicalArtAsset,
  fitted: FittedImage,
  x: number,
  y: number,
): ReactNode {
  if (layer.kind === "tm_perforation") {
    const tympanicMembrane = medicalArtSourceGeometry[asset.id]?.tympanicMembrane;
    if (tympanicMembrane?.normalizedFrame || tympanicMembrane?.normalizedSurface) {
      const points = deriveMedicalArtTympanicPolygon(asset.id, layer.region, layer.geometry);
      if (points) {
        return (
          <path
            d={smoothClosedSourcePath(points)}
            transform={sourceGeometryTransform(asset, fitted)}
            fill="black"
          />
        );
      }
    }
    return (
      <path
        d={`M ${x - 14} ${y - 23}
            C ${x - 2} ${y - 29}, ${x + 13} ${y - 17}, ${x + 15} ${y - 3}
            C ${x + 19} ${y + 10}, ${x + 6} ${y + 25}, ${x - 6} ${y + 21}
            C ${x - 19} ${y + 16}, ${x - 21} ${y - 10}, ${x - 14} ${y - 23} Z`}
        fill="black"
      />
    );
  }
  if (layer.kind !== "ossicle_state") return null;
  if (layer.state === "absent") {
    return <ellipse cx={x} cy={y} rx="31" ry="23" fill="black" />;
  }
  if (layer.state === "long_process_eroded") {
    return (
      <path
        d={`M ${x - 17} ${y - 8}
            L ${x - 8} ${y - 13} L ${x - 1} ${y - 8} L ${x + 7} ${y - 13}
            L ${x + 17} ${y - 5} L ${x + 12} ${y + 7} L ${x + 3} ${y + 10}
            L ${x - 5} ${y + 7} L ${x - 13} ${y + 11} Z`}
        fill="black"
        transform={`rotate(-12 ${x} ${y})`}
      />
    );
  }
  if (layer.state === "discontinuous") {
    return (
      <ellipse cx={x} cy={y} rx="12" ry="10" fill="black" transform={`rotate(-12 ${x} ${y})`} />
    );
  }
  if (layer.state === "body_eroded") {
    return (
      <path
        d={`M ${x - 17} ${y - 13} C ${x - 6} ${y - 22}, ${x + 14} ${
          y - 17
        }, ${x + 19} ${y - 3} C ${x + 17} ${y + 14}, ${x + 3} ${
          y + 22
        }, ${x - 13} ${y + 15} C ${x - 22} ${y + 8}, ${x - 23} ${y - 5}, ${x - 17} ${y - 13} Z`}
        fill="black"
      />
    );
  }
  if (layer.state === "eroded") {
    return (
      <path
        d={`M ${x - 13} ${y - 12} C ${x - 2} ${y - 20}, ${x + 14} ${
          y - 12
        }, ${x + 15} ${y + 1} C ${x + 10} ${y + 16}, ${x - 7} ${
          y + 18
        }, ${x - 16} ${y + 6} C ${x - 20} ${y - 1}, ${x - 18} ${y - 7}, ${x - 13} ${y - 12} Z`}
        fill="black"
      />
    );
  }
  return null;
}

function lesionOverlay(
  layer: Extract<SurgeryLayer, { kind: "ossicle_state" }>,
  x: number,
  y: number,
) {
  const color = markerColor(layer);
  const fill = markerFill(layer);

  if (
    layer.state === "long_process_eroded" ||
    layer.state === "body_eroded" ||
    layer.state === "eroded" ||
    layer.state === "discontinuous"
  ) {
    const longProcess = layer.state === "long_process_eroded";
    if (longProcess) {
      return (
        <g
          className="medical-lesion"
          filter="url(#medical-soft-shadow)"
          data-erosion-rendering="source-clipped-stump"
        >
          <path
            d={`M ${x - 7} ${y - 6}
                C ${x - 2} ${y - 9}, ${x + 5} ${y - 7}, ${x + 7} ${y - 2}
                C ${x + 5} ${y + 4}, ${x + 1} ${y + 8}, ${x - 5} ${y + 6}
                C ${x - 9} ${y + 3}, ${x - 10} ${y - 2}, ${x - 7} ${y - 6} Z`}
            transform={`rotate(-44 ${x} ${y})`}
            fill="rgba(111, 51, 42, 0.28)"
            stroke={color}
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
          <circle cx={x - 2.5} cy={y + 0.5} r="1.6" fill={color} opacity="0.72" />
          <circle cx={x + 2.7} cy={y - 1.8} r="1.15" fill={color} opacity="0.58" />
          <circle cx={x + 3.8} cy={y + 3.2} r="0.9" fill={color} opacity="0.52" />
        </g>
      );
    }
    return (
      <g className="medical-lesion" filter="url(#medical-soft-shadow)">
        <path
          d={`M ${x - 16} ${y - 12}
                 C ${x - 4} ${y - 21}, ${x + 15} ${y - 15}, ${x + 18} ${y}
                 C ${x + 13} ${y + 16}, ${x - 5} ${y + 20}, ${x - 17} ${y + 8}
                 C ${x - 22} ${y}, ${x - 21} ${y - 7}, ${x - 16} ${y - 12} Z`}
          fill="rgba(111, 51, 42, 0.24)"
          stroke={color}
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <circle cx={x - 6} cy={y + 1} r="2.4" fill={color} opacity="0.75" />
        <circle cx={x + 5} cy={y - 2} r="1.8" fill={color} opacity="0.58" />
        <circle cx={x + 9} cy={y + 5} r="1.4" fill={color} opacity="0.5" />
      </g>
    );
  }

  if (layer.state === "absent") {
    return (
      <g fill="none" stroke={color}>
        <ellipse
          cx={x}
          cy={y}
          rx="34"
          ry="24"
          fill={fill}
          strokeWidth="2.5"
          strokeDasharray="6 5"
        />
        <path
          d={`M ${x - 24} ${y + 17} C ${x - 6} ${y + 27}, ${x + 17} ${y + 25}, ${x + 29} ${y + 10}`}
          strokeWidth="2"
          opacity="0.72"
        />
      </g>
    );
  }

  if (layer.state === "fixed") {
    return (
      <g>
        <ellipse
          cx={x}
          cy={y}
          rx="27"
          ry="14"
          transform={`rotate(-14 ${x} ${y})`}
          fill="url(#medical-fixation-hatch)"
          stroke={color}
          strokeWidth="3"
        />
        <path
          d={`M ${x - 15} ${y - 11} L ${x + 14} ${y + 8}`}
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.8"
        />
      </g>
    );
  }

  if (layer.state === "reconstructed") {
    return (
      <ellipse
        cx={x}
        cy={y}
        rx="27"
        ry="20"
        fill="rgba(8,127,120,.12)"
        stroke="#087f78"
        strokeWidth="2.5"
      />
    );
  }

  return null;
}

function endpointPoint(
  asset: MedicalArtAsset,
  fitted: FittedImage,
  endpoint:
    | Extract<SurgeryLayer, { kind: "ossicular_reconstruction" }>["lateralEndpoint"]
    | Extract<SurgeryLayer, { kind: "ossicular_reconstruction" }>["medialEndpoint"],
  method?: Extract<SurgeryLayer, { kind: "ossicular_reconstruction" }>["method"],
  preferIncusErosionStump = false,
) {
  const targetByEndpoint: Partial<Record<typeof endpoint, MedicalArtAnatomyTarget>> = {
    tympanic_membrane: "tm_prosthesis_contact",
    malleus: "malleus_manubrium",
    incus_long_process: "incus_long_process",
    incus_body: "incus_body",
    incudostapedial_joint: "incudostapedial_joint",
    stapes_capitulum: "stapes_capitulum",
    stapes_superstructure: "stapes_superstructure",
    stapes_footplate: "stapes_footplate",
  };
  const target =
    preferIncusErosionStump && endpoint === "incus_long_process"
      ? "incus_erosion_stump"
      : method === "porp" && endpoint === "stapes_superstructure"
        ? "stapes_capitulum"
        : targetByEndpoint[endpoint];
  if (!target) return null;
  return (
    targetPoint(asset, fitted, target) ??
    (endpoint === "tympanic_membrane"
      ? targetPoint(asset, fitted, "tympanic_membrane_medial")
      : endpoint === "malleus"
        ? targetPoint(asset, fitted, "malleus")
        : null)
  );
}

function servierProsthesisOverlay(
  layer: Extract<SurgeryLayer, { kind: "ossicular_reconstruction" }>,
  asset: MedicalArtAsset,
  fitted: FittedImage,
  placement: ServierProsthesisPlacement,
) {
  const color = markerColor(layer);
  const { headPlate, distalContact, shaft } = placement;

  return (
    <g
      transform={sourceGeometryTransform(asset, fitted)}
      filter="url(#medical-soft-shadow)"
      data-prosthesis-method={layer.method}
      data-prosthesis-lateral-endpoint={layer.lateralEndpoint}
      data-prosthesis-medial-endpoint={placement.distalTarget}
      data-prosthesis-calibration={placement.calibrationId}
      data-prosthesis-rendering={placement.rendering}
      data-prosthesis-source-space="584x370"
      data-prosthesis-headplate-source={sourcePointData(headPlate.center)}
      data-prosthesis-distal-source={sourcePointData(distalContact.center)}
      data-prosthesis-shaft-start-source={sourcePointData(shaft.start)}
      data-prosthesis-shaft-end-source={sourcePointData(shaft.end)}
      data-prosthesis-depth-order="tm-cartilage-headplate-shaft-stapes"
    >
      <line
        x1={shaft.start.x}
        y1={shaft.start.y}
        x2={shaft.end.x}
        y2={shaft.end.y}
        stroke="#43535d"
        strokeWidth="6.5"
        strokeLinecap="round"
      />
      <line
        x1={shaft.start.x}
        y1={shaft.start.y}
        x2={shaft.end.x}
        y2={shaft.end.y}
        stroke="url(#medical-metal)"
        strokeWidth="3.4"
        strokeLinecap="round"
      />
      <ellipse
        cx={headPlate.center.x}
        cy={headPlate.center.y}
        rx={headPlate.radiusX}
        ry={headPlate.radiusY}
        transform={`rotate(${headPlate.rotation} ${headPlate.center.x} ${headPlate.center.y})`}
        fill="url(#medical-metal)"
        stroke="#43535d"
        strokeWidth="2"
      />
      <path
        d={`M ${headPlate.center.x - 6} ${headPlate.center.y - 1.4}
            C ${headPlate.center.x - 1} ${headPlate.center.y - 3.1}, ${
              headPlate.center.x + 6
            } ${headPlate.center.y - 2.5}, ${headPlate.center.x + 8} ${headPlate.center.y - 0.8}`}
        transform={`rotate(${headPlate.rotation} ${headPlate.center.x} ${headPlate.center.y})`}
        fill="none"
        stroke="rgba(255,255,255,.78)"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
      {placement.method === "porp" ? (
        <g
          transform={`rotate(${distalContact.rotation} ${distalContact.center.x} ${distalContact.center.y})`}
        >
          <ellipse
            cx={distalContact.center.x}
            cy={distalContact.center.y}
            rx={distalContact.radiusX}
            ry={distalContact.radiusY}
            fill="url(#medical-metal)"
            stroke="#43535d"
            strokeWidth="1.8"
          />
          <ellipse
            cx={distalContact.center.x}
            cy={distalContact.center.y}
            rx="2.6"
            ry="1.45"
            fill="rgba(255,255,255,.44)"
            stroke={color}
            strokeWidth="0.9"
          />
        </g>
      ) : (
        <g
          transform={`rotate(${distalContact.rotation} ${distalContact.center.x} ${distalContact.center.y})`}
        >
          <ellipse
            cx={distalContact.center.x}
            cy={distalContact.center.y}
            rx={distalContact.radiusX}
            ry={distalContact.radiusY}
            fill="url(#medical-metal)"
            stroke="#43535d"
            strokeWidth="1.8"
          />
          <path
            d={`M ${distalContact.center.x - 4.5} ${
              distalContact.center.y - 0.8
            } C ${distalContact.center.x - 1.5} ${
              distalContact.center.y - 1.8
            }, ${distalContact.center.x + 2.8} ${
              distalContact.center.y - 1.6
            }, ${distalContact.center.x + 4.5} ${distalContact.center.y - 0.5}`}
            fill="none"
            stroke="rgba(255,255,255,.72)"
            strokeWidth="1"
            strokeLinecap="round"
          />
        </g>
      )}
    </g>
  );
}

function reconstructionOverlay(
  layer: Extract<SurgeryLayer, { kind: "ossicular_reconstruction" }>,
  supportedLayers: readonly SurgeryLayer[],
  asset: MedicalArtAsset,
  fitted: FittedImage,
) {
  if (
    asset.id === "servier-inner-ear" &&
    layer.lateralEndpoint === "tympanic_membrane" &&
    (layer.method === "porp" || layer.method === "torp")
  ) {
    return servierProsthesisOverlay(
      layer,
      asset,
      fitted,
      deriveServierProsthesisPlacement(layer.method),
    );
  }
  const preferIncusErosionStump =
    layer.method === "bone_cement_bridge" &&
    supportedLayers.some(
      (candidate) =>
        candidate.kind === "ossicle_state" &&
        candidate.structure === "incus" &&
        candidate.state === "long_process_eroded" &&
        (candidate.side === layer.side ||
          candidate.side === "bilateral" ||
          layer.side === "bilateral"),
    );
  const lateral = endpointPoint(
    asset,
    fitted,
    layer.lateralEndpoint,
    layer.method,
    preferIncusErosionStump,
  );
  const medial = endpointPoint(
    asset,
    fitted,
    layer.medialEndpoint,
    layer.method,
    preferIncusErosionStump,
  );
  if (!lateral || !medial || layer.method === "none" || layer.method === "not_documented") {
    return null;
  }
  const color = markerColor(layer);
  const angle = (Math.atan2(medial.y - lateral.y, medial.x - lateral.x) * 180) / Math.PI;
  const midpoint = { x: (lateral.x + medial.x) / 2, y: (lateral.y + medial.y) / 2 };

  if (layer.method === "bone_cement_bridge") {
    return (
      <g
        filter="url(#medical-soft-shadow)"
        data-reconstruction-rendering="bone-cement-bridge"
        data-reconstruction-lateral-target={
          preferIncusErosionStump && layer.lateralEndpoint === "incus_long_process"
            ? "incus_erosion_stump"
            : layer.lateralEndpoint
        }
        data-reconstruction-lateral-display={sourcePointData(lateral)}
      >
        <path
          d={`M ${lateral.x - 7} ${lateral.y - 6}
              C ${midpoint.x - 8} ${midpoint.y - 13}, ${midpoint.x + 8} ${
                midpoint.y - 12
              }, ${medial.x + 7} ${medial.y - 5}
              L ${medial.x + 5} ${medial.y + 7}
              C ${midpoint.x + 6} ${midpoint.y + 11}, ${midpoint.x - 7} ${
                midpoint.y + 11
              }, ${lateral.x - 8} ${lateral.y + 6} Z`}
          fill="#e8d4ad"
          stroke="#9a7b51"
          strokeWidth="2.4"
        />
        <path
          d={`M ${lateral.x - 2} ${lateral.y - 2} C ${midpoint.x} ${
            midpoint.y - 6
          }, ${medial.x + 1} ${medial.y - 2}, ${medial.x + 3} ${medial.y + 1}`}
          fill="none"
          stroke="#fff7dd"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.9"
        />
      </g>
    );
  }

  if (layer.method === "cartilage_interposition" || layer.method === "autologous_incus") {
    return (
      <g
        transform={`translate(${midpoint.x} ${midpoint.y}) rotate(${angle})`}
        filter="url(#medical-soft-shadow)"
      >
        <path
          d="M -38 -10 C -16 -17, 18 -15, 39 -7 C 31 7, 8 14, -22 12 C -34 9, -41 2, -38 -10 Z"
          fill={layer.method === "cartilage_interposition" ? "#d9b58f" : "#d8bd7f"}
          stroke={color}
          strokeWidth="2.5"
        />
        <path
          d="M -29 -2 C -8 -7, 14 -6, 29 -2"
          fill="none"
          stroke="#fff3dc"
          strokeWidth="2"
          opacity="0.8"
        />
      </g>
    );
  }

  const headPlateAngle =
    medicalArtSourceGeometry[asset.id]?.tympanicMembrane?.planeAngle ?? angle + 90;
  const shaftLength = Math.hypot(medial.x - lateral.x, medial.y - lateral.y);
  const shaftUnit = {
    x: (medial.x - lateral.x) / shaftLength,
    y: (medial.y - lateral.y) / shaftLength,
  };
  const shaftStart = {
    x: lateral.x + shaftUnit.x * 4,
    y: lateral.y + shaftUnit.y * 4,
  };
  const shaftEnd = {
    x: medial.x - shaftUnit.x * (layer.method === "porp" ? 7 : 2),
    y: medial.y - shaftUnit.y * (layer.method === "porp" ? 7 : 2),
  };

  return (
    <g
      filter="url(#medical-soft-shadow)"
      data-prosthesis-method={layer.method}
      data-prosthesis-lateral-endpoint={layer.lateralEndpoint}
      data-prosthesis-medial-endpoint={
        layer.method === "porp" ? "stapes_capitulum" : layer.medialEndpoint
      }
      data-prosthesis-calibration={
        medicalArtSourceGeometry[asset.id]?.calibrationId ?? "anchor-fallback"
      }
      data-prosthesis-rendering={
        layer.method === "porp" ? "headplate-shaft-capitulum-cup" : "headplate-shaft-footplate-shoe"
      }
    >
      <line
        x1={shaftStart.x}
        y1={shaftStart.y}
        x2={shaftEnd.x}
        y2={shaftEnd.y}
        stroke="#43535d"
        strokeWidth="8"
        strokeLinecap="round"
      />
      <line
        x1={shaftStart.x}
        y1={shaftStart.y}
        x2={shaftEnd.x}
        y2={shaftEnd.y}
        stroke="url(#medical-metal)"
        strokeWidth="4.5"
        strokeLinecap="round"
      />
      <ellipse
        cx={lateral.x}
        cy={lateral.y}
        rx={layer.method === "porp" ? 19 : 17}
        ry={layer.method === "porp" ? 7 : 6.5}
        transform={`rotate(${headPlateAngle} ${lateral.x} ${lateral.y})`}
        fill="url(#medical-metal)"
        stroke="#43535d"
        strokeWidth="2.5"
      />
      <ellipse
        cx={lateral.x - 2}
        cy={lateral.y - 2}
        rx={layer.method === "porp" ? 12 : 10}
        ry="2"
        transform={`rotate(${headPlateAngle} ${lateral.x - 2} ${lateral.y - 2})`}
        fill="rgba(255,255,255,.72)"
        stroke="none"
      />
      {layer.method === "porp" ? (
        <g
          transform={`translate(${medial.x} ${medial.y}) rotate(${angle})`}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M -8 -8 C 1 -10 8 -6 9 0 C 8 6 1 10 -8 8" stroke="#43535d" strokeWidth="6" />
          <path
            d="M -8 -8 C 1 -10 8 -6 9 0 C 8 6 1 10 -8 8"
            stroke="url(#medical-metal)"
            strokeWidth="3.2"
          />
          <circle
            cx="1"
            cy="0"
            r="3.2"
            fill="rgba(255,255,255,.18)"
            stroke={color}
            strokeWidth="1.5"
          />
        </g>
      ) : (
        <g transform={`rotate(-7 ${medial.x} ${medial.y})`}>
          <ellipse
            cx={medial.x}
            cy={medial.y}
            rx="13"
            ry="5.5"
            fill="url(#medical-metal)"
            stroke="#43535d"
            strokeWidth="2.5"
          />
          <ellipse
            cx={medial.x}
            cy={medial.y - 1}
            rx="7"
            ry="2"
            fill="rgba(255,255,255,.68)"
            stroke={color}
            strokeWidth="1.2"
          />
        </g>
      )}
    </g>
  );
}

function stapesOverlay(
  layer: Extract<SurgeryLayer, { kind: "stapes_procedure" }>,
  asset: MedicalArtAsset,
  fitted: FittedImage,
) {
  if (layer.technique === "not_documented") return null;
  if (
    layer.technique !== "exploration_only" &&
    layer.pistonAttachment !== "malleus" &&
    layer.pistonAttachment !== "incus_long_process"
  ) {
    return null;
  }
  const attachmentTarget: MedicalArtAnatomyTarget =
    layer.pistonAttachment === "malleus"
      ? getMedicalArtAnchorForTarget(asset.id, "malleus_manubrium")
        ? "malleus_manubrium"
        : "malleus"
      : asset.id === "servier-inner-ear"
        ? "incus_piston_attachment"
        : "incus_long_process";
  const attachment = targetPoint(asset, fitted, attachmentTarget);
  const footplate = targetPoint(asset, fitted, "stapes_footplate");
  if (!attachment || !footplate) return null;
  const color = markerColor(layer);
  const angle =
    (Math.atan2(footplate.y - attachment.y, footplate.x - attachment.x) * 180) / Math.PI;

  if (layer.technique === "exploration_only") {
    return (
      <ellipse
        cx={footplate.x}
        cy={footplate.y}
        rx="34"
        ry="23"
        transform={`rotate(-12 ${footplate.x} ${footplate.y})`}
        fill="rgba(8,127,120,.10)"
        stroke={color}
        strokeWidth="2.5"
        strokeDasharray="7 4"
      />
    );
  }

  return (
    <g filter="url(#medical-soft-shadow)" data-stapes-piston-attachment-target={attachmentTarget}>
      <ellipse
        cx={attachment.x}
        cy={attachment.y}
        rx="10"
        ry="6"
        transform={`rotate(${angle} ${attachment.x} ${attachment.y})`}
        fill="none"
        stroke="#43535d"
        strokeWidth="3"
      />
      <line
        x1={attachment.x + 5}
        y1={attachment.y + 2}
        x2={footplate.x}
        y2={footplate.y}
        stroke="#43535d"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <line
        x1={attachment.x + 5}
        y1={attachment.y + 2}
        x2={footplate.x}
        y2={footplate.y}
        stroke="url(#medical-metal)"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <ellipse
        cx={footplate.x}
        cy={footplate.y}
        rx={layer.fenestra === "large" ? 11 : 7}
        ry={layer.fenestra === "large" ? 7 : 4.5}
        transform={`rotate(-12 ${footplate.x} ${footplate.y})`}
        fill="#fbf5ef"
        stroke={color}
        strokeWidth="2.5"
      />
    </g>
  );
}

function graftOverlay(
  layer: Extract<SurgeryLayer, { kind: "tm_graft" }>,
  plan: SurgeryPlan,
  asset: MedicalArtAsset,
  fitted: FittedImage,
  x: number,
  y: number,
) {
  if (layer.material === "none" || layer.purpose === "not_documented") {
    return null;
  }
  const color = markerColor(layer);
  const geometry = medicalArtSourceGeometry[asset.id];

  if (layer.purpose === "prosthesis_protection") {
    const targetLayer = plan.layers.find(
      (candidate): candidate is Extract<SurgeryLayer, { kind: "ossicular_reconstruction" }> =>
        candidate.id === layer.targetLayerId && candidate.kind === "ossicular_reconstruction",
    );
    if (
      asset.id === "servier-inner-ear" &&
      targetLayer?.lateralEndpoint === "tympanic_membrane" &&
      (targetLayer.method === "porp" || targetLayer.method === "torp")
    ) {
      const placement = deriveServierProsthesisPlacement(targetLayer.method);
      const cartilage = placement.protectionCartilage;
      return (
        <g
          transform={sourceGeometryTransform(asset, fitted)}
          filter="url(#medical-soft-shadow)"
          data-medical-graft="prosthesis-protection"
          data-graft-calibration={placement.calibrationId}
          data-graft-target={layer.targetLayerId}
          data-graft-source-center={sourcePointData(cartilage.center)}
          data-graft-source-radii={`${cartilage.radiusX},${cartilage.radiusY}`}
          data-graft-depth-order="tm-cartilage-headplate"
        >
          <g
            transform={`translate(${cartilage.center.x} ${cartilage.center.y}) rotate(${cartilage.rotation}) scale(${cartilage.radiusX / 17} ${cartilage.radiusY / 10})`}
          >
            <path
              d="M -16.5 -2 C -15.5 -7.4 -9.2 -9.8 0 -10 C 9.2 -10.2 15.8 -7 17.4 -2 C 18.6 3.8 13.1 8.4 4.4 9.6 C -5.1 11 -13.7 8.2 -16.7 4.1 C -18.4 1.7 -18.2 -0.2 -16.5 -2 Z"
              fill="rgba(204, 167, 126, .79)"
              stroke={color}
              strokeWidth="1.9"
              strokeLinejoin="round"
            />
            <path
              d="M -12.8 -3 C -6.4 -6.5 4.3 -7.1 11.9 -3.6 M -10.2 2.6 C -3.5 -0.2 5.8 -0.1 11.2 2.8 M -7.5 6.2 C -1.8 4.6 4.5 4.8 8.6 6.2"
              fill="none"
              stroke="#f7e6d1"
              strokeWidth="1.25"
              strokeLinecap="round"
              opacity="0.82"
            />
          </g>
        </g>
      );
    }
    const contact = (targetLayer
      ? endpointPoint(asset, fitted, targetLayer.lateralEndpoint, targetLayer.method)
      : null) ??
      targetPoint(asset, fitted, "tm_prosthesis_contact") ??
      targetPoint(asset, fitted, "tympanic_membrane_medial") ?? { x, y };
    const rotation = geometry?.tympanicMembrane?.planeAngle ?? -18;

    return (
      <g
        transform={`translate(${contact.x - 2} ${contact.y + 1}) rotate(${rotation})`}
        filter="url(#medical-soft-shadow)"
        data-medical-graft="prosthesis-protection"
        data-graft-calibration={geometry?.calibrationId ?? "anchor-fallback"}
        data-graft-target={layer.targetLayerId}
      >
        <path
          d="M -23 -7 C -12 -12 10 -12 23 -5 C 25 1 20 8 10 10 C -3 13 -18 10 -24 4 C -26 0 -26 -4 -23 -7 Z"
          fill="rgba(204, 167, 126, .88)"
          stroke={color}
          strokeWidth="2.4"
          strokeLinejoin="round"
        />
        <path
          d="M -17 -2 C -6 -6 8 -6 17 -2 M -13 4 C -3 1 7 1 14 4"
          fill="none"
          stroke="#f7e6d1"
          strokeWidth="1.7"
          strokeLinecap="round"
          opacity="0.86"
        />
      </g>
    );
  }

  if (geometry?.tympanicMembrane) {
    const documentedPoints =
      layer.geometry &&
      (geometry.tympanicMembrane.normalizedFrame || geometry.tympanicMembrane.normalizedSurface)
        ? mapTympanicPolygonToMedicalArtSource(asset.id, layer.geometry)
        : null;
    const repairPath = documentedPoints
      ? smoothClosedSourcePath(documentedPoints)
      : geometry.tympanicMembrane.repairGraftPath;
    const materialFill = {
      temporalis_fascia: "url(#medical-fascia)",
      cartilage: "rgba(204, 167, 126, .82)",
      perichondrium: "rgba(224, 195, 171, .8)",
      fat: "rgba(231, 195, 126, .82)",
      other: "rgba(211, 199, 181, .8)",
      not_documented: "rgba(211, 199, 181, .72)",
      none: "transparent",
    }[layer.material];
    const fillOpacity =
      layer.technique === "lateral" ? 0.9 : layer.technique === "butterfly" ? 0.84 : 0.74;
    return (
      <g
        transform={sourceGeometryTransform(asset, fitted)}
        filter="url(#medical-soft-shadow)"
        data-medical-graft="tympanic-membrane-repair"
        data-graft-calibration={geometry.calibrationId}
        data-graft-geometry={documentedPoints ? "documented-polygon" : "source-full-template"}
        data-graft-technique={layer.technique}
        data-graft-material={layer.material}
      >
        <path
          d={repairPath}
          fill={materialFill}
          fillOpacity={fillOpacity}
          stroke={color}
          strokeWidth="2.4"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d={documentedPoints ? repairPath : geometry.tympanicMembrane.repairHighlightPath}
          fill="none"
          stroke="#f8eee5"
          strokeWidth={documentedPoints ? "1.2" : "2"}
          strokeLinecap="round"
          strokeDasharray={layer.technique === "butterfly" ? "5 3" : undefined}
          opacity={documentedPoints ? "0.72" : "0.9"}
          vectorEffect="non-scaling-stroke"
        />
        {layer.technique === "butterfly" ? (
          <path
            d={repairPath}
            fill="none"
            stroke={color}
            strokeWidth="5.5"
            strokeOpacity="0.24"
            vectorEffect="non-scaling-stroke"
          />
        ) : null}
      </g>
    );
  }

  return (
    <g filter="url(#medical-soft-shadow)" data-medical-graft="tympanic-membrane-repair">
      <path
        d={`M ${x - 28} ${y - 62}
            C ${x - 7} ${y - 70}, ${x + 25} ${y - 48}, ${x + 32} ${y - 12}
            C ${x + 38} ${y + 20}, ${x + 21} ${y + 61}, ${x - 4} ${y + 68}
            C ${x - 25} ${y + 45}, ${x - 37} ${y + 6}, ${x - 28} ${y - 62} Z`}
        fill="url(#medical-fascia)"
        stroke={color}
        strokeWidth="3"
      />
    </g>
  );
}

function sourceTympanicPerforationOverlay(
  layer: Extract<SurgeryLayer, { kind: "tm_perforation" }>,
  asset: MedicalArtAsset,
  fitted: FittedImage,
) {
  const points = deriveMedicalArtTympanicPolygon(asset.id, layer.region, layer.geometry);
  if (!points) return null;
  const path = smoothClosedSourcePath(points);
  return (
    <g
      transform={sourceGeometryTransform(asset, fitted)}
      filter="url(#medical-soft-shadow)"
      data-medical-perforation={layer.region}
      data-perforation-geometry={layer.geometry ? "documented-polygon" : "reviewed-region-template"}
    >
      <path
        d={path}
        fill="rgba(89, 45, 39, .14)"
        stroke={markerColor(layer)}
        strokeWidth="2.25"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d={path}
        fill="none"
        stroke="#f2b39a"
        strokeWidth="0.9"
        strokeDasharray="4 3"
        strokeOpacity="0.78"
        vectorEffect="non-scaling-stroke"
      />
    </g>
  );
}

function procedureOverlay(
  layer: SurgeryLayer,
  plan: SurgeryPlan,
  supportedLayers: readonly SurgeryLayer[],
  asset: MedicalArtAsset,
  fitted: FittedImage,
  x: number,
  y: number,
): ReactNode {
  const color = markerColor(layer);

  switch (layer.kind) {
    case "tm_perforation":
      if (
        medicalArtSourceGeometry[asset.id]?.tympanicMembrane?.normalizedFrame ||
        medicalArtSourceGeometry[asset.id]?.tympanicMembrane?.normalizedSurface
      ) {
        return sourceTympanicPerforationOverlay(layer, asset, fitted);
      }
      return (
        <g filter="url(#medical-soft-shadow)">
          <path
            d={`M ${x - 14} ${y - 23}
                C ${x - 2} ${y - 29}, ${x + 13} ${y - 17}, ${x + 15} ${y - 3}
                C ${x + 19} ${y + 10}, ${x + 6} ${y + 25}, ${x - 6} ${y + 21}
                C ${x - 19} ${y + 16}, ${x - 21} ${y - 10}, ${x - 14} ${y - 23} Z`}
            fill="rgba(89, 45, 39, 0.34)"
            stroke={color}
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <path
            d={`M ${x - 9} ${y - 19} C ${x + 2} ${y - 22}, ${x + 12} ${y - 10}, ${x + 10} ${y + 2}`}
            fill="none"
            stroke="#f2b39a"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.8"
          />
        </g>
      );
    case "tm_graft":
      return graftOverlay(layer, plan, asset, fitted, x, y);
    case "ossicle_state": {
      const absenceHandledByOfficialComponent =
        Boolean(asset.components) &&
        layer.state === "absent" &&
        ["malleus", "incus", "stapes_superstructure", "stapes_footplate"].includes(layer.structure);
      if (absenceHandledByOfficialComponent) return null;
      return lesionOverlay(layer, x, y);
    }
    case "ossicular_reconstruction":
      return reconstructionOverlay(layer, supportedLayers, asset, fitted);
    case "stapes_procedure":
      return stapesOverlay(layer, asset, fitted);
    case "tympanostomy": {
      if (layer.action === "not_documented" || layer.quadrant === "not_documented") {
        return null;
      }
      if (layer.action === "tube_placed" && layer.tubeType !== "short_term") {
        return null;
      }
      const sourcePoint = deriveMedicalArtTympanostomyPoint(asset.id, layer.quadrant);
      const position = sourcePoint ? projectSourcePoint(asset, fitted, sourcePoint) : { x, y };
      const tubeX = position.x;
      const tubeY = position.y;
      const rotation = -15;
      if (layer.action === "myringotomy_only" || layer.action === "tube_not_placed") {
        return (
          <g
            transform={`rotate(${rotation} ${tubeX} ${tubeY})`}
            filter="url(#medical-soft-shadow)"
            data-tympanostomy-rendering={
              layer.action === "myringotomy_only"
                ? "radial-myringotomy"
                : "myringotomy-without-tube"
            }
            data-tympanostomy-quadrant={layer.quadrant}
          >
            <path
              d={`M ${tubeX - 16} ${tubeY} C ${tubeX - 7} ${
                tubeY - 4
              }, ${tubeX + 7} ${tubeY - 4}, ${tubeX + 16} ${tubeY}`}
              fill="none"
              stroke="#f8fbfa"
              strokeWidth="6"
              strokeLinecap="round"
            />
            <path
              d={`M ${tubeX - 16} ${tubeY} C ${tubeX - 7} ${
                tubeY - 4
              }, ${tubeX + 7} ${tubeY - 4}, ${tubeX + 16} ${tubeY}`}
              fill="none"
              stroke={color}
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeDasharray={layer.action === "tube_not_placed" ? "4 2" : undefined}
            />
          </g>
        );
      }
      return (
        <g
          transform={`rotate(${rotation} ${tubeX} ${tubeY})`}
          filter="url(#medical-soft-shadow)"
          data-tympanostomy-rendering="tube-placed"
          data-tympanostomy-quadrant={layer.quadrant}
          data-tympanostomy-type={layer.tubeType}
        >
          <ellipse
            cx={tubeX - 9}
            cy={tubeY}
            rx="14"
            ry="18"
            fill="#e7f2f0"
            stroke="#40545c"
            strokeWidth="2.5"
          />
          <rect
            x={tubeX - 10}
            y={tubeY - 8}
            width="22"
            height="16"
            rx="5"
            fill="url(#medical-tube)"
            stroke="#40545c"
            strokeWidth="2"
          />
          <ellipse
            cx={tubeX + 11}
            cy={tubeY}
            rx="9"
            ry="13"
            fill="#f8fbfa"
            stroke={color}
            strokeWidth="2.5"
          />
          <ellipse cx={tubeX + 11} cy={tubeY} rx="4" ry="7" fill="#35525a" opacity="0.82" />
        </g>
      );
    }
    case "mastoid_technique": {
      const mastoid = targetPoint(asset, fitted, "mastoid") ?? { x, y };
      return (
        <g filter="url(#medical-soft-shadow)">
          <path
            d={`M ${mastoid.x - 55} ${mastoid.y + 30}
                C ${mastoid.x - 61} ${mastoid.y - 20}, ${mastoid.x - 28} ${
                  mastoid.y - 50
                }, ${mastoid.x + 15} ${mastoid.y - 45}
                C ${mastoid.x + 54} ${mastoid.y - 36}, ${mastoid.x + 65} ${
                  mastoid.y + 7
                }, ${mastoid.x + 43} ${mastoid.y + 39}
                C ${mastoid.x + 8} ${mastoid.y + 54}, ${mastoid.x - 27} ${
                  mastoid.y + 51
                }, ${mastoid.x - 55} ${mastoid.y + 30} Z`}
            fill="rgba(8,127,120,.10)"
            stroke={color}
            strokeWidth="3"
            strokeDasharray="8 5"
          />
          <path
            d={`M ${mastoid.x - 37} ${mastoid.y + 23} C ${mastoid.x - 15} ${
              mastoid.y - 16
            }, ${mastoid.x + 20} ${mastoid.y - 25}, ${mastoid.x + 43} ${mastoid.y + 2}`}
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeLinecap="round"
          />
        </g>
      );
    }
    case "cholesteatoma_extent": {
      const regions: ReactNode[] = [];
      if (layer.regions.includes("epitympanum")) {
        const point = targetPoint(asset, fitted, "epitympanum");
        if (point) {
          regions.push(
            <path
              key="epitympanum"
              d={`M ${point.x - 32} ${point.y + 5}
                  C ${point.x - 26} ${point.y - 23}, ${point.x - 4} ${
                    point.y - 31
                  }, ${point.x + 18} ${point.y - 20}
                  C ${point.x + 35} ${point.y - 10}, ${point.x + 30} ${
                    point.y + 14
                  }, ${point.x + 12} ${point.y + 24}
                  C ${point.x - 9} ${point.y + 28}, ${point.x - 28} ${
                    point.y + 20
                  }, ${point.x - 32} ${point.y + 5} Z`}
            />,
          );
        }
      }
      if (layer.regions.includes("mastoid")) {
        const point = targetPoint(asset, fitted, "mastoid");
        if (point) {
          regions.push(
            <path
              key="mastoid"
              d={`M ${point.x - 38} ${point.y + 12}
                  C ${point.x - 35} ${point.y - 26}, ${point.x - 4} ${
                    point.y - 39
                  }, ${point.x + 25} ${point.y - 25}
                  C ${point.x + 45} ${point.y - 9}, ${point.x + 37} ${
                    point.y + 24
                  }, ${point.x + 12} ${point.y + 37}
                  C ${point.x - 17} ${point.y + 39}, ${point.x - 35} ${
                    point.y + 30
                  }, ${point.x - 38} ${point.y + 12} Z`}
            />,
          );
        }
      }
      return (
        <g
          fill="url(#medical-cholesteatoma)"
          stroke={color}
          strokeWidth="2.5"
          filter="url(#medical-soft-shadow)"
        >
          {regions}
        </g>
      );
    }
    case "cochlear_insertion": {
      const roundWindow = targetPoint(asset, fitted, "round_window") ?? { x, y };
      const cochlea = targetPoint(asset, fitted, "cochlea") ?? { x: x + 40, y };
      const centerX = cochlea.x + 1;
      const centerY = cochlea.y + 2;
      return (
        <g
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#medical-soft-shadow)"
        >
          <path
            d={`M ${roundWindow.x - 34} ${roundWindow.y + 18}
                C ${roundWindow.x - 18} ${roundWindow.y + 5}, ${
                  roundWindow.x - 5
                } ${roundWindow.y - 2}, ${roundWindow.x + 3} ${roundWindow.y - 4}
                C ${centerX - 20} ${centerY + 31}, ${centerX + 30} ${
                  centerY + 26
                }, ${centerX + 33} ${centerY - 5}
                C ${centerX + 34} ${centerY - 31}, ${centerX - 8} ${
                  centerY - 39
                }, ${centerX - 24} ${centerY - 17}
                C ${centerX - 38} ${centerY + 3}, ${centerX - 9} ${
                  centerY + 16
                }, ${centerX + 5} ${centerY + 5}
                C ${centerX + 14} ${centerY - 3}, ${centerX + 2} ${
                  centerY - 12
                }, ${centerX - 5} ${centerY - 6}`}
            stroke="#3e5059"
            strokeWidth="8"
          />
          <path
            d={`M ${roundWindow.x - 34} ${roundWindow.y + 18}
                C ${roundWindow.x - 18} ${roundWindow.y + 5}, ${
                  roundWindow.x - 5
                } ${roundWindow.y - 2}, ${roundWindow.x + 3} ${roundWindow.y - 4}
                C ${centerX - 20} ${centerY + 31}, ${centerX + 30} ${
                  centerY + 26
                }, ${centerX + 33} ${centerY - 5}
                C ${centerX + 34} ${centerY - 31}, ${centerX - 8} ${
                  centerY - 39
                }, ${centerX - 24} ${centerY - 17}
                C ${centerX - 38} ${centerY + 3}, ${centerX - 9} ${
                  centerY + 16
                }, ${centerX + 5} ${centerY + 5}
                C ${centerX + 14} ${centerY - 3}, ${centerX + 2} ${
                  centerY - 12
                }, ${centerX - 5} ${centerY - 6}`}
            stroke="#d9eeeb"
            strokeWidth="4"
          />
          <circle
            cx={roundWindow.x}
            cy={roundWindow.y}
            r="8"
            fill="#f8fbfa"
            stroke={color}
            strokeWidth="3"
          />
          {[0, 1, 2, 3].map((index) => (
            <circle
              key={index}
              cx={centerX + 30 - index * 13}
              cy={centerY - 6 - index * 8}
              r="2.2"
              fill={color}
              stroke="none"
            />
          ))}
        </g>
      );
    }
    case "bone_conduction_implant":
      return (
        <g filter="url(#medical-soft-shadow)">
          <circle
            cx={x}
            cy={y}
            r="37"
            fill="rgba(223,235,231,.88)"
            stroke="#40545c"
            strokeWidth="3"
          />
          <circle cx={x} cy={y} r="29" fill="none" stroke={color} strokeWidth="4" />
          <circle
            cx={x}
            cy={y}
            r="11"
            fill="url(#medical-metal)"
            stroke="#40545c"
            strokeWidth="2.5"
          />
          {[0, 120, 240].map((angle) => {
            const radians = (angle * Math.PI) / 180;
            return (
              <circle
                key={angle}
                cx={x + Math.cos(radians) * 21}
                cy={y + Math.sin(radians) * 21}
                r="2.5"
                fill="#40545c"
              />
            );
          })}
        </g>
      );
    case "canalplasty":
      return (
        <g fill="none" strokeLinecap="round" filter="url(#medical-soft-shadow)">
          <path
            d={`M ${x - 72} ${y - 25} C ${x - 38} ${y - 42}, ${x + 10} ${
              y - 38
            }, ${x + 66} ${y - 14}`}
            stroke="#f4d96e"
            strokeWidth="10"
            opacity="0.75"
          />
          <path
            d={`M ${x - 72} ${y + 25} C ${x - 35} ${y + 43}, ${x + 13} ${
              y + 39
            }, ${x + 67} ${y + 16}`}
            stroke="#f4d96e"
            strokeWidth="10"
            opacity="0.75"
          />
          <path
            d={`M ${x - 74} ${y - 25} C ${x - 38} ${y - 48}, ${x + 15} ${
              y - 42
            }, ${x + 68} ${y - 14}
               M ${x - 74} ${y + 25} C ${x - 36} ${y + 48}, ${x + 16} ${
                 y + 43
               }, ${x + 68} ${y + 16}`}
            stroke={color}
            strokeWidth="3.5"
          />
          <path
            d={`M ${x - 8} ${y - 31} L ${x + 2} ${y - 21} M ${x - 10} ${y + 31} L ${x + 1} ${y + 21}`}
            stroke="#fff8df"
            strokeWidth="4"
          />
        </g>
      );
    case "eustachian_tube_dilation":
      return (
        <g transform={`rotate(31 ${x} ${y})`} filter="url(#medical-soft-shadow)">
          <line
            x1={x - 83}
            y1={y}
            x2={x + 84}
            y2={y}
            stroke="#3f535c"
            strokeWidth="6"
            strokeLinecap="round"
          />
          <line
            x1={x - 83}
            y1={y}
            x2={x + 84}
            y2={y}
            stroke="#d8ece9"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d={`M ${x - 36} ${y}
                C ${x - 29} ${y - 16}, ${x + 27} ${y - 16}, ${x + 36} ${y}
                C ${x + 27} ${y + 16}, ${x - 29} ${y + 16}, ${x - 36} ${y} Z`}
            fill="rgba(171,224,217,.55)"
            stroke={color}
            strokeWidth="3"
          />
          <line
            x1={x - 28}
            y1={y - 9}
            x2={x + 28}
            y2={y - 9}
            stroke="#f7ffff"
            strokeWidth="2"
            opacity="0.8"
          />
        </g>
      );
    case "tm_state":
      if (layer.state !== "retraction") return null;
      return (
        <path
          d={`M ${x - 18} ${y - 42}
              C ${x + 1} ${y - 25}, ${x + 8} ${y - 4}, ${x - 1} ${y + 18}
              C ${x - 7} ${y + 30}, ${x - 5} ${y + 39}, ${x + 8} ${y + 47}`}
          transform={`rotate(-17 ${x} ${y})`}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
        />
      );
    case "intraoperative_deviation":
    case "verification_status":
      return null;
  }
}

export function MedicalIllustrationDiagram({
  plan,
  phase,
  presentationMode = "postoperative_summary",
  selectedLayerId,
  onLayerSelect,
}: MedicalIllustrationDiagramProps) {
  const id = useId().replaceAll(":", "");
  const asset = selectMedicalArtAsset(plan);
  const fittedImage = fitMedicalArt(asset);
  const activeLayers = getActiveSurgeryLayers(plan);
  const phaseLayers = activeLayers.filter((layer) => isVisibleInPhase(layer, phase));
  const supportedProjectedLayers = activeLayers.flatMap((layer) => {
    if (layer.documentation !== "documented") return [];
    const anchor = getMedicalArtAnchor(asset.id, layer);
    if (!anchor) return [];
    const descriptor = resolveMedicalArtCalloutDescriptor(
      layer,
      plan,
      asset,
      fittedImage,
      presentationMode,
    );
    if (!descriptor) return [];
    const position = projectAnchor(fittedImage, anchor);
    return [{ layer, descriptor, ...position }];
  });
  const supportedLayers = supportedProjectedLayers.map(({ layer }) => layer);
  const projectedLayers = supportedProjectedLayers.filter(({ layer }) =>
    isVisibleInPhase(layer, phase),
  );
  const visibleLayers = projectedLayers.map(({ layer }) => layer);
  const visibleLayerIds = new Set(visibleLayers.map((layer) => layer.id));
  const unillustratedLayers = phaseLayers.filter(
    (layer) => !visibleLayerIds.has(layer.id) && shouldReportUnillustratedLayer(layer),
  );
  const legendRowStartY = 154;
  const legendRowSpacing = 51;
  const legendRowCount = visibleLayers.length + unillustratedLayers.length;
  const legendBottom = Math.max(
    532,
    legendRowCount > 0 ? legendRowStartY + (legendRowCount - 1) * legendRowSpacing + 19 : 532,
  );
  const provenanceY = legendBottom + 47;
  const panelHeight = provenanceY + 41;
  const heading = phaseLabel(phase, presentationMode);
  const mirrorAnatomy = plan.laterality === "left";
  const mirrorConstant = fittedImage.x * 2 + fittedImage.width;
  const mirrorTransform = mirrorAnatomy ? `translate(${mirrorConstant} 0) scale(-1 1)` : undefined;
  const callouts = layoutNumberedMedicalArtCallouts(
    projectedLayers.map(({ descriptor }, index) => ({
      descriptor,
      legendNumber: index + 1,
    })),
    {
      railX: 631,
      top: imageFrame.y,
      bottom: legendBottom,
      badgeRadius: 10.5,
      badgeStrokeWidth: 1.5,
      badgeClearance: 1,
      minCenterSpacing: 26,
      endpointClearance: 4,
      mirrorConstant: mirrorAnatomy ? mirrorConstant : undefined,
    },
  );
  const maskProjectedLayers = supportedProjectedLayers.filter(({ layer }) => isRemovalLayer(layer));
  const hasRemoval = !asset.components && maskProjectedLayers.length > 0;
  const perforationPaths = sourcePerforationPaths(supportedLayers, asset);
  const overlayZIndex = (layer: SurgeryLayer) => {
    if (layer.kind === "tm_graft" && layer.purpose === "prosthesis_protection") return 30;
    if (layer.kind === "ossicular_reconstruction") return 20;
    if (layer.kind === "tm_graft" && layer.technique === "lateral") return 60;
    if (layer.kind === "tm_graft") return 40;
    return 0;
  };
  const renderLayers = [...projectedLayers].sort(
    (first, second) => overlayZIndex(first.layer) - overlayZIndex(second.layer),
  );
  const deepRenderLayers = renderLayers.filter(({ layer }) => overlayZIndex(layer) < 50);
  const superficialRenderLayers = renderLayers.filter(({ layer }) => overlayZIndex(layer) >= 50);
  const supportsTympanicForeground =
    Boolean(asset.components) ||
    Boolean(medicalArtSourceGeometry[asset.id]?.tympanicMembrane?.normalizedSurface);
  const needsTympanicForeground =
    supportsTympanicForeground &&
    phase === "procedure" &&
    deepRenderLayers.some(({ layer }) => {
      if (
        layer.kind === "ossicular_reconstruction" &&
        layer.lateralEndpoint === "tympanic_membrane"
      ) {
        return true;
      }
      return (
        layer.kind === "tm_graft" &&
        (layer.purpose === "prosthesis_protection" ||
          layer.technique === "medial" ||
          layer.technique === "butterfly")
      );
    });

  const legendNumberByLayerId = new Map(visibleLayers.map((layer, index) => [layer.id, index + 1]));
  const activate = (layerId: string) => onLayerSelect?.(layerId);
  const layerSelectionEnabled = Boolean(onLayerSelect);
  const handleKeyboard = (event: KeyboardEvent<SVGGElement>, layerId: string) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    activate(layerId);
  };
  const renderInteractiveLayer = ({ layer, x, y }: (typeof renderLayers)[number]) => {
    const selected = selectedLayerId === layer.id;
    const legendNumber = legendNumberByLayerId.get(layer.id);
    const accessibleLabel = legendNumber
      ? `Callout ${legendNumber}: ${labelSurgeryLayer(layer)}`
      : labelSurgeryLayer(layer);
    return (
      <g
        key={`${phase}-${layer.id}`}
        role={layerSelectionEnabled ? "button" : undefined}
        tabIndex={layerSelectionEnabled ? 0 : undefined}
        aria-label={layerSelectionEnabled ? accessibleLabel : undefined}
        aria-pressed={layerSelectionEnabled ? selected : undefined}
        className={cn("medical-panel-hotspot", selected && "is-selected")}
        onClick={layerSelectionEnabled ? () => activate(layer.id) : undefined}
        onKeyDown={layerSelectionEnabled ? (event) => handleKeyboard(event, layer.id) : undefined}
        data-layer-selectable={layerSelectionEnabled}
        data-anatomy-layer={layer.kind}
        data-layer-id={layer.id}
        data-legend-number={legendNumber}
      >
        {procedureOverlay(layer, plan, supportedLayers, asset, fittedImage, x, y)}
      </g>
    );
  };

  return (
    <section
      className="medical-illustration-panel"
      aria-label={`${heading}: ${asset.title}`}
      data-medical-illustration={asset.id}
      data-anatomy-orientation={mirrorAnatomy ? "mirrored-left" : "source-right"}
    >
      <svg
        viewBox={`0 0 1000 ${panelHeight}`}
        className="diagram-svg medical-illustration-svg"
        role="group"
        aria-labelledby={`${id}-title ${id}-description`}
        data-visible-layer-count={visibleLayers.length}
        data-spatial-callout-count={callouts.length}
        data-nonspatial-layer-count={phaseLayers.length - visibleLayers.length}
        data-unillustrated-layer-count={unillustratedLayers.length}
      >
        <title id={`${id}-title`}>{heading}</title>
        <desc id={`${id}-description`}>
          Licensed medical illustration with calibrated deterministic surgical overlays. Numbered
          pointers match the layer list and stop outside the protected annotation geometry. Generic
          anatomy; not patient-specific and not to scale.
        </desc>

        <defs>
          <linearGradient id="medical-metal" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#f8fbfc" />
            <stop offset="0.35" stopColor="#aebcc1" />
            <stop offset="0.62" stopColor="#edf3f4" />
            <stop offset="1" stopColor="#7f929a" />
          </linearGradient>
          <linearGradient id="medical-tube" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#eff8f6" />
            <stop offset="0.5" stopColor="#9ed7d1" />
            <stop offset="1" stopColor="#f7fbfa" />
          </linearGradient>
          <pattern
            id="medical-fascia"
            width="8"
            height="8"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(-18)"
          >
            <rect width="8" height="8" fill="rgba(207,185,158,.72)" />
            <path d="M 0 2 H 8 M 0 6 H 8" stroke="#f5e9d9" strokeWidth="1.2" opacity="0.72" />
          </pattern>
          <pattern
            id="medical-fixation-hatch"
            width="7"
            height="7"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(28)"
          >
            <rect width="7" height="7" fill="rgba(185,87,58,.12)" />
            <path d="M 0 0 V 7" stroke="#b9573a" strokeWidth="2" opacity="0.65" />
          </pattern>
          <pattern id="medical-cholesteatoma" width="12" height="12" patternUnits="userSpaceOnUse">
            <rect width="12" height="12" fill="rgba(247,239,211,.88)" />
            <circle cx="3" cy="3" r="1.4" fill="#d8c797" />
            <circle cx="9" cy="8" r="1.8" fill="#fffdf2" />
          </pattern>
          <filter id="medical-soft-shadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow
              dx="0"
              dy="1.5"
              stdDeviation="1.8"
              floodColor="#17302d"
              floodOpacity="0.24"
            />
          </filter>
          {asset.components ? (
            <>
              <clipPath id={`${id}-incus-retained`} clipPathUnits="userSpaceOnUse">
                <path
                  d={medicalArtSourceGeometry[asset.id]?.ossicles?.incusLongProcessRetainedClipPath}
                />
              </clipPath>
              <clipPath id={`${id}-stapes-footplate`} clipPathUnits="userSpaceOnUse">
                <path
                  d={medicalArtSourceGeometry[asset.id]?.ossicles?.stapesFootplateRetainedClipPath}
                />
              </clipPath>
            </>
          ) : null}
          {medicalArtSourceGeometry[asset.id]?.tympanicMembrane ? (
            <>
              <clipPath id={`${id}-tympanic-surface`} clipPathUnits="userSpaceOnUse">
                <path d={medicalArtSourceGeometry[asset.id]?.tympanicMembrane?.repairGraftPath} />
              </clipPath>
              <mask
                id={`${id}-tympanic-membrane`}
                maskUnits="userSpaceOnUse"
                x="0"
                y="0"
                width={asset.width}
                height={asset.height}
              >
                <rect x="0" y="0" width={asset.width} height={asset.height} fill="white" />
                {perforationPaths.map((perforation) => (
                  <path key={perforation.id} d={perforation.path} fill="black" />
                ))}
              </mask>
            </>
          ) : null}
          <mask id={`${id}-anatomy-mask`} maskUnits="userSpaceOnUse">
            <rect
              x={fittedImage.x}
              y={fittedImage.y}
              width={fittedImage.width}
              height={fittedImage.height}
              fill="white"
            />
            {maskProjectedLayers.map(({ layer, x, y }) => (
              <g key={`mask-${layer.id}`}>{anatomyRemovalShape(layer, asset, fittedImage, x, y)}</g>
            ))}
          </mask>
        </defs>

        <rect
          x="8"
          y="8"
          width="984"
          height={panelHeight - 16}
          rx="26"
          className="medical-panel-shell"
        />
        <text x="32" y="40" className="medical-panel-eyebrow">
          {heading}
        </text>
        <text x="32" y="64" className="medical-panel-title">
          {asset.title}
        </text>
        <text x="966" y="48" textAnchor="end" className="medical-panel-side">
          {lateralityLabel(plan)}
        </text>

        <rect
          x={imageFrame.x}
          y={imageFrame.y}
          width={imageFrame.width}
          height={imageFrame.height}
          rx="18"
          className="medical-panel-image-bg"
        />
        <g
          className="medical-panel-callout-leaders"
          aria-hidden="true"
          pointerEvents="none"
          data-callout-render-order="beneath-anatomy-and-overlays"
        >
          {callouts.flatMap((callout) =>
            callout.leaders.map((leader, leaderIndex) => (
              <g
                key={`leader-${phase}-${callout.layer.id}-${leaderIndex}`}
                data-medical-callout-leader={callout.layer.id}
                data-callout-legend-number={callout.legendNumber}
                data-callout-target={medicalArtCalloutPointData(leader.target)}
                data-callout-target-source={
                  leader.sourcePoint ? medicalArtCalloutPointData(leader.sourcePoint) : undefined
                }
                data-callout-protected-bounds={medicalArtCalloutRectData(leader.protectedBounds)}
                data-callout-start={medicalArtCalloutPointData(leader.start)}
                data-callout-end={medicalArtCalloutPointData(leader.end)}
                data-callout-basis={leader.basis}
              >
                <line
                  x1={leader.start.x}
                  y1={leader.start.y}
                  x2={leader.end.x}
                  y2={leader.end.y}
                  className="medical-panel-callout-halo"
                />
                <line
                  x1={leader.start.x}
                  y1={leader.start.y}
                  x2={leader.end.x}
                  y2={leader.end.y}
                  stroke={markerColor(callout.layer)}
                  className="medical-panel-callout-line"
                />
              </g>
            )),
          )}
        </g>
        <g
          transform={mirrorTransform}
          data-anatomy-source-transform={mirrorTransform ?? "identity"}
        >
          {asset.components ? (
            layeredMedicalArt(supportedLayers, phase, asset, fittedImage, id)
          ) : (
            <image
              href={asset.localPath}
              x={fittedImage.x}
              y={fittedImage.y}
              width={fittedImage.width}
              height={fittedImage.height}
              preserveAspectRatio="xMidYMid meet"
              mask={hasRemoval ? `url(#${id}-anatomy-mask)` : undefined}
              data-medical-art-source={asset.sourcePage}
              data-medical-art-license={asset.license}
            />
          )}
        </g>

        <g
          className="medical-panel-callout-terminals"
          aria-hidden="true"
          pointerEvents="none"
          data-callout-terminal-render-order="above-anatomy-beneath-overlays"
        >
          {callouts.flatMap((callout) =>
            callout.leaders.map((leader, leaderIndex) => {
              const tick = leaderTerminalTick(leader.start, leader.end);
              return (
                <g
                  key={`terminal-${phase}-${callout.layer.id}-${leaderIndex}`}
                  data-medical-callout-visible-terminal={callout.layer.id}
                  data-callout-legend-number={callout.legendNumber}
                  data-callout-terminal-center={medicalArtCalloutPointData(leader.end)}
                >
                  <line
                    x1={leader.end.x}
                    y1={leader.end.y}
                    x2={tick.x}
                    y2={tick.y}
                    className="medical-panel-callout-halo"
                  />
                  <line
                    x1={leader.end.x}
                    y1={leader.end.y}
                    x2={tick.x}
                    y2={tick.y}
                    stroke={markerColor(callout.layer)}
                    className="medical-panel-callout-line"
                  />
                  <circle
                    cx={leader.end.x}
                    cy={leader.end.y}
                    r="2.4"
                    fill="#ffffff"
                    stroke={markerColor(callout.layer)}
                    className="medical-panel-callout-terminal"
                  />
                </g>
              );
            }),
          )}
        </g>

        <g
          transform={mirrorTransform}
          data-overlay-source-transform={mirrorTransform ?? "identity"}
        >
          {deepRenderLayers.map(renderInteractiveLayer)}
          {needsTympanicForeground
            ? asset.components
              ? layeredMedicalArt(supportedLayers, phase, asset, fittedImage, id, true)
              : sourceTympanicForeground(asset, fittedImage, id)
            : null}
          {superficialRenderLayers.map(renderInteractiveLayer)}
        </g>

        <g
          className="medical-panel-callout-badges"
          aria-hidden="true"
          pointerEvents="none"
          data-callout-rail-x="631"
        >
          {callouts.map((callout) => (
            <g
              key={`badge-${phase}-${callout.layer.id}`}
              className={cn(
                "medical-panel-callout-badge",
                selectedLayerId === callout.layer.id && "is-selected",
              )}
              data-medical-callout={callout.layer.id}
              data-layer-id={callout.layer.id}
              data-callout-legend-number={callout.legendNumber}
              data-callout-badge-center={medicalArtCalloutPointData(callout.badgeCenter)}
            >
              <circle
                cx={callout.badgeCenter.x}
                cy={callout.badgeCenter.y}
                r="10.5"
                fill={markerColor(callout.layer)}
              />
              <text
                x={callout.badgeCenter.x}
                y={callout.badgeCenter.y}
                dy="0.34em"
                textAnchor="middle"
                className="medical-panel-callout-number"
              >
                {callout.legendNumber}
              </text>
            </g>
          ))}
        </g>

        <rect
          x="646"
          y="78"
          width="326"
          height={legendBottom - 78}
          rx="18"
          className="medical-panel-legend-bg"
        />
        <text x="664" y="112" className="medical-panel-legend-heading">
          Layers
        </text>
        <text x="946" y="112" textAnchor="end" className="medical-panel-count">
          {legendRowCount}
        </text>

        {legendRowCount > 0 ? (
          <>
            {visibleLayers.map((layer, index) => {
              const y = legendRowStartY + index * legendRowSpacing;
              const lines = wrapLabel(labelSurgeryLayer(layer));
              const selected = selectedLayerId === layer.id;
              const accessibleLabel = `Callout ${index + 1}: ${labelSurgeryLayer(layer)}`;
              return (
                <g
                  key={`legend-${phase}-${layer.id}`}
                  role={layerSelectionEnabled ? "button" : undefined}
                  tabIndex={layerSelectionEnabled ? 0 : undefined}
                  aria-label={layerSelectionEnabled ? accessibleLabel : undefined}
                  aria-pressed={layerSelectionEnabled ? selected : undefined}
                  className={cn("medical-panel-legend-row", selected && "is-selected")}
                  onClick={layerSelectionEnabled ? () => activate(layer.id) : undefined}
                  onKeyDown={
                    layerSelectionEnabled ? (event) => handleKeyboard(event, layer.id) : undefined
                  }
                  data-layer-selectable={layerSelectionEnabled}
                  data-medical-legend-layer={layer.id}
                  data-layer-id={layer.id}
                  data-legend-number={index + 1}
                >
                  <rect x="654" y={y - 25} width="302" height="44" rx="11" />
                  <circle cx="678" cy={y - 3} r="14" fill={markerColor(layer)} />
                  <text x="678" y={y + 2} textAnchor="middle" className="medical-panel-number">
                    {index + 1}
                  </text>
                  <text x="704" y={y - (lines.length > 1 ? 8 : 0)} className="medical-panel-label">
                    {lines.map((line, lineIndex) => (
                      <tspan key={line} x="704" dy={lineIndex === 0 ? 0 : 15}>
                        {line}
                      </tspan>
                    ))}
                  </text>
                </g>
              );
            })}
            {unillustratedLayers.map((layer, index) => {
              const y = legendRowStartY + (visibleLayers.length + index) * legendRowSpacing;
              const fullLabel = labelSurgeryLayer(layer);
              const compactLabel =
                fullLabel.length > 32 ? `${fullLabel.slice(0, 29).trimEnd()}…` : fullLabel;
              return (
                <g
                  key={`unillustrated-${phase}-${layer.id}`}
                  role="note"
                  aria-label={`${fullLabel}. Not illustrated because no reviewed spatial rendering is available.`}
                  data-medical-unillustrated-layer={layer.id}
                  data-layer-id={layer.id}
                >
                  <rect
                    x="654"
                    y={y - 25}
                    width="302"
                    height="44"
                    rx="11"
                    className="medical-panel-unillustrated-row"
                  />
                  <circle
                    cx="678"
                    cy={y - 3}
                    r="14"
                    className="medical-panel-unillustrated-marker"
                  />
                  <text
                    x="678"
                    y={y + 2}
                    textAnchor="middle"
                    className="medical-panel-unillustrated-symbol"
                  >
                    —
                  </text>
                  <text x="704" y={y - 5} className="medical-panel-label">
                    {compactLabel}
                  </text>
                  <text x="704" y={y + 11} className="medical-panel-unillustrated-label">
                    Not illustrated
                  </text>
                </g>
              );
            })}
          </>
        ) : (
          <text x="664" y="164" className="medical-panel-empty-title">
            No layers
          </text>
        )}

        <text x="32" y={provenanceY} className="medical-panel-provenance">
          {asset.attribution} · {asset.license}
        </text>
        <text x="966" y={provenanceY} textAnchor="end" className="medical-panel-provenance">
          Generic anatomy · not to scale
        </text>
      </svg>
      {legendRowCount > 0 ? (
        <ol className="medical-mobile-callout-key" aria-hidden="true">
          {visibleLayers.map((layer, index) => (
            <li
              key={`mobile-callout-${phase}-${layer.id}`}
              data-mobile-callout-layer={layer.id}
              data-layer-id={layer.id}
              data-legend-number={index + 1}
            >
              <span
                className="medical-mobile-callout-number"
                style={{ backgroundColor: markerColor(layer) }}
              >
                {index + 1}
              </span>
              <span className="medical-mobile-callout-label">{labelSurgeryLayer(layer)}</span>
            </li>
          ))}
          {unillustratedLayers.map((layer) => (
            <li
              key={`mobile-unillustrated-${phase}-${layer.id}`}
              className="is-unillustrated"
              data-mobile-unillustrated-layer={layer.id}
              data-layer-id={layer.id}
            >
              <span className="medical-mobile-callout-number">—</span>
              <span className="medical-mobile-callout-label">
                {labelSurgeryLayer(layer)}
                <small>Not illustrated</small>
              </span>
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}

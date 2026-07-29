"use client";

import { useId, type KeyboardEvent, type ReactNode } from "react";
import type { EducationMode } from "@/domain/educationMode";
import { labelSurgeryLayer } from "@/domain/diagramLabels";
import {
  getMedicalArtAnchor,
  getMedicalArtAnchorForTarget,
  selectMedicalArtAsset,
  type MedicalArtAnchor,
  type MedicalArtAnatomyTarget,
  type MedicalArtAsset,
} from "@/domain/medicalArt";
import {
  getActiveSurgeryLayers,
  type SurgeryLayer,
  type SurgeryPlan,
} from "@/domain/surgeryPlan";
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

function projectAnchor(fitted: FittedImage, anchor: MedicalArtAnchor) {
  return {
    x: fitted.x + (anchor.x / 100) * fitted.width,
    y: fitted.y + (anchor.y / 100) * fitted.height,
  };
}

function targetPoint(
  asset: MedicalArtAsset,
  fitted: FittedImage,
  target: MedicalArtAnatomyTarget,
) {
  const anchor = getMedicalArtAnchorForTarget(asset.id, target);
  return anchor ? projectAnchor(fitted, anchor) : null;
}

function isVisibleInPhase(layer: SurgeryLayer, phase: MedicalIllustrationPhase) {
  if (layer.documentation !== "documented") return false;
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
  return [
    "eroded",
    "long_process_eroded",
    "body_eroded",
    "discontinuous",
  ].includes(layer.state);
}

function anatomyRemovalShape(layer: SurgeryLayer, x: number, y: number): ReactNode {
  if (layer.kind === "tm_perforation") {
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
    return <ellipse cx={x} cy={y} rx="12" ry="10" fill="black" transform={`rotate(-12 ${x} ${y})`} />;
  }
  if (layer.state === "body_eroded") {
    return (
      <path
        d={`M ${x - 17} ${y - 13} C ${x - 6} ${y - 22}, ${x + 14} ${
          y - 17
        }, ${x + 19} ${y - 3} C ${x + 17} ${y + 14}, ${x + 3} ${
          y + 22
        }, ${x - 13} ${y + 15} C ${x - 22} ${y + 8}, ${x - 23} ${
          y - 5
        }, ${x - 17} ${y - 13} Z`}
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
        }, ${x - 16} ${y + 6} C ${x - 20} ${y - 1}, ${x - 18} ${
          y - 7
        }, ${x - 13} ${y - 12} Z`}
        fill="black"
      />
    );
  }
  return null;
}

function lesionOverlay(layer: Extract<SurgeryLayer, { kind: "ossicle_state" }>, x: number, y: number) {
  const color = markerColor(layer);
  const fill = markerFill(layer);

  if (
    layer.state === "long_process_eroded" ||
    layer.state === "body_eroded" ||
    layer.state === "eroded" ||
    layer.state === "discontinuous"
  ) {
    const longProcess = layer.state === "long_process_eroded";
    return (
      <g className="medical-lesion" filter="url(#medical-soft-shadow)">
        <path
          d={
            longProcess
              ? `M ${x - 19} ${y - 7}
                 L ${x - 10} ${y - 14} L ${x - 2} ${y - 9} L ${x + 7} ${
                   y - 14
                 }
                 L ${x + 19} ${y - 5} L ${x + 13} ${y + 8} L ${x + 4} ${
                   y + 12
                 }
                 L ${x - 5} ${y + 8} L ${x - 15} ${y + 12} Z`
              : `M ${x - 16} ${y - 12}
                 C ${x - 4} ${y - 21}, ${x + 15} ${y - 15}, ${x + 18} ${y}
                 C ${x + 13} ${y + 16}, ${x - 5} ${y + 20}, ${x - 17} ${
                   y + 8
                 }
                 C ${x - 22} ${y}, ${x - 21} ${y - 7}, ${x - 16} ${y - 12} Z`
          }
          transform={longProcess ? `rotate(-12 ${x} ${y})` : undefined}
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
        <ellipse cx={x} cy={y} rx="34" ry="24" fill={fill} strokeWidth="2.5" strokeDasharray="6 5" />
        <path d={`M ${x - 24} ${y + 17} C ${x - 6} ${y + 27}, ${x + 17} ${y + 25}, ${x + 29} ${y + 10}`} strokeWidth="2" opacity="0.72" />
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
) {
  const targetByEndpoint: Partial<
    Record<typeof endpoint, MedicalArtAnatomyTarget>
  > = {
    tympanic_membrane: "tympanic_membrane_medial",
    malleus: "malleus",
    incus_long_process: "incus_long_process",
    incus_body: "incus_body",
    incudostapedial_joint: "incudostapedial_joint",
    stapes_capitulum: "stapes_superstructure",
    stapes_superstructure: "stapes_superstructure",
    stapes_footplate: "stapes_footplate",
  };
  const target = targetByEndpoint[endpoint];
  return target ? targetPoint(asset, fitted, target) : null;
}

function reconstructionOverlay(
  layer: Extract<SurgeryLayer, { kind: "ossicular_reconstruction" }>,
  asset: MedicalArtAsset,
  fitted: FittedImage,
) {
  const lateral = endpointPoint(asset, fitted, layer.lateralEndpoint);
  const medial = endpointPoint(asset, fitted, layer.medialEndpoint);
  if (!lateral || !medial || layer.method === "none" || layer.method === "not_documented") {
    return null;
  }
  const color = markerColor(layer);
  const angle = (Math.atan2(medial.y - lateral.y, medial.x - lateral.x) * 180) / Math.PI;
  const midpoint = { x: (lateral.x + medial.x) / 2, y: (lateral.y + medial.y) / 2 };

  if (layer.method === "bone_cement_bridge") {
    return (
      <g filter="url(#medical-soft-shadow)">
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
        <path d="M -29 -2 C -8 -7, 14 -6, 29 -2" fill="none" stroke="#fff3dc" strokeWidth="2" opacity="0.8" />
      </g>
    );
  }

  return (
    <g filter="url(#medical-soft-shadow)">
      <line
        x1={lateral.x}
        y1={lateral.y}
        x2={medial.x}
        y2={medial.y}
        stroke="#43535d"
        strokeWidth="10"
        strokeLinecap="round"
      />
      <line
        x1={lateral.x}
        y1={lateral.y}
        x2={medial.x}
        y2={medial.y}
        stroke="url(#medical-metal)"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <ellipse
        cx={lateral.x}
        cy={lateral.y}
        rx={layer.method === "porp" ? 18 : 15}
        ry="8"
        transform={`rotate(${angle} ${lateral.x} ${lateral.y})`}
        fill="url(#medical-metal)"
        stroke="#43535d"
        strokeWidth="2.5"
      />
      <ellipse
        cx={medial.x}
        cy={medial.y}
        rx="9"
        ry="6"
        transform={`rotate(${angle} ${medial.x} ${medial.y})`}
        fill="#eef4f3"
        stroke={color}
        strokeWidth="2.5"
      />
    </g>
  );
}

function stapesOverlay(
  layer: Extract<SurgeryLayer, { kind: "stapes_procedure" }>,
  asset: MedicalArtAsset,
  fitted: FittedImage,
) {
  const attachment =
    layer.pistonAttachment === "malleus"
      ? targetPoint(asset, fitted, "malleus")
      : targetPoint(asset, fitted, "incus_long_process");
  const footplate = targetPoint(asset, fitted, "stapes_footplate");
  if (!attachment || !footplate) return null;
  const color = markerColor(layer);
  const angle = (Math.atan2(footplate.y - attachment.y, footplate.x - attachment.x) * 180) / Math.PI;

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
    <g filter="url(#medical-soft-shadow)">
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

function procedureOverlay(
  layer: SurgeryLayer,
  asset: MedicalArtAsset,
  fitted: FittedImage,
  x: number,
  y: number,
): ReactNode {
  const color = markerColor(layer);

  switch (layer.kind) {
    case "tm_perforation":
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
            d={`M ${x - 9} ${y - 19} C ${x + 2} ${y - 22}, ${x + 12} ${
              y - 10
            }, ${x + 10} ${y + 2}`}
            fill="none"
            stroke="#f2b39a"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.8"
          />
        </g>
      );
    case "tm_graft": {
      if (layer.purpose === "prosthesis_protection") {
        const cap = targetPoint(asset, fitted, "tympanic_membrane_medial") ?? { x, y };
        return (
          <g transform={`rotate(-18 ${cap.x} ${cap.y})`} filter="url(#medical-soft-shadow)">
            <path
              d={`M ${cap.x - 24} ${cap.y - 10}
                  C ${cap.x - 10} ${cap.y - 20}, ${cap.x + 17} ${
                    cap.y - 17
                  }, ${cap.x + 26} ${cap.y - 3}
                  C ${cap.x + 18} ${cap.y + 12}, ${cap.x - 8} ${
                    cap.y + 17
                  }, ${cap.x - 24} ${cap.y + 7} Z`}
              fill="#d4b38e"
              stroke={color}
              strokeWidth="2.5"
            />
            <path d={`M ${cap.x - 15} ${cap.y} Q ${cap.x} ${cap.y - 8} ${cap.x + 17} ${cap.y - 1}`} fill="none" stroke="#f7e6d1" strokeWidth="2" />
          </g>
        );
      }
      return (
        <g filter="url(#medical-soft-shadow)">
          <path
            d={`M ${x - 28} ${y - 62}
                C ${x - 7} ${y - 70}, ${x + 25} ${y - 48}, ${x + 32} ${
                  y - 12
                }
                C ${x + 38} ${y + 20}, ${x + 21} ${y + 61}, ${x - 4} ${
                  y + 68
                }
                C ${x - 25} ${y + 45}, ${x - 37} ${y + 6}, ${x - 28} ${
                  y - 62
                } Z`}
            fill="url(#medical-fascia)"
            stroke={color}
            strokeWidth="3"
          />
          <path
            d={`M ${x - 17} ${y - 42} C ${x + 3} ${y - 30}, ${x + 18} ${
              y - 7
            }, ${x + 19} ${y + 26}`}
            fill="none"
            stroke="#f8eee5"
            strokeWidth="2"
            opacity="0.85"
          />
        </g>
      );
    }
    case "ossicle_state":
      return lesionOverlay(layer, x, y);
    case "ossicular_reconstruction":
      return reconstructionOverlay(layer, asset, fitted);
    case "stapes_procedure":
      return stapesOverlay(layer, asset, fitted);
    case "tympanostomy": {
      const rotation = -15;
      return (
        <g transform={`rotate(${rotation} ${x} ${y})`} filter="url(#medical-soft-shadow)">
          <ellipse cx={x - 9} cy={y} rx="14" ry="18" fill="#e7f2f0" stroke="#40545c" strokeWidth="2.5" />
          <rect x={x - 10} y={y - 8} width="22" height="16" rx="5" fill="url(#medical-tube)" stroke="#40545c" strokeWidth="2" />
          <ellipse cx={x + 11} cy={y} rx="9" ry="13" fill="#f8fbfa" stroke={color} strokeWidth="2.5" />
          <ellipse cx={x + 11} cy={y} rx="4" ry="7" fill="#35525a" opacity="0.82" />
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
            }, ${mastoid.x + 20} ${mastoid.y - 25}, ${mastoid.x + 43} ${
              mastoid.y + 2
            }`}
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
          {regions.length > 0 ? regions : <ellipse cx={x} cy={y} rx="35" ry="27" />}
        </g>
      );
    }
    case "cochlear_insertion": {
      const roundWindow = targetPoint(asset, fitted, "round_window") ?? { x, y };
      const cochlea = targetPoint(asset, fitted, "cochlea") ?? { x: x + 40, y };
      const centerX = cochlea.x + 1;
      const centerY = cochlea.y + 2;
      return (
        <g fill="none" strokeLinecap="round" strokeLinejoin="round" filter="url(#medical-soft-shadow)">
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
          <circle cx={roundWindow.x} cy={roundWindow.y} r="8" fill="#f8fbfa" stroke={color} strokeWidth="3" />
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
          <circle cx={x} cy={y} r="37" fill="rgba(223,235,231,.88)" stroke="#40545c" strokeWidth="3" />
          <circle cx={x} cy={y} r="29" fill="none" stroke={color} strokeWidth="4" />
          <circle cx={x} cy={y} r="11" fill="url(#medical-metal)" stroke="#40545c" strokeWidth="2.5" />
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
          <path d={`M ${x - 8} ${y - 31} L ${x + 2} ${y - 21} M ${x - 10} ${y + 31} L ${x + 1} ${y + 21}`} stroke="#fff8df" strokeWidth="4" />
        </g>
      );
    case "eustachian_tube_dilation":
      return (
        <g transform={`rotate(31 ${x} ${y})`} filter="url(#medical-soft-shadow)">
          <line x1={x - 83} y1={y} x2={x + 84} y2={y} stroke="#3f535c" strokeWidth="6" strokeLinecap="round" />
          <line x1={x - 83} y1={y} x2={x + 84} y2={y} stroke="#d8ece9" strokeWidth="3" strokeLinecap="round" />
          <path
            d={`M ${x - 36} ${y}
                C ${x - 29} ${y - 16}, ${x + 27} ${y - 16}, ${x + 36} ${y}
                C ${x + 27} ${y + 16}, ${x - 29} ${y + 16}, ${x - 36} ${y} Z`}
            fill="rgba(171,224,217,.55)"
            stroke={color}
            strokeWidth="3"
          />
          <line x1={x - 28} y1={y - 9} x2={x + 28} y2={y - 9} stroke="#f7ffff" strokeWidth="2" opacity="0.8" />
        </g>
      );
    case "tm_state":
      if (layer.state === "intact") return null;
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
  const visibleLayers = getActiveSurgeryLayers(plan)
    .filter((layer) => isVisibleInPhase(layer, phase))
    .slice(0, 7);
  const heading = phaseLabel(phase, presentationMode);
  const mirrorAnatomy = plan.laterality === "left";
  const mirrorTransform = mirrorAnatomy
    ? `translate(${fittedImage.x * 2 + fittedImage.width} 0) scale(-1 1)`
    : undefined;

  const projectedLayers = visibleLayers.flatMap((layer) => {
    const anchor = getMedicalArtAnchor(asset.id, layer);
    if (!anchor) return [];
    const position = projectAnchor(fittedImage, anchor);
    return [{ layer, ...position }];
  });
  const hasRemoval = projectedLayers.some(({ layer }) => isRemovalLayer(layer));

  const activate = (layerId: string) => onLayerSelect?.(layerId);
  const handleKeyboard = (event: KeyboardEvent<SVGGElement>, layerId: string) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    activate(layerId);
  };

  return (
    <section
      className="medical-illustration-panel"
      aria-label={`${heading}: ${asset.title}`}
      data-medical-illustration={asset.id}
      data-anatomy-orientation={mirrorAnatomy ? "mirrored-left" : "source-right"}
    >
      <svg
        viewBox="0 0 1000 620"
        className="diagram-svg medical-illustration-svg"
        role="group"
        aria-labelledby={`${id}-title ${id}-description`}
      >
        <title id={`${id}-title`}>{heading}</title>
        <desc id={`${id}-description`}>
          Licensed medical illustration with calibrated deterministic surgical overlays. Generic
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
          <pattern id="medical-fascia" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(-18)">
            <rect width="8" height="8" fill="rgba(207,185,158,.72)" />
            <path d="M 0 2 H 8 M 0 6 H 8" stroke="#f5e9d9" strokeWidth="1.2" opacity="0.72" />
          </pattern>
          <pattern id="medical-fixation-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(28)">
            <rect width="7" height="7" fill="rgba(185,87,58,.12)" />
            <path d="M 0 0 V 7" stroke="#b9573a" strokeWidth="2" opacity="0.65" />
          </pattern>
          <pattern id="medical-cholesteatoma" width="12" height="12" patternUnits="userSpaceOnUse">
            <rect width="12" height="12" fill="rgba(247,239,211,.88)" />
            <circle cx="3" cy="3" r="1.4" fill="#d8c797" />
            <circle cx="9" cy="8" r="1.8" fill="#fffdf2" />
          </pattern>
          <filter id="medical-soft-shadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="1.5" stdDeviation="1.8" floodColor="#17302d" floodOpacity="0.24" />
          </filter>
          <mask id={`${id}-anatomy-mask`} maskUnits="userSpaceOnUse">
            <rect
              x={fittedImage.x}
              y={fittedImage.y}
              width={fittedImage.width}
              height={fittedImage.height}
              fill="white"
            />
            {projectedLayers.map(({ layer, x, y }) => (
              <g key={`mask-${layer.id}`}>{anatomyRemovalShape(layer, x, y)}</g>
            ))}
          </mask>
        </defs>

        <rect x="8" y="8" width="984" height="604" rx="26" className="medical-panel-shell" />
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
        <g transform={mirrorTransform}>
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

          {projectedLayers.map(({ layer, x, y }) => {
            const selected = selectedLayerId === layer.id;
            return (
              <g
                key={`${phase}-${layer.id}`}
                role="button"
                tabIndex={0}
                aria-label={labelSurgeryLayer(layer)}
                aria-pressed={selected}
                className={cn("medical-panel-hotspot", selected && "is-selected")}
                onClick={() => activate(layer.id)}
                onKeyDown={(event) => handleKeyboard(event, layer.id)}
                data-anatomy-layer={layer.kind}
              >
                {procedureOverlay(layer, asset, fittedImage, x, y)}
              </g>
            );
          })}
        </g>

        <rect x="638" y="78" width="334" height="454" rx="18" className="medical-panel-legend-bg" />
        <text x="664" y="112" className="medical-panel-legend-heading">
          Layers
        </text>
        <text x="946" y="112" textAnchor="end" className="medical-panel-count">
          {visibleLayers.length}
        </text>

        {visibleLayers.length > 0 ? (
          visibleLayers.map((layer, index) => {
            const y = 154 + index * 51;
            const lines = wrapLabel(labelSurgeryLayer(layer));
            const selected = selectedLayerId === layer.id;
            return (
              <g
                key={`legend-${phase}-${layer.id}`}
                role="button"
                tabIndex={0}
                aria-label={labelSurgeryLayer(layer)}
                aria-pressed={selected}
                className={cn("medical-panel-legend-row", selected && "is-selected")}
                onClick={() => activate(layer.id)}
                onKeyDown={(event) => handleKeyboard(event, layer.id)}
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
          })
        ) : (
          <text x="664" y="164" className="medical-panel-empty-title">
            No layers
          </text>
        )}

        <text x="32" y="579" className="medical-panel-provenance">
          {asset.attribution} · {asset.license}
        </text>
        <text x="966" y="579" textAnchor="end" className="medical-panel-provenance">
          Generic anatomy · not to scale
        </text>
      </svg>
    </section>
  );
}

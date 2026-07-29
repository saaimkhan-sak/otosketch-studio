"use client";

import { useId, type KeyboardEvent, type ReactNode } from "react";
import type { EducationMode } from "@/domain/educationMode";
import { labelSurgeryLayer } from "@/domain/diagramLabels";
import {
  getMedicalArtAnchor,
  selectMedicalArtAsset,
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

function isVisibleInPhase(layer: SurgeryLayer, phase: MedicalIllustrationPhase) {
  if (layer.documentation !== "documented") return false;
  if (phase === "finding") {
    return layer.role === "finding" || layer.role === "deviation";
  }
  return layer.role !== "finding";
}

function phaseLabel(phase: MedicalIllustrationPhase, mode: EducationMode) {
  if (phase === "finding") {
    return mode === "preoperative_education" ? "Anatomy being discussed" : "Documented findings";
  }
  return mode === "preoperative_education" ? "Planned procedure" : "Completed procedure";
}

function lateralityLabel(plan: SurgeryPlan) {
  if (plan.laterality === "not_documented") return "Side not documented";
  return `${plan.laterality.charAt(0).toUpperCase()}${plan.laterality.slice(1)} ear`;
}

function markerColor(layer: SurgeryLayer) {
  if (layer.role === "finding") return "#c15c3a";
  if (layer.role === "deviation") return "#d18d22";
  if (layer.role === "verification") return "#456b83";
  return "#0f8a83";
}

function markerFill(layer: SurgeryLayer) {
  if (layer.role === "finding") return "rgba(193, 92, 58, 0.20)";
  if (layer.role === "deviation") return "rgba(209, 141, 34, 0.20)";
  if (layer.role === "verification") return "rgba(69, 107, 131, 0.18)";
  return "rgba(15, 138, 131, 0.20)";
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

function procedureOverlay(layer: SurgeryLayer, x: number, y: number): ReactNode {
  const color = markerColor(layer);
  const fill = markerFill(layer);

  switch (layer.kind) {
    case "tm_perforation":
      return (
        <ellipse
          cx={x}
          cy={y}
          rx="31"
          ry="23"
          fill="rgba(193, 92, 58, 0.18)"
          stroke={color}
          strokeWidth="4"
          strokeDasharray="8 5"
        />
      );
    case "tm_graft":
      return (
        <path
          d={`M ${x - 48} ${y + 6} C ${x - 28} ${y - 42}, ${x + 30} ${y - 40}, ${
            x + 50
          } ${y + 2} C ${x + 27} ${y + 38}, ${x - 28} ${y + 39}, ${x - 48} ${y + 6} Z`}
          fill={fill}
          stroke={color}
          strokeWidth="4"
        />
      );
    case "ossicle_state":
      return (
        <path
          d={`M ${x - 28} ${y - 25} L ${x + 28} ${y + 25} M ${x + 28} ${
            y - 25
          } L ${x - 28} ${y + 25}`}
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeLinecap="round"
        />
      );
    case "ossicular_reconstruction":
    case "stapes_procedure":
      return (
        <g fill="none" stroke={color} strokeLinecap="round">
          <path d={`M ${x - 42} ${y - 24} L ${x + 37} ${y + 25}`} strokeWidth="9" />
          <circle cx={x - 42} cy={y - 24} r="10" fill="#f7fbfa" strokeWidth="4" />
          <circle cx={x + 37} cy={y + 25} r="10" fill="#f7fbfa" strokeWidth="4" />
        </g>
      );
    case "tympanostomy":
      return (
        <g stroke={color} strokeWidth="4">
          <rect x={x - 23} y={y - 13} width="46" height="26" rx="8" fill="#f7fbfa" />
          <path d={`M ${x - 32} ${y} H ${x + 32}`} />
        </g>
      );
    case "mastoid_technique":
      return (
        <path
          d={`M ${x - 55} ${y + 22} C ${x - 50} ${y - 42}, ${x + 42} ${
            y - 55
          }, ${x + 58} ${y + 8} C ${x + 28} ${y + 48}, ${x - 26} ${
            y + 53
          }, ${x - 55} ${y + 22} Z`}
          fill={fill}
          stroke={color}
          strokeWidth="4"
          strokeDasharray="10 5"
        />
      );
    case "cholesteatoma_extent":
      return (
        <path
          d={`M ${x - 42} ${y + 9} C ${x - 28} ${y - 43}, ${x + 24} ${
            y - 45
          }, ${x + 47} ${y - 5} C ${x + 29} ${y + 40}, ${x - 19} ${
            y + 46
          }, ${x - 42} ${y + 9} Z`}
          fill="rgba(193, 92, 58, 0.27)"
          stroke={color}
          strokeWidth="4"
        />
      );
    case "cochlear_insertion":
      return (
        <g fill="none" stroke={color} strokeLinecap="round">
          <path
            d={`M ${x - 125} ${y - 102} C ${x - 76} ${y - 84}, ${x - 53} ${
              y - 37
            }, ${x - 24} ${y - 4} C ${x + 8} ${y + 30}, ${x + 48} ${
              y + 18
            }, ${x + 46} ${y - 14} C ${x + 42} ${y - 45}, ${x + 6} ${
              y - 48
            }, ${x - 7} ${y - 27}`}
            strokeWidth="7"
          />
          <circle cx={x - 125} cy={y - 102} r="13" fill="#f7fbfa" strokeWidth="4" />
        </g>
      );
    case "bone_conduction_implant":
      return (
        <g stroke={color} fill={fill}>
          <circle cx={x} cy={y} r="42" strokeWidth="5" />
          <circle cx={x} cy={y} r="15" fill="#f7fbfa" strokeWidth="4" />
          <path d={`M ${x - 11} ${y} H ${x + 11} M ${x} ${y - 11} V ${y + 11}`} strokeWidth="3" />
        </g>
      );
    case "canalplasty":
      return (
        <path
          d={`M ${x - 52} ${y - 25} C ${x - 8} ${y - 52}, ${x + 42} ${
            y - 33
          }, ${x + 55} ${y + 8} C ${x + 17} ${y + 41}, ${x - 32} ${
            y + 36
          }, ${x - 52} ${y - 25}`}
          fill="none"
          stroke={color}
          strokeWidth="7"
        />
      );
    case "eustachian_tube_dilation":
      return (
        <g stroke={color} fill={fill}>
          <path d={`M ${x - 66} ${y - 35} L ${x + 66} ${y + 35}`} strokeWidth="5" />
          <ellipse cx={x} cy={y} rx="38" ry="16" transform={`rotate(28 ${x} ${y})`} strokeWidth="4" />
        </g>
      );
    case "tm_state":
    case "intraoperative_deviation":
    case "verification_status":
      return <circle cx={x} cy={y} r="31" fill={fill} stroke={color} strokeWidth="4" />;
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

  const projectedLayers = visibleLayers.map((layer, index) => {
    const anchor = getMedicalArtAnchor(asset.id, layer);
    const fallback = { x: 12 + index * 8, y: 17 + (index % 2) * 7 };
    const position = anchor ?? fallback;
    return {
      layer,
      x: fittedImage.x + (position.x / 100) * fittedImage.width,
      y: fittedImage.y + (position.y / 100) * fittedImage.height,
    };
  });

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
    >
      <svg
        viewBox="0 0 1000 620"
        className="diagram-svg medical-illustration-svg"
        role="group"
        aria-labelledby={`${id}-title ${id}-description`}
      >
        <title id={`${id}-title`}>{heading}</title>
        <desc id={`${id}-description`}>
          Professional open medical illustration with deterministic callouts for documented
          structured layers. Generic anatomy; not patient-specific and not to scale.
        </desc>

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
        <image
          href={asset.localPath}
          x={fittedImage.x}
          y={fittedImage.y}
          width={fittedImage.width}
          height={fittedImage.height}
          preserveAspectRatio="xMidYMid meet"
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
            >
              {procedureOverlay(layer, x, y)}
            </g>
          );
        })}

        <rect x="638" y="78" width="334" height="454" rx="18" className="medical-panel-legend-bg" />
        <text x="664" y="112" className="medical-panel-legend-heading">
          Structured visual layers
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
          <>
            <text x="664" y="164" className="medical-panel-empty-title">
              No visual layer documented
            </text>
            <text x="664" y="190" className="medical-panel-empty">
              Missing details remain not documented.
            </text>
          </>
        )}

        <text x="32" y="568" className="medical-panel-provenance">
          {asset.attribution}
        </text>
        <text x="32" y="590" className="medical-panel-provenance">
          {asset.illustrationSoftware} · {asset.license} · adapted with deterministic overlays
        </text>
        <text x="966" y="590" textAnchor="end" className="medical-panel-provenance">
          Generic reference anatomy · not to scale
        </text>
      </svg>
    </section>
  );
}

"use client";

import { ExternalLink } from "lucide-react";
import { stanfordAtlasAttribution } from "@/domain/atlasUsage";
import type {
  ProcedureAtlasCallout,
  ProcedureAtlasPanelSelection,
  ProcedureAtlasSelection,
} from "@/domain/procedureAtlas";
import { cn } from "@/lib/cn";

interface ProcedureAtlasDiagramProps {
  selection: ProcedureAtlasSelection;
  phase: "finding" | "procedure";
  selectedFeatureId?: string | null;
  onFeatureSelect?: (featureId: string) => void;
  onImageError?: () => void;
}

const imageFrame = { width: 1000, height: 620 };

function fitImage(panel: ProcedureAtlasPanelSelection) {
  const sourceWidth = panel.asset.width ?? imageFrame.width;
  const sourceHeight = panel.asset.height ?? imageFrame.height;
  const scale = Math.min(imageFrame.width / sourceWidth, imageFrame.height / sourceHeight);
  const width = sourceWidth * scale;
  const height = sourceHeight * scale;
  return {
    x: (imageFrame.width - width) / 2,
    y: (imageFrame.height - height) / 2,
    width,
    height,
  };
}

function OverlayGraphic({
  callout,
  x,
  y,
  selected,
}: {
  callout: ProcedureAtlasCallout;
  x: number;
  y: number;
  selected: boolean;
}) {
  const className = cn("procedure-atlas-overlay", `is-${callout.overlayKind}`, selected && "is-selected");
  switch (callout.overlayKind) {
    case "finding":
      return <ellipse className={className} cx={x} cy={y} rx="62" ry="46" />;
    case "tube":
      return (
        <g className={className} transform={`translate(${x} ${y}) rotate(-16)`}>
          <ellipse cx="0" cy="0" rx="34" ry="21" />
          <rect x="-24" y="-15" width="48" height="30" rx="12" />
          <ellipse cx="0" cy="0" rx="14" ry="9" className="procedure-atlas-device-opening" />
        </g>
      );
    case "graft":
      return (
        <g className={className}>
          <path d={`M ${x - 105} ${y + 20} C ${x - 80} ${y - 90}, ${x + 85} ${y - 90}, ${x + 112} ${y + 8} C ${x + 75} ${y + 88}, ${x - 70} ${y + 92}, ${x - 105} ${y + 20} Z`} />
          <path d={`M ${x - 70} ${y - 20} C ${x - 10} ${y - 45}, ${x + 45} ${y - 35}, ${x + 78} ${y + 10}`} className="procedure-atlas-overlay-detail" />
        </g>
      );
    case "prosthesis":
      return (
        <g className={className}>
          <ellipse cx={x} cy={y} rx="78" ry="102" />
          <path d={`M ${x} ${y - 58} L ${x} ${y + 48}`} className="procedure-atlas-overlay-detail" />
          <ellipse cx={x} cy={y + 52} rx="31" ry="13" className="procedure-atlas-overlay-detail" />
        </g>
      );
    case "mastoid":
      return <path className={className} d={`M ${x - 125} ${y - 70} C ${x - 25} ${y - 135}, ${x + 135} ${y - 78}, ${x + 128} ${y + 35} C ${x + 90} ${y + 125}, ${x - 70} ${y + 120}, ${x - 130} ${y + 38} Z`} />;
    case "piston":
      return (
        <g className={className}>
          <ellipse cx={x - 18} cy={y - 48} rx="29" ry="20" />
          <path d={`M ${x - 2} ${y - 32} L ${x + 28} ${y + 82}`} className="procedure-atlas-overlay-detail" />
          <circle cx={x + 28} cy={y + 82} r="15" className="procedure-atlas-overlay-detail" />
        </g>
      );
    case "electrode":
      return (
        <g className={className}>
          <path d={`M ${x - 125} ${y - 35} C ${x - 40} ${y - 90}, ${x + 120} ${y - 55}, ${x + 130} ${y + 35} C ${x + 105} ${y + 100}, ${x + 10} ${y + 90}, ${x + 15} ${y + 28} C ${x + 20} ${y - 12}, ${x + 70} ${y - 15}, ${x + 80} ${y + 20}`} />
          {[0, 1, 2, 3, 4].map((index) => (
            <circle key={index} cx={x + 18 + index * 15} cy={y + 27 - index * 5} r="4" className="procedure-atlas-electrode-contact" />
          ))}
        </g>
      );
    case "bone_implant":
      return (
        <g className={className}>
          <circle cx={x} cy={y} r="65" />
          <circle cx={x} cy={y} r="35" className="procedure-atlas-overlay-detail" />
          <rect x={x + 48} y={y - 19} width="72" height="38" rx="16" className="procedure-atlas-overlay-detail" />
        </g>
      );
    case "canal":
      return (
        <g className={className}>
          <ellipse cx={x} cy={y} rx="118" ry="95" />
          <ellipse cx={x} cy={y} rx="76" ry="58" className="procedure-atlas-overlay-detail" />
        </g>
      );
    case "balloon":
      return (
        <g className={className} transform={`rotate(-27 ${x} ${y})`}>
          <path d={`M ${x - 170} ${y} L ${x + 165} ${y}`} className="procedure-atlas-overlay-detail" />
          <rect x={x - 75} y={y - 28} width="150" height="56" rx="28" />
        </g>
      );
  }
}

export function ProcedureAtlasDiagram({
  selection,
  phase,
  selectedFeatureId,
  onFeatureSelect,
  onImageError,
}: ProcedureAtlasDiagramProps) {
  const panel = selection.panels[phase];
  const fitted = fitImage(panel);
  const anchoredCallouts = panel.callouts.filter((callout) => callout.anchor);
  const project = (callout: ProcedureAtlasCallout) => ({
    x: fitted.x + (callout.anchor?.x ?? 0.5) * fitted.width,
    y: fitted.y + (callout.anchor?.y ?? 0.5) * fitted.height,
  });

  return (
    <article className="procedure-atlas-panel" data-procedure-family={selection.family}>
      <header className="procedure-atlas-header">
        <div>
          <p>{panel.title}</p>
          <h3>{selection.procedureLabel}</h3>
          <span>{panel.subtitle}</span>
        </div>
        <strong>{selection.lateralityLabel}</strong>
      </header>

      <div className="procedure-atlas-layout">
        <div className="procedure-atlas-canvas">
          <svg
            viewBox={`0 0 ${imageFrame.width} ${imageFrame.height}`}
            className="diagram-svg procedure-atlas-svg"
            aria-hidden="true"
            focusable="false"
            data-atlas-asset-id={panel.asset.id}
            data-diagram-phase={phase}
          >
            <rect width={imageFrame.width} height={imageFrame.height} className="procedure-atlas-image-bg" />
            <image
              href={panel.imageUrl}
              x="0"
              y="0"
              width={imageFrame.width}
              height={imageFrame.height}
              preserveAspectRatio="xMidYMid meet"
              onError={onImageError}
            />
            {anchoredCallouts.map((callout, index) => {
              const point = project(callout);
              const selected = selectedFeatureId === callout.featureId;
              return (
                <g
                  key={callout.id}
                  data-feature-id={callout.featureId}
                >
                  <OverlayGraphic callout={callout} x={point.x} y={point.y} selected={selected} />
                  <circle cx={point.x} cy={point.y} r="18" className="procedure-atlas-marker" />
                  <text x={point.x} y={point.y + 6} textAnchor="middle" className="procedure-atlas-marker-text">
                    {index + 1}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        <ol className="procedure-atlas-callouts" aria-label={`${panel.title} callouts`}>
          {panel.callouts.map((callout) => {
            const markerNumber = anchoredCallouts.indexOf(callout) + 1;
            const content = (
              <>
                <span className={callout.anchor ? "procedure-atlas-callout-number" : "procedure-atlas-callout-status"}>
                  {callout.anchor ? markerNumber : "—"}
                </span>
                <span>
                  <strong>{callout.label}</strong>
                  <small>{callout.detail}</small>
                </span>
              </>
            );
            return (
              <li key={callout.id}>
                {callout.featureId ? (
                  <button
                    type="button"
                    className={cn(selectedFeatureId === callout.featureId && "is-active")}
                    onClick={() => onFeatureSelect?.(callout.featureId!)}
                  >
                    {content}
                  </button>
                ) : (
                  <div>{content}</div>
                )}
              </li>
            );
          })}
        </ol>
      </div>

      <footer className="procedure-atlas-footer">
        <div>
          <strong>
            {selection.coverage === "generic_substrate"
              ? "Generic substrate + original overlay"
              : "Procedure-specific source + deterministic overlay"}
          </strong>
          <span>{selection.coverageNote}</span>
        </div>
        <a href={panel.asset.pageLink} target="_blank" rel="noreferrer">
          Stanford source {panel.asset.id} <ExternalLink className="h-3 w-3" aria-hidden="true" />
        </a>
      </footer>
      <p className="atlas-inline-attribution">{stanfordAtlasAttribution}</p>
    </article>
  );
}

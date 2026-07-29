"use client";

import { useId } from "react";
import type { EducationMode } from "@/domain/educationMode";
import { stanfordAtlasAttribution } from "@/domain/atlasUsage";
import {
  getAtlasPanelAsset,
  getAtlasPanelImageUrl,
  getAtlasPanelPresentation,
  getAtlasPanelProvenance,
  type AtlasTemplateCallout,
  type AtlasTemplateOverlay,
  type AtlasTemplateSelection,
} from "@/domain/atlasTemplates";
import type { DiagramFeature } from "@/domain/types";
import { cn } from "@/lib/cn";

interface AtlasTemplateDiagramProps {
  selection: Extract<AtlasTemplateSelection, { status: "ready" }>;
  panel: "found" | "repaired";
  mode?: EducationMode;
  selectedFeatureId?: string | null;
  onFeatureSelect?: (featureId: string) => void;
  onImageError?: () => void;
}

const atlasImageFrame = {
  x: 36,
  y: 100,
  width: 572,
  height: 386,
};

function fitAtlasImage(sourceWidth: number | null, sourceHeight: number | null) {
  const widthToFit = sourceWidth ?? atlasImageFrame.width;
  const heightToFit = sourceHeight ?? atlasImageFrame.height;
  const scale = Math.min(atlasImageFrame.width / widthToFit, atlasImageFrame.height / heightToFit);
  const width = widthToFit * scale;
  const height = heightToFit * scale;

  return {
    scale,
    x: atlasImageFrame.x + (atlasImageFrame.width - width) / 2,
    y: atlasImageFrame.y + (atlasImageFrame.height - height) / 2,
  };
}

function wrapSvgText(text: string, maxLength = 34) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxLength && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 3);
}

function markerClass(kind: AtlasTemplateCallout["kind"]) {
  if (kind === "repair") return "atlas-marker atlas-marker-repair";
  if (kind === "no_repair") return "atlas-marker atlas-marker-neutral";
  if (kind === "unknown") return "atlas-marker atlas-marker-unknown";
  return "atlas-marker atlas-marker-finding";
}

function calloutClass(active: boolean) {
  return cn("atlas-callout-row", active && "atlas-callout-row-active");
}

function overlayPath(points: AtlasTemplateOverlay["points"], project: (point: { x: number; y: number }) => { x: number; y: number }) {
  if (points.length < 6) return "";
  const [start, controlOne, controlTwo, farEdge, controlThree, controlFour] = points.map(project);
  return [
    `M ${start.x} ${start.y}`,
    `C ${controlOne.x} ${controlOne.y} ${controlTwo.x} ${controlTwo.y} ${farEdge.x} ${farEdge.y}`,
    `C ${controlThree.x} ${controlThree.y} ${controlFour.x} ${controlFour.y} ${start.x} ${start.y}`,
    "Z",
  ].join(" ");
}

export function AtlasTemplateDiagram({
  selection,
  panel,
  mode = "postoperative_summary",
  selectedFeatureId,
  onFeatureSelect,
  onImageError,
}: AtlasTemplateDiagramProps) {
  const titleId = useId();
  const descId = useId();
  const visibleCallouts = selection.callouts.filter((callout) => callout.panel === panel);
  const markerCallouts = visibleCallouts.filter((callout) => Boolean(callout.anchor));
  const visibleOverlays = selection.template.overlays?.filter((overlay) => overlay.panel === panel) ?? [];
  const postoperativePresentation = getAtlasPanelPresentation(selection, panel);
  const { title: panelTitle, subtitle: panelSubtitle } =
    mode === "preoperative_education"
      ? panel === "found"
        ? {
            title: "Anatomy being discussed",
            subtitle: "Generic reference—not a patient-specific image",
          }
        : {
            title: "Planned procedure",
            subtitle: "The selected plan may change after direct inspection",
          }
      : postoperativePresentation;
  const atlasAsset = getAtlasPanelAsset(selection.template, panel);
  const fittedImage = fitAtlasImage(atlasAsset.width, atlasAsset.height);

  const selectFeature = (featureId?: DiagramFeature["id"]) => {
    if (featureId) onFeatureSelect?.(featureId);
  };
  const projectAnchor = (anchor: { x: number; y: number }) => ({
    x: fittedImage.x + anchor.x * fittedImage.scale,
    y: fittedImage.y + anchor.y * fittedImage.scale,
  });

  return (
    <div className="atlas-template-panel">
    <svg
      viewBox="0 0 980 620"
      role="group"
      aria-labelledby={`${titleId} ${descId}`}
      className="diagram-svg atlas-template-svg atlas-desktop-diagram"
      data-template-id={selection.template.id}
      onClick={() => onFeatureSelect?.("")}
    >
      <title id={titleId}>{panelTitle}</title>
      <desc id={descId}>
        Atlas-backed reference image with deterministic callouts from the structured surgical plan.
      </desc>
      <rect x="0" y="0" width="980" height="620" rx="0" className="diagram-bg" />
      <text x="24" y="38" className="diagram-panel-title">
        {panelTitle}
      </text>
      <text x="24" y="64" className="diagram-subtitle">
        {panelSubtitle}
      </text>
      <text x="956" y="38" textAnchor="end" className="atlas-laterality-label">
        {selection.lateralityLabel}
      </text>
      <g>
        <rect x="24" y="88" width="596" height="410" rx="8" className="atlas-image-bg" />
        <image
          href={getAtlasPanelImageUrl(selection.template, panel)}
          x={atlasImageFrame.x}
          y={atlasImageFrame.y}
          width={atlasImageFrame.width}
          height={atlasImageFrame.height}
          preserveAspectRatio="xMidYMid meet"
          data-atlas-asset-id={atlasAsset.id}
          onError={onImageError}
        />
        {visibleOverlays.map((overlay) => {
          const active = selectedFeatureId === overlay.featureId;
          return (
            <g
              key={overlay.id}
              data-overlay-id={overlay.id}
              data-feature-id={overlay.featureId}
              role={overlay.featureId ? "button" : undefined}
              tabIndex={overlay.featureId ? 0 : undefined}
              aria-label={overlay.label}
              aria-pressed={active}
              className={overlay.featureId ? cn("diagram-selectable", active && "diagram-selected") : undefined}
              onClick={(event) => {
                event.stopPropagation();
                selectFeature(overlay.featureId);
              }}
              onKeyDown={(event) => {
                if (!overlay.featureId || (event.key !== "Enter" && event.key !== " ")) return;
                event.preventDefault();
                event.stopPropagation();
                selectFeature(overlay.featureId);
              }}
            >
              {overlay.kind === "bone_cement_bridge" ? (
                <path
                  d={overlayPath(overlay.points, projectAnchor)}
                  className={cn("atlas-overlay-bone-cement", active && "atlas-overlay-selected")}
                />
              ) : overlay.kind === "tm_graft_patch" ? (
                <path
                  d={overlayPath(overlay.points, projectAnchor)}
                  className={cn("atlas-overlay-graft", active && "atlas-overlay-selected")}
                />
              ) : null}
            </g>
          );
        })}
        {markerCallouts.map((callout, index) => {
          const projectedAnchor = callout.anchor ? projectAnchor(callout.anchor) : null;
          const active = selectedFeatureId === callout.featureId;

          return projectedAnchor ? (
            <g
              key={callout.id}
              data-feature-id={callout.featureId}
              role={callout.featureId ? "button" : undefined}
              tabIndex={callout.featureId ? 0 : undefined}
              aria-label={callout.label}
              aria-pressed={active}
              className={callout.featureId ? cn("diagram-selectable", active && "diagram-selected") : undefined}
              onClick={(event) => {
                event.stopPropagation();
                selectFeature(callout.featureId);
              }}
              onKeyDown={(event) => {
                if (!callout.featureId || (event.key !== "Enter" && event.key !== " ")) return;
                event.preventDefault();
                event.stopPropagation();
                selectFeature(callout.featureId);
              }}
            >
              {active ? (
                <circle
                  cx={projectedAnchor.x}
                  cy={projectedAnchor.y}
                  r="24"
                  className="atlas-marker-selected-ring"
                />
              ) : null}
              <circle
                cx={projectedAnchor.x}
                cy={projectedAnchor.y}
                r="16"
                className={markerClass(callout.kind)}
              />
              <text x={projectedAnchor.x} y={projectedAnchor.y + 6} className="atlas-marker-text">
                {index + 1}
              </text>
            </g>
          ) : null;
        })}
      </g>

      <g>
        <text x="650" y="104" className="atlas-callout-heading">
          Deterministic callouts
        </text>
        {visibleCallouts.length > 0 ? (
          visibleCallouts.map((callout, index) => {
            const y = 142 + index * 104;
            const active = selectedFeatureId === callout.featureId;
            const labelLines = wrapSvgText(callout.label, 28).slice(0, 2);
            const detailLines = wrapSvgText(callout.detail, 34).slice(0, 3);
            return (
              <g
                key={`${callout.id}-row`}
                data-callout-feature-id={callout.featureId}
                className={calloutClass(active)}
                role={callout.featureId ? "button" : undefined}
                tabIndex={callout.featureId ? 0 : undefined}
                aria-label={callout.label}
                onClick={(event) => {
                  event.stopPropagation();
                  selectFeature(callout.featureId);
                }}
                onKeyDown={(event) => {
                  if (!callout.featureId || (event.key !== "Enter" && event.key !== " ")) return;
                  event.preventDefault();
                  event.stopPropagation();
                  selectFeature(callout.featureId);
                }}
              >
                <rect x="642" y={y - 34} width="314" height="92" rx="8" />
                {!callout.anchor ? (
                  <text x="660" y={y + 2} className="atlas-status-symbol">{callout.kind === "status" ? "✓" : "—"}</text>
                ) : (
                  <>
                    <circle cx="666" cy={y} r="13" className={markerClass(callout.kind)} />
                    <text x="666" y={y + 5} className="atlas-marker-text">
                      {markerCallouts.indexOf(callout) + 1}
                    </text>
                  </>
                )}
                {labelLines.map((line, lineIndex) => (
                  <text key={`${line}-${lineIndex}`} x="688" y={y - 12 + lineIndex * 16} className="atlas-callout-label">
                    {line}
                  </text>
                ))}
                {detailLines.map((line, lineIndex) => (
                  <text key={`${line}-${lineIndex}`} x="688" y={y + 22 + lineIndex * 15} className="atlas-callout-detail">
                    {line}
                  </text>
                ))}
              </g>
            );
          })
        ) : (
          <text x="650" y="140" className="atlas-callout-detail">
            No template-backed callouts for this panel.
          </text>
        )}
      </g>

      <g>
        <rect x="24" y="520" width="932" height="64" rx="8" className="atlas-provenance-bg" />
        <text x="42" y="548" className="atlas-provenance-text">
          {getAtlasPanelProvenance(selection.template, panel)}
        </text>
        <text x="42" y="570" className="atlas-provenance-text">
          © Jackler &amp; Gralapp · Stanford Oto Surgery Atlas · used with permission · not to scale.
        </text>
      </g>
    </svg>
    <div className="atlas-mobile-diagram" aria-label={`${panelTitle}. ${panelSubtitle}.`}>
      <div className="atlas-mobile-heading">
        <strong>{panelTitle}</strong>
        <span>{panelSubtitle}</span>
        <span className="atlas-mobile-laterality">{selection.lateralityLabel}</span>
      </div>
      <svg viewBox="24 88 596 410" className="atlas-mobile-image" aria-hidden="true">
        <rect x="24" y="88" width="596" height="410" rx="8" className="atlas-image-bg" />
        <image
          href={getAtlasPanelImageUrl(selection.template, panel)}
          x={atlasImageFrame.x}
          y={atlasImageFrame.y}
          width={atlasImageFrame.width}
          height={atlasImageFrame.height}
          preserveAspectRatio="xMidYMid meet"
          onError={onImageError}
        />
        {visibleOverlays.map((overlay) =>
          overlay.kind === "bone_cement_bridge" ? (
            <path
              key={`mobile-${overlay.id}`}
              d={overlayPath(overlay.points, projectAnchor)}
              className={cn(
                "atlas-overlay-bone-cement",
                selectedFeatureId === overlay.featureId && "atlas-overlay-selected",
              )}
            />
          ) : overlay.kind === "tm_graft_patch" ? (
            <path
              key={`mobile-${overlay.id}`}
              d={overlayPath(overlay.points, projectAnchor)}
              className={cn(
                "atlas-overlay-graft",
                selectedFeatureId === overlay.featureId && "atlas-overlay-selected",
              )}
            />
          ) : null,
        )}
        {markerCallouts.map((callout, index) => {
          const projectedAnchor = callout.anchor ? projectAnchor(callout.anchor) : null;
          if (!projectedAnchor) return null;
          return (
            <g key={`mobile-${callout.id}`}>
              <circle
                cx={projectedAnchor.x}
                cy={projectedAnchor.y}
                r="18"
                className={markerClass(callout.kind)}
              />
              <text x={projectedAnchor.x} y={projectedAnchor.y + 6} className="atlas-marker-text">
                {index + 1}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="atlas-mobile-callouts" aria-label="Diagram callouts">
        {visibleCallouts.length > 0 ? visibleCallouts.map((callout) => (
          <button
            key={`mobile-row-${callout.id}`}
            type="button"
            className={cn(
              "atlas-mobile-callout",
              selectedFeatureId === callout.featureId && "is-active",
            )}
            onClick={(event) => {
              event.stopPropagation();
              selectFeature(callout.featureId);
            }}
          >
            <span className={cn("atlas-mobile-number", markerClass(callout.kind), callout.kind === "status" && "atlas-mobile-status-symbol")}>
              {!callout.anchor ? (callout.kind === "status" ? "✓" : "—") : markerCallouts.indexOf(callout) + 1}
            </span>
            <span><strong>{callout.label}</strong><small>{callout.detail}</small></span>
          </button>
        )) : <p className="atlas-mobile-empty">No template-backed callouts for this panel.</p>}
      </div>
      <p className="atlas-mobile-provenance">
        {getAtlasPanelProvenance(selection.template, panel)} Generic atlas background; only numbered
        callouts and status badges are plan-specific. Not to scale.
      </p>
    </div>
    <p className="atlas-inline-attribution">{stanfordAtlasAttribution}</p>
    </div>
  );
}

"use client";

import { useId } from "react";
import type { DiagramState } from "@/domain/diagramMapping";
import { cn } from "@/lib/cn";

interface OtologyDiagramProps {
  state: DiagramState;
  selectedFeatureId?: string | null;
  onFeatureSelect?: (featureId: string) => void;
}

function selectableClass(featureId: string, selectedFeatureId?: string | null) {
  return cn("diagram-selectable", selectedFeatureId === featureId && "diagram-selected");
}

function FeatureGroup({
  id,
  label,
  selectedFeatureId,
  onFeatureSelect,
  children,
}: {
  id: string;
  label: string;
  selectedFeatureId?: string | null;
  onFeatureSelect?: (featureId: string) => void;
  children: React.ReactNode;
}) {
  const selectFeature = () => onFeatureSelect?.(id);

  return (
    <g
      data-feature-id={id}
      role="button"
      tabIndex={0}
      aria-label={label}
      aria-pressed={selectedFeatureId === id}
      className={selectableClass(id, selectedFeatureId)}
      onClick={(event) => {
        event.stopPropagation();
        selectFeature();
      }}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        event.stopPropagation();
        selectFeature();
      }}
    >
      {children}
    </g>
  );
}

function DiagramText({
  x,
  y,
  className,
  unmirror,
  children,
}: {
  x: number;
  y: number;
  className: string;
  unmirror?: boolean;
  children: React.ReactNode;
}) {
  const safeX = unmirror ? (x < 220 ? x + 120 : x > 560 ? x - 80 : x) : x;

  return (
    <text
      x={safeX}
      y={y}
      className={className}
      transform={unmirror ? `translate(${safeX * 2} 0) scale(-1 1)` : undefined}
      data-readable-label={unmirror ? "true" : undefined}
    >
      {children}
    </text>
  );
}

function TympanicMembrane({
  state,
  selectedFeatureId,
  onFeatureSelect,
  unmirrorText,
}: {
  state: DiagramState;
  selectedFeatureId?: string | null;
  onFeatureSelect?: (featureId: string) => void;
  unmirrorText?: boolean;
}) {
  const perforation = state.tympanicMembraneState.startsWith("perforation");
  const perforationCx =
    state.tympanicMembraneState === "perforation_anterior"
      ? 235
      : state.tympanicMembraneState === "perforation_posterior"
        ? 155
        : 195;
  const perforationCy = state.tympanicMembraneState === "perforation_subtotal" ? 260 : 278;
  const perforationR = state.tympanicMembraneState === "perforation_subtotal" ? 76 : 34;
  const documented = state.tympanicMembraneState !== "not_documented";

  const content = (
    <>
      <ellipse
        cx="195"
        cy="260"
        rx="128"
        ry="168"
        className={documented ? "diagram-tm" : "diagram-undocumented-outline"}
      />
      <path d="M178 145 C210 210 222 286 190 380" className="diagram-malleus-shadow" />
      {documented && perforation ? (
        <>
          <circle cx={perforationCx} cy={perforationCy} r={perforationR} className="diagram-abnormal-fill" />
          <DiagramText
            x={perforationCx - 52}
            y={perforationCy + perforationR + 30}
            className="diagram-label"
            unmirror={unmirrorText}
          >
            eardrum opening
          </DiagramText>
        </>
      ) : null}
      {documented && !perforation ? (
        <DiagramText x={112} y={432} className="diagram-label" unmirror={unmirrorText}>
          eardrum documented intact
        </DiagramText>
      ) : null}
      {!documented ? (
        <DiagramText x={92} y={432} className="diagram-undocumented-label" unmirror={unmirrorText}>
          eardrum not documented
        </DiagramText>
      ) : null}
    </>
  );

  if (!documented) {
    return (
      <g data-structure="tympanic-membrane" data-documentation-state="not_documented">
        {content}
      </g>
    );
  }

  return (
    <FeatureGroup
      id="feature-tm"
      label="Tympanic membrane feature"
      selectedFeatureId={selectedFeatureId}
      onFeatureSelect={onFeatureSelect}
    >
      {content}
    </FeatureGroup>
  );
}

function Ossicles({
  state,
  selectedFeatureId,
  onFeatureSelect,
  unmirrorText,
}: {
  state: DiagramState;
  selectedFeatureId?: string | null;
  onFeatureSelect?: (featureId: string) => void;
  unmirrorText?: boolean;
}) {
  const malleusDocumented = state.malleusState !== "not_documented";
  const malleusAbsent = state.malleusState === "absent";
  const malleusEroded = state.malleusState === "eroded";
  const malleusFixed = state.malleusState === "fixed";
  const incusDocumented = state.incusState !== "not_documented";
  const incusAbsent = state.incusState === "absent";
  const incusEroded = state.incusState === "long_process_eroded" || state.incusState === "body_eroded";
  const incusFixed = state.incusState === "fixed";
  const stapesDocumented = state.stapesState !== "not_documented";
  const stapesAbsent = state.stapesState === "superstructure_absent";
  const stapesFixed = state.stapesState === "fixed";
  const jointDiscontinuous = state.incudostapedialJointState === "discontinuous";

  return (
    <>
      {malleusDocumented ? (
        <FeatureGroup
          id="feature-malleus"
          label="Malleus feature"
          selectedFeatureId={selectedFeatureId}
          onFeatureSelect={onFeatureSelect}
        >
          <path
            d="M275 158 C304 196 322 238 318 286"
            className={malleusAbsent ? "diagram-unknown" : malleusEroded ? "diagram-eroded" : "diagram-ossicle"}
          />
          {!malleusAbsent ? <circle cx="278" cy="158" r="18" className="diagram-ossicle-fill" /> : null}
          {malleusEroded || malleusAbsent || malleusFixed ? (
            <DiagramText x={220} y={130} className="diagram-label warning" unmirror={unmirrorText}>
              {malleusAbsent ? "malleus absent" : malleusFixed ? "malleus fixed" : "malleus erosion"}
            </DiagramText>
          ) : (
            <DiagramText x={218} y={130} className="diagram-label" unmirror={unmirrorText}>
              malleus intact
            </DiagramText>
          )}
        </FeatureGroup>
      ) : (
        <g data-structure="malleus" data-documentation-state="not_documented">
          <path d="M275 158 C304 196 322 238 318 286" className="diagram-unknown" />
          <circle cx="278" cy="158" r="18" className="diagram-undocumented-outline" />
          <DiagramText x={196} y={130} className="diagram-undocumented-label" unmirror={unmirrorText}>
            malleus not documented
          </DiagramText>
        </g>
      )}

      {incusDocumented ? (
        <FeatureGroup
          id="feature-incus"
          label="Incus feature"
          selectedFeatureId={selectedFeatureId}
          onFeatureSelect={onFeatureSelect}
        >
          {incusAbsent ? (
            <>
              <path d="M392 188 C448 215 480 262 494 312" className="diagram-unknown" />
              <DiagramText x={386} y={180} className="diagram-label warning" unmirror={unmirrorText}>
                incus absent
              </DiagramText>
            </>
          ) : (
            <>
              <path d="M382 186 C420 200 452 228 470 265" className="diagram-ossicle" />
              <path
                d={incusEroded ? "M470 265 C478 286 482 300 484 312" : "M470 265 C486 296 500 318 520 336"}
                className={incusEroded ? "diagram-eroded" : "diagram-ossicle"}
              />
              <circle cx="382" cy="186" r="22" className="diagram-ossicle-fill" />
              {incusEroded || incusFixed ? (
                <>
                  <circle cx="498" cy="326" r="35" className="diagram-abnormal-ring" />
                  <DiagramText x={400} y={154} className="diagram-label warning" unmirror={unmirrorText}>
                    {incusFixed ? "incus fixed" : "incus erosion"}
                  </DiagramText>
                </>
              ) : (
                <DiagramText x={392} y={158} className="diagram-label" unmirror={unmirrorText}>
                  incus intact
                </DiagramText>
              )}
            </>
          )}
        </FeatureGroup>
      ) : (
        <g data-structure="incus" data-documentation-state="not_documented">
          <path d="M382 186 C420 200 452 228 470 265" className="diagram-unknown" />
          <path d="M470 265 C486 296 500 318 520 336" className="diagram-unknown" />
          <circle cx="382" cy="186" r="22" className="diagram-undocumented-outline" />
          <DiagramText x={378} y={154} className="diagram-undocumented-label" unmirror={unmirrorText}>
            incus not documented
          </DiagramText>
        </g>
      )}

      {stapesDocumented ? (
        <FeatureGroup
          id="feature-stapes"
          label="Stapes feature"
          selectedFeatureId={selectedFeatureId}
          onFeatureSelect={onFeatureSelect}
        >
          {stapesAbsent ? (
            <>
              <path d="M590 330 L625 388 L555 388 Z" className="diagram-unknown" />
              <DiagramText x={540} y={420} className="diagram-label warning" unmirror={unmirrorText}>
                stapes superstructure absent
              </DiagramText>
            </>
          ) : (
            <>
              <path
                d="M592 318 L624 370 M592 318 L560 370 M554 372 L630 372"
                className={stapesFixed ? "diagram-eroded" : "diagram-ossicle"}
              />
              <circle cx="592" cy="318" r="12" className="diagram-ossicle-fill" />
              {stapesFixed ? (
                <DiagramText x={612} y={315} className="diagram-label warning" unmirror={unmirrorText}>
                  stapes fixed
                </DiagramText>
              ) : (
                <DiagramText x={612} y={315} className="diagram-label" unmirror={unmirrorText}>
                  {state.stapesState === "mobile" ? "stapes mobile" : "stapes intact"}
                </DiagramText>
              )}
            </>
          )}
        </FeatureGroup>
      ) : (
        <g data-structure="stapes" data-documentation-state="not_documented">
          <path d="M592 318 L624 370 M592 318 L560 370 M554 372 L630 372" className="diagram-unknown" />
          <circle cx="592" cy="318" r="12" className="diagram-undocumented-outline" />
          <DiagramText x={548} y={420} className="diagram-undocumented-label" unmirror={unmirrorText}>
            stapes not documented
          </DiagramText>
        </g>
      )}

      {jointDiscontinuous && state.panel === "found" ? (
        <FeatureGroup
          id="feature-is-joint"
          label="Incus-stapes joint feature"
          selectedFeatureId={selectedFeatureId}
          onFeatureSelect={onFeatureSelect}
        >
          <>
            <path d="M520 336 L575 322" className="diagram-gap" />
            <circle cx="548" cy="330" r="32" className="diagram-abnormal-ring" />
            <DiagramText x={492} y={288} className="diagram-label warning" unmirror={unmirrorText}>
              gap
            </DiagramText>
          </>
        </FeatureGroup>
      ) : null}
    </>
  );
}

function Repairs({
  state,
  selectedFeatureId,
  onFeatureSelect,
  unmirrorText,
}: {
  state: DiagramState;
  selectedFeatureId?: string | null;
  onFeatureSelect?: (featureId: string) => void;
  unmirrorText?: boolean;
}) {
  if (state.panel !== "repaired") return null;
  const hasReconstructionVisual = [
    "bone_cement_bridge",
    "porp",
    "torp",
    "cartilage_interposition",
  ].includes(state.reconstructionType);

  return (
    <>
      {state.graftType !== "not_documented" && state.graftType !== "none" ? (
        <FeatureGroup
          id="feature-graft"
          label="Graft feature"
          selectedFeatureId={selectedFeatureId}
          onFeatureSelect={onFeatureSelect}
        >
          <path d="M106 218 C164 174 246 184 294 240 C262 322 174 350 108 296 Z" className="diagram-graft" />
          <DiagramText x={104} y={190} className="diagram-label repaired" unmirror={unmirrorText}>
            graft
          </DiagramText>
        </FeatureGroup>
      ) : null}

      {hasReconstructionVisual ? (
        <FeatureGroup
          id="feature-reconstruction"
          label="Reconstruction feature"
          selectedFeatureId={selectedFeatureId}
          onFeatureSelect={onFeatureSelect}
        >
          {state.reconstructionType === "bone_cement_bridge" ? (
            <>
              <path d="M500 320 Q542 304 592 318" className="diagram-cement" />
              <circle cx="546" cy="314" r="28" className="diagram-repair-fill" />
              <DiagramText x={486} y={274} className="diagram-label repaired" unmirror={unmirrorText}>
                bone cement bridge
              </DiagramText>
            </>
          ) : null}

          {state.reconstructionType === "porp" ? (
            <>
              <path d="M388 242 L590 318" className="diagram-prosthesis" />
              <rect x="448" y="258" width="74" height="26" rx="6" className="diagram-prosthesis-fill" />
              <DiagramText x={438} y={246} className="diagram-label repaired" unmirror={unmirrorText}>
                PORP
              </DiagramText>
            </>
          ) : null}

          {state.reconstructionType === "torp" ? (
            <>
              <path d="M234 264 L592 374" className="diagram-prosthesis" />
              <rect x="392" y="304" width="78" height="28" rx="6" className="diagram-prosthesis-fill" />
              <DiagramText x={392} y={292} className="diagram-label repaired" unmirror={unmirrorText}>
                TORP
              </DiagramText>
            </>
          ) : null}

          {state.reconstructionType === "cartilage_interposition" ? (
            <>
              <path d="M505 318 Q545 302 588 318" className="diagram-graft" />
              <rect x="526" y="292" width="54" height="32" rx="6" className="diagram-graft" />
              <DiagramText x={486} y={274} className="diagram-label repaired" unmirror={unmirrorText}>
                cartilage bridge
              </DiagramText>
            </>
          ) : null}
        </FeatureGroup>
      ) : null}
    </>
  );
}

export function OtologyDiagram({ state, selectedFeatureId, onFeatureSelect }: OtologyDiagramProps) {
  const titleId = useId();
  const descId = useId();
  const mirror = state.laterality === "right" ? "translate(800 0) scale(-1 1)" : undefined;
  const unmirrorText = state.laterality === "right";

  return (
    <svg
      viewBox="0 0 800 520"
      role="group"
      aria-labelledby={`${titleId} ${descId}`}
      className="diagram-svg"
      onClick={() => onFeatureSelect?.("")}
    >
      <title id={titleId}>{state.title}</title>
      <desc id={descId}>{state.altText}</desc>
      <rect x="0" y="0" width="800" height="520" rx="0" className="diagram-bg" />
      <text x="28" y="44" className="diagram-panel-title">
        {state.title}
      </text>
      <text x="28" y="72" className="diagram-subtitle">
        {state.laterality === "not_documented" ? "Side not documented" : `${state.laterality} ear`}
      </text>
      <g transform={mirror} data-anatomy-mirror={unmirrorText ? "right" : undefined}>
        <path d="M72 438 C210 470 368 450 506 392 C620 344 704 258 730 140" className="diagram-cavity" />
        <TympanicMembrane
          state={state}
          selectedFeatureId={selectedFeatureId}
          onFeatureSelect={onFeatureSelect}
          unmirrorText={unmirrorText}
        />
        <Ossicles
          state={state}
          selectedFeatureId={selectedFeatureId}
          onFeatureSelect={onFeatureSelect}
          unmirrorText={unmirrorText}
        />
        <Repairs
          state={state}
          selectedFeatureId={selectedFeatureId}
          onFeatureSelect={onFeatureSelect}
          unmirrorText={unmirrorText}
        />
      </g>
      {state.warnings.length > 0 ? (
        <g>
          <rect x="24" y="454" width="752" height="42" rx="6" className="diagram-warning-bg" />
          <text x="42" y="481" className="diagram-warning-text">
            Review warnings present
          </text>
        </g>
      ) : null}
    </svg>
  );
}

# Codex Product Implementation Guide: Otology Operative Note → Surgeon-Reviewed Patient Diagram

**Document version:** 0.1  
**Date:** 2026-06-27  
**Primary builder:** Codex  
**Primary human owner:** Saaim Khan  
**Prototype status:** Synthetic-data-only proof of concept  
**Initial specialty scope:** Pediatric/adult otology, starting with tympanoplasty and ossiculoplasty  
**Primary implementation goal:** Build a high-quality, low-cost proof of concept that converts a synthetic operative note into a surgeon-reviewable, patient-friendly schematic diagram without using real patient data or paid model credits.

---

## 0. How Codex should use this document

This Markdown file is intended to be the single source of product, clinical, architectural, and implementation context for Codex while building the proof of concept.

Codex should treat this document as a product requirements document, engineering brief, safety policy, and implementation checklist. If there is a conflict between speed and safety, prioritize safety. If there is a conflict between visual flashiness and clinical faithfulness, prioritize clinical faithfulness. If there is a conflict between autonomous AI behavior and deterministic rendering, prioritize deterministic rendering.

The product is **not** an AI art generator. It is a **controlled surgical diagram compiler**:

```text
Synthetic operative note
  -> constrained extraction into structured JSON
  -> validation against schema and ontology
  -> deterministic SVG diagram rendering
  -> surgeon review/correction
  -> patient-friendly visual summary export
```

Codex should never implement a feature that encourages real clinical use before privacy, security, HIPAA, legal, institutional, and clinician-review requirements are satisfied.

---

## 1. Product concept in one paragraph

A pediatric ENT surgeon dictated an operative note after a tympanoplasty, then manually drew a simplified picture for the child’s parents showing what happened: the incus-stapes joint was eroded and OtoMimix bone cement was used to reconstruct the ossicular connection. This product turns that observed workflow into a tool: it takes an operative-note-style text input, extracts the documented surgical findings and repairs, and generates a simple two-panel patient education schematic showing “what we found” and “what we repaired.” The surgeon must be able to review, correct, and approve the diagram before it is shown to a family.

---

## 2. Product thesis

The winning version is not:

> “Use AI to generate a pretty medical image from a note.”

The winning version is:

> “Use AI only to extract structured surgical facts from a note, then render a controlled, surgeon-editable, validated diagram from prebuilt anatomy components.”

This matters because generic image generation can hallucinate anatomy. The product should not invent anatomical details, repair materials, laterality, or procedural steps. The diagram should only show what is documented or explicitly selected by the clinician.

---

## 3. Non-negotiable rules

These rules should be enforced in the UI, code, tests, documentation, and prompts.

### 3.1 Data rules

1. **MVP must use synthetic notes only.**
2. Do not include real patient names, dates of service, MRNs, addresses, hospital account numbers, accession numbers, phone numbers, emails, or any other PHI.
3. Do not ask clinicians to paste “deidentified” notes unless an institutional privacy process has approved that workflow.
4. Do not persist input notes in a database for MVP.
5. Do not log raw note text.
6. Do not send note text to paid or external model APIs unless the user explicitly configures such a provider and the app displays a synthetic-data-only warning.
7. Default mode must work without external inference by using mock examples and/or a rules-based extractor.

### 3.2 Clinical safety rules

1. Never diagnose.
2. Never recommend treatment.
3. Never independently interpret images.
4. Never claim that the diagram is a complete reconstruction of the surgery.
5. Never infer that a structure is normal just because the note did not mention it.
6. Use `not_documented` whenever the note does not explicitly support a detail.
7. Every extracted visual fact should preserve supporting source text.
8. Show ambiguities and unsupported claims visibly.
9. Require surgeon review before the diagram is marked approved.
10. All exported diagrams must include a simplified-education disclaimer.

### 3.3 Product rules

1. The app should be useful even with AI disabled.
2. The diagram must be deterministic and reproducible from the structured JSON.
3. SVG anatomy layers must be pre-authored, not invented at runtime by a model.
4. The model output must be validated using Zod before rendering.
5. The UI must make correction faster than redrawing from scratch.
6. The proof of concept should focus on one narrow procedure family before expanding.

---

## 4. Current low-cost strategy

The user no longer has Claude API credits available for this project. Therefore, the product should be built with minimal or zero spend.

### 4.1 Use Codex for building, not as the deployed AI backend

Codex can be used to write, refactor, test, and deploy the app. It should not be treated as the production inference API for a public product. Codex can authenticate through ChatGPT for subscription access or with API keys for usage-based access, and OpenAI recommends API-key authentication for programmatic workflows while warning not to expose Codex execution in untrusted/public environments.

Official reference: https://developers.openai.com/codex/auth

### 4.2 Default implementation modes

The application must support multiple extraction providers behind one interface:

```text
mock         -> returns known gold-standard JSON for bundled synthetic cases
rules        -> deterministic phrase-matching extractor for explicit notes
ollama       -> local-only model extraction through http://localhost:11434
cloudflare   -> optional free-tier cloud extraction using Workers AI JSON mode
```

The app should be useful in `mock` and `rules` mode without any model cost.

### 4.3 Recommended no/low-cost stack

| Layer | Recommended choice | Cost goal | Why |
|---|---|---:|---|
| Coding agent | Codex subscription | Existing subscription | Build product, generate tests, refactor, document |
| App framework | Next.js + TypeScript | Free | Mature, fast, familiar, easy UI |
| Styling | Tailwind CSS | Free | Fast, consistent, responsive |
| Validation | Zod | Free | Runtime schema validation and TypeScript inference |
| Testing | Vitest + Testing Library + Playwright | Free | Unit, component, e2e coverage |
| Diagram rendering | Inline SVG React components | Free | Deterministic, inspectable, exportable |
| PDF/export | Browser print CSS first; optional `html2canvas` + `jspdf` | Free | Avoid server PDF costs |
| Local AI | Ollama structured outputs | Free | Local inference, no cloud costs, no note transmission |
| Cloud AI | Cloudflare Workers AI JSON Mode | Free tier / low-cost | Optional public demo extraction |
| Hosting | Cloudflare Pages / Workers | Free tier | Good free limits for POC |
| Database | None in MVP | Free | Avoid PHI/storage risk |
| Analytics | None or privacy-preserving event counters only | Free | Avoid logging sensitive text |

Official references:

- Cloudflare Workers limits: https://developers.cloudflare.com/workers/platform/limits/
- Cloudflare Workers AI JSON Mode: https://developers.cloudflare.com/workers-ai/features/json-mode/
- Cloudflare Next.js guide: https://developers.cloudflare.com/pages/framework-guides/nextjs/
- Ollama structured outputs: https://docs.ollama.com/capabilities/structured-outputs

---

## 5. Product name options

Working names only. Do not over-optimize branding before the prototype works.

1. **OpSketch**
2. **SurgerySketch**
3. **Otology Visual Summary**
4. **PostOp Picture**
5. **ClearCase ENT**
6. **OtoSketch**
7. **Family Surgical Summary**

Recommended internal repo name:

```text
otology-diagram-poc
```

Recommended UI title for MVP:

```text
Otology Visual Summary
Synthetic-data-only proof of concept
```

---

## 6. Target users and jobs-to-be-done

### 6.1 Primary user: otologist / pediatric ENT surgeon

**Job:** Explain what happened during surgery to a parent/family quickly, accurately, and visually.

Current workflow:

1. Surgery completed.
2. Surgeon dictates operative note.
3. Surgeon talks to family.
4. Surgeon manually sketches key anatomy/pathology/repair on paper.
5. Family takes picture or keeps paper if available.

Desired workflow:

1. Surgeon pastes or imports operative note/dictated summary.
2. App generates structured findings and diagram.
3. Surgeon corrects if needed.
4. Surgeon uses diagram during family explanation.
5. Family receives visual summary as PDF/image/portal item.

### 6.2 Secondary user: parent/caregiver

**Job:** Understand what was found, what was repaired, and what the surgeon is explaining in simple, non-terrifying language.

Parent needs:

- Simple labels.
- Before/after distinction.
- No overwhelming operative jargon.
- Clear explanation that this is educational, not a medical image.
- Take-home artifact.

### 6.3 Tertiary user: trainee / medical student / resident

**Job:** Understand surgical anatomy and communicate findings.

The MVP should not be positioned primarily as a training tool, but it may be useful for feedback and demos.

---

## 7. Initial clinical scope

### 7.1 Narrow MVP scope

The initial product must support only a limited otology procedure pack:

```text
Tympanoplasty +/- ossiculoplasty
```

Initial anatomy:

- Tympanic membrane
- Malleus
- Incus
- Stapes
- Incudostapedial joint
- Middle ear space, simplified

Initial pathology/findings:

- Tympanic membrane perforation: optional, simplified quadrant/size support
- Incus long-process erosion
- Incudostapedial discontinuity
- Stapes superstructure intact
- Stapes superstructure absent
- Ossicular chain intact
- Ossicular chain not documented

Initial repairs:

- Fascia graft, optional
- Cartilage graft, optional
- OtoMimix / bone cement bridge
- PORP
- TORP
- No reconstruction documented

### 7.2 First hero case

The first fully polished demo case should match the user’s observed clinical example:

```text
Procedure: Tympanoplasty with ossicular reconstruction
Finding: Erosion/discontinuity at incus-stapes connection
Repair: OtoMimix bone cement bridge from incus to stapes
Output: Two-panel diagram: "What we found" and "What we repaired"
```

### 7.3 Out-of-scope for MVP

Do not build these in the first pass:

- Full cholesteatoma mapping
- Mastoidectomy cavity diagrams
- Cochlear implant electrode insertion depth
- Endoscopic sinus surgery
- Airway procedures
- Head and neck oncology
- Real EHR integration
- Real patient data import
- Automated patient portal release
- Billing/coding
- Prognosis or outcomes prediction
- Surgical quality grading
- Intraoperative image analysis

---

## 8. Product requirements

### 8.1 Functional requirements

Use these IDs in issues and pull requests.

#### FR-001 Synthetic input textarea

The app must provide a textarea where the user can paste or edit a synthetic operative note.

Acceptance criteria:

- Textarea is clearly labeled “Synthetic operative note.”
- Warning banner says real patient data/PHI must not be entered.
- Character limit defaults to 12,000 characters.
- App rejects input containing obvious PHI-like patterns if possible.

#### FR-002 Example case selector

The app must provide bundled synthetic examples.

Acceptance criteria:

- User can select at least six synthetic cases.
- Selecting a case populates the note and expected case label.
- Cases live in source-controlled test fixtures.

#### FR-003 Extraction provider abstraction

The app must implement a `NoteExtractor` interface.

Acceptance criteria:

- At least `mock` and `rules` providers are implemented first.
- Optional `ollama` and `cloudflare` providers can be added later without changing UI code.
- Provider is selected by environment variable and/or developer toggle.

#### FR-004 Structured extraction

The app must convert the note into a typed `OperativeCase` object.

Acceptance criteria:

- Output is validated with Zod.
- Invalid output fails safely.
- Missing details become `not_documented`, not “normal.”
- Every positive finding includes supporting source text.

#### FR-005 Deterministic diagram rendering

The app must render diagrams from the structured JSON only.

Acceptance criteria:

- Diagram uses controlled SVG components.
- No free-form AI image generation.
- Same JSON always produces same diagram.
- Diagram has “What we found” and “What we repaired” panels.

#### FR-006 Review/correction interface

The app must allow the clinician to correct extracted findings.

Acceptance criteria:

- Laterality editable.
- Incus state editable.
- Incudostapedial joint state editable.
- Stapes state editable.
- Reconstruction type editable.
- Material editable where applicable.
- Corrections immediately update diagram.
- Corrected values are marked as clinician-edited.

#### FR-007 Source evidence display

Each visual fact must display source evidence.

Acceptance criteria:

- Extracted finding shows supporting quote or phrase.
- Missing source shows warning.
- Unsupported model additions are blocked or marked.

#### FR-008 Patient-friendly explanation

The app must generate a simple patient-facing explanation from the structured case.

Acceptance criteria:

- Explanation is deterministic/template-based initially.
- Reading level should be plain language.
- Avoids jargon where possible.
- Uses “hearing bones” alongside ossicle terms.
- Does not give prognosis.

#### FR-009 Approval state

The app must support approval state.

Acceptance criteria:

- Default state: “Draft — not reviewed.”
- After edits/review, user can click “Mark surgeon reviewed.”
- Export shows whether reviewed or not.
- MVP can use a fake surgeon name field or omit signature.

#### FR-010 Export

The app must allow export/printing.

Acceptance criteria:

- Browser print layout works.
- Export page includes title, date generated, two-panel diagram, explanation, disclaimer.
- No raw operative note appears on family export by default.
- Exported content does not contain hidden note text.

#### FR-011 Safety banners

The app must show conspicuous safety banners.

Acceptance criteria:

- Top banner: “Synthetic-data-only proof of concept. Do not enter patient information.”
- Export disclaimer: “Simplified educational illustration. Not a diagnostic image. Final details must be confirmed by the surgeon.”
- Cloud provider mode banner: “Text may be sent to configured model provider; use synthetic notes only.”

#### FR-012 No storage

The MVP must not store note text server-side.

Acceptance criteria:

- No database.
- No localStorage persistence of full note text unless explicitly enabled for local-only dev.
- No analytics events containing note text.
- Server logs redact request bodies.

---

## 9. Non-functional requirements

### 9.1 Quality

- TypeScript strict mode enabled.
- Zod validation for every model-returned object.
- Unit tests for schemas, extractors, diagram mapping, and patient text generation.
- E2E tests for at least the hero workflow.
- No `any` unless justified in code comments.
- No unhandled promise rejections.

### 9.2 Performance

- Mock/rules extraction should complete instantly.
- Cloud/local model extraction should show loading state.
- Diagrams should render client-side without noticeable lag.
- Avoid heavy image libraries unless needed.

### 9.3 Accessibility

- Keyboard navigable.
- Labels associated with form fields.
- Diagram includes text alternative summary.
- Sufficient contrast.
- Export readable in grayscale.
- Avoid relying on color alone; use labels, line styles, and legends.

### 9.4 Security

- No PHI.
- No raw note logs.
- No unsafe HTML injection.
- Content Security Policy if deployed.
- Rate limiting for public endpoint if feasible.
- Do not expose API tokens in frontend.
- Do not commit `.env` or Codex auth files.

### 9.5 Maintainability

- Small components.
- Clear domain types.
- Controlled ontology in one place.
- Easy to add new procedure packs later.
- Test fixtures close to schemas.

---

## 10. Architecture overview

### 10.1 System diagram

```text
Browser UI
  |
  | paste/select synthetic note
  v
Extraction controller
  |
  | provider = mock | rules | ollama | cloudflare
  v
NoteExtractor.extract(note)
  |
  | returns unknown JSON
  v
Zod validation + normalization
  |
  | returns OperativeCase
  v
Diagram mapping layer
  |
  | converts case -> SVG layer props
  v
Two-panel SVG renderer
  |
  v
Review/correction UI
  |
  | user edits structured fields
  v
Patient explanation generator
  |
  v
Print/export view
```

### 10.2 Key design principle

AI is only allowed to produce structured facts. AI is not allowed to directly draw.

### 10.3 Provider modes

```text
Mode: mock
- No network call
- Looks up bundled note ID or sample title
- Returns known gold JSON
- Best for UI development and demos

Mode: rules
- No network call
- Regex/keyword matching
- Works on explicit synthetic notes
- Useful as deterministic fallback

Mode: ollama
- Calls local Ollama server
- No model API cost
- Good for in-person laptop demo
- Not available on deployed public site unless user runs local backend

Mode: cloudflare
- Calls Cloudflare Worker with Workers AI binding
- Optional public demo extraction
- Still synthetic-data-only
- Must handle JSON mode failures
```

---

## 11. Repository structure

Recommended repository tree:

```text
otology-diagram-poc/
  README.md
  PRODUCT_GUIDE.md                  # this file or shortened copy
  AGENTS.md                         # Codex-specific operating instructions
  LICENSE
  package.json
  pnpm-lock.yaml
  tsconfig.json
  next.config.ts
  tailwind.config.ts
  postcss.config.mjs
  eslint.config.mjs
  prettier.config.mjs
  vitest.config.ts
  playwright.config.ts
  .env.example
  .gitignore
  public/
    favicon.svg
    examples/
      printable-demo-placeholder.txt
  src/
    app/
      layout.tsx
      page.tsx
      globals.css
      api/
        extract/
          route.ts                 # optional Next API route for local/cloud provider
    components/
      app/
        AppShell.tsx
        SafetyBanner.tsx
        NoteInput.tsx
        ExampleCasePicker.tsx
        ExtractionControls.tsx
        FindingsPanel.tsx
        CorrectionPanel.tsx
        EvidencePanel.tsx
        ApprovalPanel.tsx
        ExportPanel.tsx
      diagram/
        OtologyDiagram.tsx
        DiagramPanel.tsx
        Legend.tsx
        MiddleEarBase.tsx
        TympanicMembrane.tsx
        Malleus.tsx
        Incus.tsx
        Stapes.tsx
        IncudostapedialJoint.tsx
        BoneCementBridge.tsx
        Porp.tsx
        Torp.tsx
        Graft.tsx
        Highlight.tsx
      ui/
        Button.tsx
        Card.tsx
        Select.tsx
        Textarea.tsx
        Badge.tsx
        Alert.tsx
        FieldLabel.tsx
    domain/
      ontology.ts
      schema.ts
      types.ts
      normalize.ts
      diagramMapping.ts
      patientText.ts
      safety.ts
    extractors/
      NoteExtractor.ts
      mockExtractor.ts
      rulesExtractor.ts
      ollamaExtractor.ts
      cloudflareExtractor.ts
      prompt.ts
      providerRegistry.ts
    fixtures/
      syntheticCases.ts
      goldCases.ts
      adversarialCases.ts
    lib/
      assertNever.ts
      errors.ts
      redact.ts
      env.ts
      print.ts
    tests/
      schema.test.ts
      normalize.test.ts
      patientText.test.ts
      diagramMapping.test.ts
      rulesExtractor.test.ts
      mockExtractor.test.ts
      safety.test.ts
    e2e/
      hero-case.spec.ts
      correction-flow.spec.ts
      export.spec.ts
  worker/
    wrangler.toml
    src/
      index.ts
      schema.ts
      prompt.ts
      redact.ts
    test/
      worker.test.ts
  docs/
    clinical-scope.md
    synthetic-data-policy.md
    evaluation-plan.md
    future-ehr-integration.md
    regulatory-positioning.md
```

### 11.1 `AGENTS.md` content

Create a short `AGENTS.md` at repo root so Codex always sees the most important instructions:

```markdown
# AGENTS.md

This project is a synthetic-data-only proof of concept for converting otology operative notes into surgeon-reviewed patient education diagrams.

Non-negotiables:
- Do not add real patient data.
- Do not log note text.
- Do not build free-form AI image generation.
- Use structured extraction -> Zod validation -> deterministic SVG rendering.
- Missing details must be `not_documented`, never inferred normal.
- Every extracted finding needs source evidence when possible.
- Use mock/rules providers first; external model providers are optional.
- Keep the app usable with zero paid API calls.

Run before committing:
- pnpm lint
- pnpm typecheck
- pnpm test
- pnpm e2e if browser tests were affected
```

---

## 12. Domain ontology

The ontology should be controlled and boring. Do not let arbitrary strings leak into the diagram layer.

### 12.1 Core enums

```ts
export const Laterality = z.enum(["left", "right", "bilateral", "not_documented"]);

export const ProcedureFamily = z.enum([
  "tympanoplasty",
  "tympanoplasty_with_ossiculoplasty",
  "ossiculoplasty",
  "not_documented",
  "unsupported"
]);

export const TympanicMembraneState = z.enum([
  "intact",
  "perforation_anterior",
  "perforation_posterior",
  "perforation_central",
  "perforation_subtotal",
  "retraction",
  "not_documented"
]);

export const MalleusState = z.enum([
  "intact",
  "eroded",
  "absent",
  "fixed",
  "not_documented"
]);

export const IncusState = z.enum([
  "intact",
  "long_process_eroded",
  "body_eroded",
  "absent",
  "fixed",
  "not_documented"
]);

export const IncudostapedialJointState = z.enum([
  "intact",
  "eroded",
  "discontinuous",
  "reconstructed",
  "not_documented"
]);

export const StapesState = z.enum([
  "superstructure_intact",
  "superstructure_absent",
  "fixed",
  "mobile",
  "not_documented"
]);

export const ReconstructionType = z.enum([
  "none",
  "bone_cement_bridge",
  "porp",
  "torp",
  "cartilage_interposition",
  "not_documented",
  "unsupported"
]);

export const GraftType = z.enum([
  "none",
  "temporalis_fascia",
  "cartilage",
  "perichondrium",
  "not_documented"
]);

export const Confidence = z.enum(["high", "medium", "low"]);
```

### 12.2 Evidence object

Every extracted field that affects the diagram should have evidence.

```ts
export const EvidenceSchema = z.object({
  sourceText: z.string().min(1).max(1000),
  startChar: z.number().int().nonnegative().optional(),
  endChar: z.number().int().nonnegative().optional(),
  confidence: Confidence,
  extractionMethod: z.enum(["mock", "rules", "ollama", "cloudflare", "manual"]),
});
```

### 12.3 Field value with evidence

```ts
export const WithEvidence = <T extends z.ZodTypeAny>(valueSchema: T) =>
  z.object({
    value: valueSchema,
    evidence: z.array(EvidenceSchema).default([]),
    editedByClinician: z.boolean().default(false),
    warning: z.string().optional(),
  });
```

### 12.4 Full case schema

```ts
export const OperativeCaseSchema = z.object({
  schemaVersion: z.literal("1.0"),
  caseId: z.string().optional(),
  inputKind: z.literal("synthetic_note"),
  extractionProvider: z.enum(["mock", "rules", "ollama", "cloudflare", "manual"]),
  createdAtIso: z.string().datetime().optional(),

  procedure: z.object({
    family: WithEvidence(ProcedureFamily),
    laterality: WithEvidence(Laterality),
  }),

  anatomy: z.object({
    tympanicMembrane: WithEvidence(TympanicMembraneState),
    malleus: WithEvidence(MalleusState),
    incus: WithEvidence(IncusState),
    incudostapedialJoint: WithEvidence(IncudostapedialJointState),
    stapes: WithEvidence(StapesState),
  }),

  repair: z.object({
    reconstructionType: WithEvidence(ReconstructionType),
    reconstructionMaterial: WithEvidence(z.enum([
      "otomimix",
      "hydroxyapatite_bone_cement",
      "titanium",
      "cartilage",
      "not_documented",
      "not_applicable"
    ])),
    graftType: WithEvidence(GraftType),
  }),

  ambiguities: z.array(z.object({
    message: z.string(),
    sourceText: z.string().optional(),
    severity: z.enum(["info", "warning", "critical"]),
  })).default([]),

  unsupportedClaims: z.array(z.object({
    claim: z.string(),
    reason: z.string(),
  })).default([]),

  safety: z.object({
    containsPossiblePhi: z.boolean().default(false),
    phiWarnings: z.array(z.string()).default([]),
    suitableForRendering: z.boolean(),
    blockRenderingReason: z.string().optional(),
  }),

  review: z.object({
    status: z.enum(["draft_unreviewed", "reviewed_for_demo", "approved_by_clinician"]),
    reviewerName: z.string().optional(),
    reviewedAtIso: z.string().datetime().optional(),
  }).default({ status: "draft_unreviewed" }),
});

export type OperativeCase = z.infer<typeof OperativeCaseSchema>;
```

### 12.5 Normalization rules

Create `normalizeOperativeCase(raw: unknown): OperativeCase`.

Rules:

1. Parse with Zod.
2. If missing positive evidence for a rendered positive finding, add a warning.
3. If laterality is missing, set `not_documented` and show warning.
4. If a field is unknown, reject it rather than expanding enums silently.
5. If model claims `intact` but evidence only says nothing about that structure, downgrade to `not_documented`.
6. If `containsPossiblePhi` is true, block cloud extraction and block export.
7. If `unsupportedClaims.length > 0`, render warnings.

---

## 13. Example structured JSON for hero case

```json
{
  "schemaVersion": "1.0",
  "caseId": "hero-otomimix-is-joint",
  "inputKind": "synthetic_note",
  "extractionProvider": "mock",
  "procedure": {
    "family": {
      "value": "tympanoplasty_with_ossiculoplasty",
      "evidence": [{
        "sourceText": "Left tympanoplasty with ossicular chain reconstruction was performed.",
        "confidence": "high",
        "extractionMethod": "mock"
      }],
      "editedByClinician": false
    },
    "laterality": {
      "value": "left",
      "evidence": [{
        "sourceText": "Left tympanoplasty...",
        "confidence": "high",
        "extractionMethod": "mock"
      }],
      "editedByClinician": false
    }
  },
  "anatomy": {
    "tympanicMembrane": {
      "value": "perforation_posterior",
      "evidence": [{
        "sourceText": "A posterior tympanic membrane perforation was visualized.",
        "confidence": "high",
        "extractionMethod": "mock"
      }],
      "editedByClinician": false
    },
    "malleus": {
      "value": "not_documented",
      "evidence": [],
      "editedByClinician": false,
      "warning": "Malleus status was not explicitly documented."
    },
    "incus": {
      "value": "long_process_eroded",
      "evidence": [{
        "sourceText": "The long process of the incus was eroded.",
        "confidence": "high",
        "extractionMethod": "mock"
      }],
      "editedByClinician": false
    },
    "incudostapedialJoint": {
      "value": "discontinuous",
      "evidence": [{
        "sourceText": "There was discontinuity at the incudostapedial joint.",
        "confidence": "high",
        "extractionMethod": "mock"
      }],
      "editedByClinician": false
    },
    "stapes": {
      "value": "superstructure_intact",
      "evidence": [{
        "sourceText": "The stapes superstructure was intact and mobile.",
        "confidence": "high",
        "extractionMethod": "mock"
      }],
      "editedByClinician": false
    }
  },
  "repair": {
    "reconstructionType": {
      "value": "bone_cement_bridge",
      "evidence": [{
        "sourceText": "OtoMimix bone cement was used to bridge the incus to the stapes capitulum.",
        "confidence": "high",
        "extractionMethod": "mock"
      }],
      "editedByClinician": false
    },
    "reconstructionMaterial": {
      "value": "otomimix",
      "evidence": [{
        "sourceText": "OtoMimix bone cement...",
        "confidence": "high",
        "extractionMethod": "mock"
      }],
      "editedByClinician": false
    },
    "graftType": {
      "value": "not_documented",
      "evidence": [],
      "editedByClinician": false
    }
  },
  "ambiguities": [],
  "unsupportedClaims": [],
  "safety": {
    "containsPossiblePhi": false,
    "phiWarnings": [],
    "suitableForRendering": true
  },
  "review": {
    "status": "draft_unreviewed"
  }
}
```

---

## 14. Synthetic dataset plan

The product should start with synthetic notes. Synthetic notes should be deliberately varied, not all written in the same style.

### 14.1 Initial six cases

1. `normal-ossicular-chain`
   - Tympanoplasty note with intact ossicular chain.
   - No reconstruction.

2. `incus-long-process-erosion`
   - Incus long process eroded.
   - Stapes intact.
   - No reconstruction documented.

3. `is-joint-discontinuity`
   - Incudostapedial discontinuity.
   - No repair documented.

4. `hero-otomimix-is-joint`
   - Incus-stapes erosion/discontinuity.
   - OtoMimix bridge.

5. `porp-reconstruction`
   - Incus absent/eroded.
   - Stapes superstructure intact.
   - PORP placed.

6. `torp-reconstruction`
   - Stapes superstructure absent.
   - TORP placed.

### 14.2 Adversarial cases

Include these early because extraction errors here are clinically important.

1. Negation:
   - “There was no erosion of the incus.”
   - Expected: incus not eroded if explicitly intact, or not_documented depending context.

2. Uncertainty:
   - “Possible mild erosion of the long process of the incus.”
   - Expected: low-confidence warning.

3. Contradiction:
   - “Stapes superstructure absent” and later “PORP placed on intact stapes.”
   - Expected: ambiguity/critical warning.

4. Missing laterality:
   - No left/right.
   - Expected: laterality not_documented.

5. Unsupported inference:
   - Note only says “ossiculoplasty performed.”
   - Expected: reconstruction type not_documented unless prosthesis/material specified.

6. PHI-like input:
   - Contains fake MRN or date.
   - Expected: warning/block.

7. Abbreviation-heavy:
   - “IS joint discontinuity; HA cement used.”
   - Expected: possibly bone cement with medium confidence if abbreviation allowed.

8. Non-otology note:
   - Septoplasty or tonsillectomy note.
   - Expected: unsupported procedure, no diagram.

### 14.3 Gold-standard case fixture shape

```ts
export interface SyntheticCaseFixture {
  id: string;
  title: string;
  note: string;
  expected: OperativeCase;
  tags: string[];
  mustPass: boolean;
  teachingPoint: string;
}
```

### 14.4 Synthetic note writing guidelines

Each note should:

- Be entirely fictional.
- Avoid dates and names.
- Use realistic operative-note style.
- Include enough detail for extraction.
- Include one or two irrelevant sentences to test robustness.
- Vary word order and terminology.
- Avoid being so templated that the product only works on one phrase.

### 14.5 Sample synthetic hero note

```text
Synthetic operative note for demonstration only. No real patient information.

Procedure: Left tympanoplasty with ossicular chain reconstruction.

Findings: After elevation of the tympanomeatal flap, a posterior tympanic membrane perforation was visualized. The middle ear mucosa was healthy. The long process of the incus was eroded, resulting in discontinuity at the incudostapedial joint. The stapes superstructure was intact and mobile.

Repair: The tympanic membrane was reconstructed in standard fashion. OtoMimix bone cement was applied to bridge the eroded long process of the incus to the stapes capitulum. After the cement set, the ossicular chain appeared continuous.

This is fictional sample text for product development and should not be used for patient care.
```

---

## 15. Extractor interface

Create one interface and keep all providers behind it.

```ts
export type ExtractorProvider = "mock" | "rules" | "ollama" | "cloudflare";

export interface ExtractorInput {
  note: string;
  caseHint?: string;
  provider: ExtractorProvider;
}

export interface ExtractorResult {
  case: OperativeCase;
  raw?: unknown;
  warnings: string[];
  durationMs: number;
}

export interface NoteExtractor {
  readonly provider: ExtractorProvider;
  extract(input: ExtractorInput): Promise<ExtractorResult>;
}
```

### 15.1 Provider registry

```ts
export function getExtractor(provider: ExtractorProvider): NoteExtractor {
  switch (provider) {
    case "mock": return mockExtractor;
    case "rules": return rulesExtractor;
    case "ollama": return ollamaExtractor;
    case "cloudflare": return cloudflareExtractor;
    default: return assertNever(provider);
  }
}
```

### 15.2 Provider selection

Environment variables:

```env
NEXT_PUBLIC_DEFAULT_EXTRACTOR=mock
ENABLE_OLLAMA=true
ENABLE_CLOUDFLARE_AI=false
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=gpt-oss
CLOUDFLARE_WORKER_EXTRACT_URL=
```

Rules:

- Default to `mock`.
- In local dev, allow a visible developer-only selector.
- In public deployment, only expose providers intentionally enabled.
- Never expose provider secrets to client code.

---

## 16. Rules extractor

The rules extractor should be intentionally simple and transparent. It should not try to understand everything.

### 16.1 Phrase patterns

Examples:

```ts
const patterns = {
  laterality: {
    left: /\bleft\b/i,
    right: /\bright\b/i,
  },
  procedure: {
    tympanoplastyWithOssiculoplasty: /tympanoplasty.*ossicular|ossiculoplasty.*tympanoplasty/i,
    tympanoplasty: /\btympanoplasty\b/i,
    ossiculoplasty: /\bossiculoplasty\b/i,
  },
  incus: {
    longProcessEroded: /long process of the incus (was )?(eroded|absent|partially eroded)|incus long process erosion/i,
    intact: /incus (was )?intact|intact incus/i,
  },
  isJoint: {
    discontinuous: /incudostapedial (joint )?(discontinuity|discontinuous)|IS joint discontinuity/i,
    intact: /incudostapedial (joint )?(was )?intact|IS joint intact/i,
  },
  stapes: {
    intact: /stapes superstructure (was )?(intact|present)/i,
    absent: /stapes superstructure (was )?(absent|missing|not present)/i,
    mobile: /stapes (was )?mobile|mobile stapes/i,
  },
  reconstruction: {
    otomimix: /OtoMimix|bone cement|hydroxyapatite cement/i,
    porp: /\bPORP\b|partial ossicular replacement prosthesis/i,
    torp: /\bTORP\b|total ossicular replacement prosthesis/i,
  },
};
```

### 16.2 Negation handling

Before positive classification, detect local negation windows.

Bad:

```ts
if (/erosion/.test(note)) incus = "long_process_eroded";
```

Better:

```ts
// Pseudocode only
if (matchPositive("incus erosion") && !hasNegationWithinWindow(match, 8)) {
  incus = "long_process_eroded";
}
```

Negation terms:

- no
- not
- without
- absent evidence of
- no evidence of
- intact without erosion

### 16.3 Evidence extraction

For each matched pattern, capture the sentence containing the phrase.

```ts
function sentenceContaining(note: string, index: number): string {
  // Split on periods/newlines while preserving useful context.
  // Return max 500 chars.
}
```

### 16.4 Rules extractor limitations

Rules extractor should include warnings such as:

```text
This result was generated using a simple rules-based extractor. It may miss findings not written in supported phrases.
```

---

## 17. Model extractor prompt

The prompt should be strict, not creative.

### 17.1 System prompt

```text
You extract structured otology operative findings from synthetic operative-note text for a proof-of-concept patient education diagram.

Rules:
- The input is supposed to be synthetic. If it appears to contain real patient identifiers, set containsPossiblePhi=true and explain.
- Extract only facts explicitly supported by the note.
- Do not infer normal anatomy from silence.
- Use not_documented when the note does not explicitly document a field.
- Every positive finding must include exact supporting sourceText from the note.
- If the note is contradictory, record an ambiguity instead of choosing silently.
- If the procedure is outside tympanoplasty/ossiculoplasty, set procedure family to unsupported and block rendering.
- Do not provide medical advice.
- Do not generate an image.
- Return only JSON matching the schema.
```

### 17.2 User prompt template

```text
Extract the structured operative case from this synthetic note.

Supported scope:
- tympanoplasty
- tympanoplasty_with_ossiculoplasty
- ossiculoplasty
- incus long-process erosion
- incudostapedial joint erosion/discontinuity
- stapes superstructure intact/absent
- bone cement / OtoMimix bridge
- PORP
- TORP
- graft type if explicitly documented

Synthetic note:
<<<NOTE
{note}
NOTE>>>
```

### 17.3 Model settings

For local or cloud models:

- Temperature: `0`
- Streaming: off for structured extraction
- Max output: bounded
- JSON/schema mode when available
- Retry at most once with “repair JSON” instruction after validation failure

### 17.4 Output repair policy

If model returns invalid JSON:

1. Do not render.
2. Show safe error.
3. Optionally retry once with same note and validation error.
4. If retry fails, ask user to use manual correction/mock case.

### 17.5 Cloudflare Workers AI JSON mode

Cloudflare Workers AI JSON Mode can be configured with a JSON Schema. It may still fail when the schema cannot be satisfied, so code must handle JSON mode errors.

Official reference: https://developers.cloudflare.com/workers-ai/features/json-mode/

### 17.6 Ollama structured outputs

Ollama supports structured outputs locally using a `format` parameter, including JSON schema generated from tools like Zod/Pydantic. Use temperature 0.

Official reference: https://docs.ollama.com/capabilities/structured-outputs

---

## 18. Local Ollama extractor

### 18.1 Local-only architecture

```text
Browser -> Next.js API route -> Ollama localhost server -> local model -> JSON -> Zod validation
```

Do not call Ollama directly from the browser in production. For local dev it may be acceptable, but keep the abstraction clean.

### 18.2 Ollama extractor pseudocode

```ts
export const ollamaExtractor: NoteExtractor = {
  provider: "ollama",
  async extract(input) {
    const started = performance.now();
    assertSyntheticInput(input.note);

    const response = await fetch(`${env.OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: env.OLLAMA_MODEL,
        stream: false,
        format: operativeCaseJsonSchema,
        options: { temperature: 0 },
        messages: [
          { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
          { role: "user", content: buildExtractionPrompt(input.note) }
        ]
      }),
    });

    if (!response.ok) throw new Error("Ollama extraction failed");
    const body = await response.json();
    const rawText = body.message?.content;
    const parsed = JSON.parse(rawText);
    const normalized = normalizeOperativeCase(parsed);

    return {
      case: normalized,
      raw: parsed,
      warnings: [],
      durationMs: performance.now() - started,
    };
  }
};
```

### 18.3 Local model choice

Do not hard-code one model. Use `OLLAMA_MODEL`.

Potential default:

```env
OLLAMA_MODEL=gpt-oss
```

But keep this configurable because local hardware varies.

---

## 19. Cloudflare extractor

### 19.1 Cloud architecture

```text
Browser
  -> POST /api/extract or Worker endpoint
  -> Cloudflare Worker
  -> Workers AI binding with JSON schema
  -> Zod validation in Worker or app
  -> sanitized structured case returned
```

### 19.2 Worker safety requirements

The Worker must:

1. Reject input over max length.
2. Run PHI-like precheck before model call.
3. Never log raw note text.
4. Return generic error messages.
5. Use JSON mode.
6. Validate model response.
7. Return `Cache-Control: no-store`.
8. Restrict CORS to the deployed app domain if public.
9. Add basic rate limiting if abuse becomes a problem.

### 19.3 Worker request shape

```ts
interface ExtractRequest {
  note: string;
  caseHint?: string;
}
```

### 19.4 Worker response shape

```ts
interface ExtractResponse {
  ok: true;
  case: OperativeCase;
  warnings: string[];
  durationMs: number;
} | {
  ok: false;
  errorCode: "POSSIBLE_PHI" | "TOO_LONG" | "UNSUPPORTED" | "MODEL_FAILED" | "VALIDATION_FAILED";
  message: string;
  warnings?: string[];
}
```

### 19.5 Cloudflare free-tier reminder

Cloudflare Workers Free has a daily request limit. The exact limits can change, so check official docs before deployment:

https://developers.cloudflare.com/workers/platform/limits/

---

## 20. PHI and synthetic-data safety

### 20.1 MVP position

The MVP is not HIPAA-compliant clinical software. It is a synthetic-data-only prototype.

The UI must repeatedly say:

```text
Synthetic-data-only proof of concept. Do not enter real patient information.
```

### 20.2 PHI-like detection

Implement a lightweight precheck. It will not be perfect, but it reduces obvious mistakes.

Patterns:

- Dates: `MM/DD/YYYY`, `YYYY-MM-DD`, month/day/year phrases
- MRN-like: `MRN`, `medical record number`, `account #`
- Names after labels: `Patient:`, `Name:`, `DOB:`
- Phone numbers
- Email addresses
- Addresses
- Real hospital identifiers if obvious

Example:

```ts
export function detectPossiblePhi(text: string): PhiDetectionResult {
  const warnings: string[] = [];
  if (/\b(MRN|medical record number|DOB|date of birth)\b/i.test(text)) warnings.push("Contains medical identifier label.");
  if (/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/.test(text)) warnings.push("Contains date-like pattern.");
  if (/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(text)) warnings.push("Contains email-like pattern.");
  if (/\b\d{3}[-.)\s]?\d{3}[-.\s]?\d{4}\b/.test(text)) warnings.push("Contains phone-like pattern.");
  return { containsPossiblePhi: warnings.length > 0, warnings };
}
```

### 20.3 HIPAA future-state note

HHS recognizes two de-identification methods: Expert Determination and Safe Harbor. Free-text clinical narratives can contain identifying information even after obvious identifiers are removed. Do not treat manual stripping of a name/MRN as enough for this project.

Official reference: https://www.hhs.gov/hipaa/for-professionals/special-topics/de-identification/index.html

For real ePHI in cloud services, covered entities/business associates need appropriate HIPAA arrangements such as a BAA and risk analysis.

Official reference: https://www.hhs.gov/hipaa/for-professionals/faq/2075/may-a-hipaa-covered-entity-or-business-associate-use-cloud-service-to-store-or-process-ephi/index.html

---

## 21. Diagram rendering system

### 21.1 Design philosophy

The diagram should look like a clear surgeon sketch, not a photorealistic anatomical atlas. It should be easy to understand by parents.

Design goals:

- Simple shapes.
- Consistent labels.
- Clear before/after panels.
- Highlight abnormal and repaired areas.
- Avoid overly detailed anatomy.
- Avoid gore.
- Avoid realistic surgical tissue textures.
- No implied precision beyond what the note supports.

### 21.2 Rendering architecture

```text
OperativeCase
  -> diagramMapping.ts
  -> DiagramState
  -> OtologyDiagram props
  -> SVG layers
```

### 21.3 Diagram state

```ts
export interface DiagramState {
  laterality: "left" | "right" | "not_documented";
  panel: "found" | "repaired";
  showTympanicMembrane: boolean;
  tympanicMembraneState: TympanicMembraneState;
  malleusState: MalleusState;
  incusState: IncusState;
  incudostapedialJointState: IncudostapedialJointState;
  stapesState: StapesState;
  reconstructionType: ReconstructionType;
  reconstructionMaterial: "otomimix" | "hydroxyapatite_bone_cement" | "titanium" | "cartilage" | "not_documented" | "not_applicable";
  warnings: string[];
}
```

### 21.4 Layer order

SVG layer order matters.

1. Background card/panel
2. Middle ear base outline
3. Tympanic membrane / perforation overlay
4. Malleus
5. Incus
6. Stapes
7. Pathology highlights
8. Reconstruction prosthesis/material
9. Labels/arrows
10. Warning/unknown badges
11. Legend

### 21.5 Coordinate system

Use a fixed viewBox:

```tsx
<svg viewBox="0 0 800 520" role="img" aria-labelledby={titleId descId}>
```

Keep coordinates consistent across panels so before/after changes are obvious.

Suggested rough coordinates:

```text
TM ellipse center: (185, 260)
Malleus handle: near TM, from (210, 180) to (285, 285)
Incus body: (390, 205)
Incus long process: (430, 245) to (485, 310)
Stapes: (570, 325)
IS joint: around (510, 315)
Bone cement bridge: between incus long process and stapes capitulum
```

These do not need to be anatomically perfect in MVP, but they must be clear and internally consistent. A clinician should eventually review the SVG.

### 21.6 Component responsibilities

`MiddleEarBase.tsx`

- Draws neutral background and middle ear space.
- Does not encode pathology.

`TympanicMembrane.tsx`

- Renders TM outline.
- Renders perforation if documented.
- Shows `not documented` only in findings panel if necessary.

`Malleus.tsx`

- Renders malleus shape.
- If state unknown, draw neutral/light outline and avoid “intact” label.

`Incus.tsx`

- Renders incus body and long process.
- If long process eroded, draw interrupted/dashed distal long process and highlight erosion.

`IncudostapedialJoint.tsx`

- Renders connection point.
- If discontinuous, show gap with label.
- If reconstructed in repaired panel, show repair overlay.

`Stapes.tsx`

- Renders stapes superstructure if intact/present.
- If absent, show faint placeholder/label, not a normal stapes.

`BoneCementBridge.tsx`

- Renders a small bridge from incus to stapes.
- Label as “bone cement bridge” or “OtoMimix” if documented.

`Porp.tsx`

- Renders simplified PORP between TM/malleus/incus area and intact stapes.

`Torp.tsx`

- Renders simplified TORP from TM/graft area to footplate region when stapes superstructure absent.

`Highlight.tsx`

- Reusable callout circles/arrows/labels.

### 21.7 Styling rules

Do not rely only on color. Use:

- labels
- icons
- line styles
- callouts
- panel captions

Suggested semantic classes:

```ts
const diagramClass = {
  anatomy: "stroke-slate-700 fill-slate-50",
  unknown: "stroke-slate-400 fill-slate-100 stroke-dasharray-4",
  abnormal: "stroke-red-700 fill-red-50",
  repaired: "stroke-blue-700 fill-blue-50",
  highlight: "stroke-amber-700 fill-amber-50",
};
```

If using Tailwind inside SVG is awkward, define CSS classes in `globals.css`.

### 21.8 Diagram alt text

Generate alt text from the case:

```text
Simplified left middle ear diagram. The findings panel shows erosion of the long process of the incus and a gap at the incus-stapes joint. The repair panel shows a bone cement bridge reconnecting the incus to the stapes. This is a simplified educational illustration.
```

---

## 22. Patient-friendly explanation generator

Use deterministic templates first. Do not ask a model to write the patient explanation in MVP.

### 22.1 Explanation principles

- Use short sentences.
- Define anatomy.
- Avoid overpromising hearing outcomes.
- Avoid legal/clinical claims.
- Avoid “normal” if not documented.
- Use “the surgeon documented…” rather than “the patient had…” if cautious.

### 22.2 Example generated text for hero case

```text
This simplified drawing shows the small hearing bones behind the eardrum. In the finding panel, the connection between two hearing bones — the incus and stapes — is shown as worn away or disconnected. In the repair panel, bone cement is shown bridging that connection. This illustration is meant to help explain the operation and does not replace the surgeon’s final explanation or the medical record.
```

### 22.3 Template logic

```ts
export function generatePatientExplanation(case: OperativeCase): string[] {
  const lines: string[] = [];
  lines.push("This simplified drawing shows the small hearing bones behind the eardrum.");

  if (case.anatomy.incudostapedialJoint.value.value === "discontinuous") {
    lines.push("The finding panel shows a gap or disconnection where the incus normally connects to the stapes.");
  }

  if (case.anatomy.incus.value.value === "long_process_eroded") {
    lines.push("Part of the incus is shown as worn away because that was documented in the operative note.");
  }

  if (case.repair.reconstructionType.value.value === "bone_cement_bridge") {
    lines.push("The repair panel shows bone cement bridging the connection between the hearing bones.");
  }

  lines.push("This is an educational illustration and must be reviewed with the surgeon.");
  return lines;
}
```

---

## 23. UI implementation guide

### 23.1 Page layout

Desktop layout:

```text
┌───────────────────────────────────────────────────────────────┐
│ Safety banner                                                  │
├───────────────────────┬───────────────────────────────────────┤
│ Input column           │ Output column                          │
│ - example picker       │ - diagram panels                       │
│ - note textarea        │ - findings summary                     │
│ - provider selector    │ - evidence panel                       │
│ - generate button      │ - correction controls                  │
│                        │ - approval/export                      │
└───────────────────────┴───────────────────────────────────────┘
```

Mobile layout:

```text
Safety banner
Example picker
Textarea
Generate button
Diagram
Findings
Corrections
Evidence
Export
```

### 23.2 Main states

1. Empty state
2. Example selected but not generated
3. Loading extraction
4. Extraction success
5. Extraction warning/ambiguity
6. Extraction blocked due to possible PHI
7. Unsupported procedure
8. Validation/model failure
9. Edited/reviewed
10. Export view

### 23.3 Safety banner text

```text
Synthetic-data-only prototype. Do not enter real patient information. This tool creates educational draft diagrams for clinician review only.
```

### 23.4 Input section

Fields:

- Example selector
- Provider selector (developer/demo only)
- Textarea
- “Generate visual summary” button
- “Reset” button

Button behavior:

- Disabled if note empty.
- Disabled if possible PHI detected and provider is cloud.
- Shows spinner while extraction in progress.

### 23.5 Diagram section

Display:

- Two cards side by side on desktop.
- `What we found`
- `What we repaired`
- Legend under panels.
- Warnings if any data is not documented.

### 23.6 Findings summary

Example:

```text
Extracted findings
- Laterality: Left ✓
- Incus: Long process eroded ✓
- Incus-stapes joint: Discontinuous ✓
- Stapes: Superstructure intact ✓
- Repair: OtoMimix bone cement bridge ✓
- Malleus: Not documented ⚠
```

### 23.7 Evidence panel

Clicking a finding should show evidence:

```text
Finding: Incus long-process erosion
Source text: “The long process of the incus was eroded…”
Confidence: High
Provider: Mock
```

### 23.8 Correction panel

Use selects, not free text, for structured fields.

Fields:

- Laterality
- Procedure family
- TM state
- Malleus state
- Incus state
- IS joint state
- Stapes state
- Reconstruction type
- Reconstruction material
- Graft type

When user edits a field:

- Set `editedByClinician = true`.
- Add evidence `{ sourceText: "Manually selected in review interface", confidence: "high", extractionMethod: "manual" }`.
- Mark review status as draft again if already reviewed.

### 23.9 Approval panel

Fields/buttons:

- Reviewer name optional
- “Mark reviewed for demo”
- “Clear approval”
- Review timestamp

MVP should avoid pretending this is a legal signature.

### 23.10 Export panel

Options:

- Print/save as PDF using browser print.
- Copy diagram as SVG if simple to implement.
- Download PNG optional only if easy and safe.

MVP export should include:

- Title
- Laterality/procedure if documented
- Diagram panels
- Explanation
- Disclaimer
- Review status

MVP export should exclude:

- Raw operative note
- Model raw JSON
- Developer logs

---

## 24. API design

### 24.1 Next.js route: `/api/extract`

Only needed for server-side/local/cloud extraction. Mock/rules can also run client-side, but keep API available for consistency.

Request:

```json
{
  "note": "Synthetic note text...",
  "provider": "rules",
  "caseHint": "hero-otomimix-is-joint"
}
```

Response:

```json
{
  "ok": true,
  "case": { "schemaVersion": "1.0" },
  "warnings": [],
  "durationMs": 42
}
```

Error:

```json
{
  "ok": false,
  "errorCode": "POSSIBLE_PHI",
  "message": "This looks like it may contain patient information. Use synthetic notes only.",
  "warnings": ["Contains date-like pattern"]
}
```

### 24.2 Caching headers

All extraction responses:

```http
Cache-Control: no-store
```

### 24.3 Request limits

- Max characters: 12,000
- Max request body: 64 KB for POC
- Reject empty notes

---

## 25. Testing strategy

Quality must come from tests, not expensive AI.

### 25.1 Unit tests

#### Schema tests

- Accepts valid hero case.
- Rejects unknown enum values.
- Rejects missing required fields.
- Accepts `not_documented` with empty evidence.
- Requires evidence for positive findings in normalization layer.

#### Safety tests

- Detects MRN label.
- Detects date-like patterns.
- Detects phone/email.
- Does not flag normal synthetic note.
- Blocks cloud extraction when possible PHI.

#### Rules extractor tests

- Detects left/right.
- Detects tympanoplasty with ossiculoplasty.
- Detects incus erosion.
- Detects IS discontinuity.
- Detects OtoMimix.
- Handles “no incus erosion” correctly.
- Handles missing laterality.
- Blocks unsupported procedure.

#### Diagram mapping tests

- Hero JSON maps to bone cement bridge in repaired panel.
- Discontinuous joint maps to gap in findings panel.
- PORP maps to PORP component only when type is PORP.
- TORP maps to TORP component only when type is TORP.
- Unknown anatomy does not render as intact anatomy with reassuring labels.

#### Patient text tests

- Hero case mentions hearing bones, incus/stapes connection, bone cement.
- Missing repair does not claim repair.
- Does not contain prohibited prognosis words like “will improve hearing” unless manually added in future with review.

### 25.2 Component tests

Use React Testing Library.

- Safety banner renders.
- Example picker populates textarea.
- Generate button disabled for empty input.
- Findings summary displays warnings.
- Correction controls update diagram labels.
- Approval state updates export view.

### 25.3 E2E tests

Use Playwright.

Test hero flow:

1. Load app.
2. Confirm safety banner.
3. Select hero case.
4. Click generate.
5. Confirm two diagrams render.
6. Confirm incus erosion appears in findings.
7. Confirm bone cement bridge appears in repair panel.
8. Edit reconstruction type to PORP.
9. Confirm diagram changes.
10. Mark reviewed.
11. Open print/export view.

### 25.4 Visual regression testing

Optional for MVP. If implemented, use Playwright screenshots for SVG panels.

Initial cases:

- Hero OtoMimix
- PORP
- TORP
- Normal chain

### 25.5 Evaluation metrics

For each synthetic test case:

- Laterality accuracy
- Procedure family accuracy
- Incus state accuracy
- IS joint state accuracy
- Stapes state accuracy
- Reconstruction type accuracy
- Unsupported addition count
- Missing documented finding count
- Ambiguity detection
- Rendering correctness

Critical failure definitions:

- Wrong laterality.
- Invented repair.
- Invented normal/intact structure from silence.
- Shows PORP when note says bone cement.
- Shows repair in wrong panel.
- Allows possible PHI through cloud mode.

---

## 26. Clinician feedback loop

### 26.1 First feedback session goal

The first surgeon feedback session should answer:

1. Is this visually understandable?
2. Is this clinically faithful enough for a parent explanation?
3. Does reviewing/correcting take less time than drawing from scratch?
4. What anatomy is wrong or misleading?
5. Which cases would make this most useful?

### 26.2 Feedback script

Ask the surgeon:

```text
I built this using only synthetic notes. It does not use real patient data. The goal is not to make medical decisions, but to create a draft visual explanation that a surgeon reviews before showing the family.

For this example, can you tell me:
1. Is the diagram anatomically acceptable as a simplified parent-facing schematic?
2. What would you change before showing this to a family?
3. Would this save time compared with drawing by hand?
4. Which tympanoplasty/ossiculoplasty findings should be added next?
5. What would make you not trust this tool?
```

### 26.3 Feedback capture structure

Create `docs/feedback/YYYY-MM-DD-surgeon-feedback.md`:

```markdown
# Surgeon feedback - YYYY-MM-DD

Reviewer:
Specialty:
Context:
Synthetic cases reviewed:

## Overall reaction

## Diagram accuracy notes

## Missing anatomy

## Misleading elements

## Workflow comments

## Must-fix before next demo

## Nice-to-have later

## Decision
- Continue / pause / pivot
```

Do not include patient information.

---

## 27. Cost-control plan

### 27.1 Zero-cost MVP

Build these first:

- Next.js app
- Mock extractor
- Rules extractor
- Synthetic fixtures
- SVG renderer
- Correction UI
- Browser print export
- Unit/e2e tests

Cost: $0 beyond existing subscription and laptop.

### 27.2 Local AI demo

Add Ollama extractor.

Cost: $0, assuming adequate laptop.

Tradeoff: local setup complexity and slower inference.

### 27.3 Public AI demo

Add Cloudflare Workers AI extractor.

Cost: free tier initially, but verify current limits and terms.

Tradeoff: text leaves browser and goes to configured cloud provider, so synthetic notes only.

### 27.4 Avoid paid items initially

Do not pay for:

- Database
- User auth
- Error monitoring with payload capture
- Hosted vector database
- Paid model APIs
- Medical illustration contractor before validating workflow
- EHR sandbox before prototype demand exists

### 27.5 Where not to compromise

Do not save money by compromising on:

- Schema validation
- Clinician review requirement
- PHI safety warnings
- Test coverage
- Deterministic SVG rendering
- Evidence/source text display
- Clear disclaimers

---

## 28. Deployment plan

### 28.1 Local development

Commands:

```bash
pnpm install
pnpm dev
pnpm test
pnpm lint
pnpm typecheck
pnpm e2e
```

### 28.2 Environment setup

`.env.example`:

```env
NEXT_PUBLIC_APP_ENV=development
NEXT_PUBLIC_DEFAULT_EXTRACTOR=mock
NEXT_PUBLIC_ALLOW_PROVIDER_SWITCHER=true
ENABLE_OLLAMA=false
ENABLE_CLOUDFLARE_AI=false
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=gpt-oss
CLOUDFLARE_WORKER_EXTRACT_URL=
```

### 28.3 Cloudflare Pages static deployment

If the app only uses client-side mock/rules extraction, it can be deployed as a static site.

If using server-side extraction, deploy the Worker separately or deploy a full-stack Next.js app using Cloudflare’s current Next.js guidance.

Official reference: https://developers.cloudflare.com/pages/framework-guides/nextjs/

### 28.4 Preview deployment rules

- Preview deployments may expose app publicly.
- Therefore, safety banner must always show.
- Provider switcher should default to mock.
- Cloud extraction should be disabled unless intentionally enabled.
- Do not embed secrets in preview environment.

### 28.5 Production-like demo deployment

Recommended settings:

```env
NEXT_PUBLIC_APP_ENV=demo
NEXT_PUBLIC_DEFAULT_EXTRACTOR=mock
NEXT_PUBLIC_ALLOW_PROVIDER_SWITCHER=false
ENABLE_OLLAMA=false
ENABLE_CLOUDFLARE_AI=false
```

This creates a public demo with no inference cost and no external note transmission.

---

## 29. CI/CD

### 29.1 GitHub Actions workflow

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test
      - run: pnpm exec playwright install --with-deps chromium
      - run: pnpm e2e
```

### 29.2 CI privacy rule

Never upload artifacts containing note text except bundled synthetic fixtures.

### 29.3 Required checks before merge

- lint
- typecheck
- unit tests
- e2e tests for changed workflows

---

## 30. Observability and logging

### 30.1 MVP logging

Log only:

- Provider used
- Success/failure
- Duration
- Error code
- Synthetic case ID if bundled

Never log:

- Raw note text
- Extracted quotes from the note
- Raw model responses if they contain note text
- Reviewer names in public logs

### 30.2 Client error handling

Use local UI error messages, not external error logging initially.

If Sentry or another tool is added later:

- Disable request body capture.
- Scrub event breadcrumbs.
- Do not send note text.
- Document the configuration.

---

## 31. Regulatory positioning

### 31.1 MVP positioning

Position the product as:

```text
A synthetic-data-only educational prototype that creates draft visual summaries for clinician review.
```

Do not position it as:

- Diagnostic software
- Clinical decision support
- Treatment recommendation software
- Surgical quality assessment
- Medical image interpretation
- Autonomous patient education without clinician review

### 31.2 Future patient-education positioning

FDA lists certain general patient education and interactive diagram functions as examples of software functions that are not medical devices when not intended for diagnosis, treatment, or clinical decision-making. Keep claims in that safer lane.

Official reference: https://www.fda.gov/medical-devices/device-software-functions-including-mobile-medical-applications/examples-software-functions-are-not-medical-devices

### 31.3 Claims to avoid

Avoid:

```text
Automatically reconstructs the surgery.
Identifies surgical abnormalities.
Verifies repair quality.
Improves hearing outcomes.
Replaces surgeon explanation.
Determines what treatment was needed.
```

Use:

```text
Creates a clinician-reviewed educational diagram from documented operative findings.
Helps families understand the surgeon’s explanation.
Provides a simplified visual summary of selected documented findings and repairs.
```

---

## 32. Future HIPAA/production pathway

Do not implement production PHI handling now, but design so it is possible later.

Future requirements:

1. Institutional approval.
2. HIPAA-compliant hosting arrangement.
3. BAA with cloud providers handling ePHI.
4. Security risk assessment.
5. Audit logging.
6. Role-based access control.
7. EHR authentication.
8. Encryption in transit and at rest.
9. Retention/deletion policy.
10. Incident response plan.
11. Clinician approval workflow.
12. Patient portal release policy.
13. Legal review of disclaimers.
14. Model/provider data retention review.
15. Clinical validation study.

---

## 33. Future EHR/SMART-on-FHIR integration

### 33.1 Future workflow

```text
Surgeon opens patient chart
  -> launches SMART-on-FHIR app
  -> app receives patient/chart context
  -> retrieves operative note or receives selected note text
  -> generates draft diagram
  -> surgeon edits and approves
  -> app writes PDF/image summary back to chart
  -> optional release to portal
```

### 33.2 Relevant standards

SMART App Launch defines OAuth2-based patterns for apps to authorize, authenticate, and integrate with FHIR-based systems.

Official reference: https://hl7.org/fhir/smart-app-launch/

FHIR DocumentReference can index clinical documents; Binary can represent binary content such as PDFs/images.

Official references:

- https://hl7.org/fhir/R4/documentreference.html
- https://hl7.org/fhir/R4/binary.html

### 33.3 Future write-back concept

Potential resources:

- `DocumentReference` for approved visual summary metadata
- `Binary` for PDF/SVG/PNG content
- `Patient` context from launch
- `Practitioner`/user context where available
- `Encounter`/`Procedure` linkage if available

### 33.4 EHR integration risks

- Draft op note may not be available through FHIR immediately.
- Write-back may be restricted.
- Media storage and portal release policies vary.
- Hospital security review can be lengthy.
- EHR vendors may require app review/certification.

Therefore: do not build this until the standalone workflow has evidence of value.

---

## 34. Risk register

| Risk | Severity | Likelihood | Mitigation |
|---|---:|---:|---|
| Model invents anatomy | High | Medium | Use controlled schema, evidence requirement, deterministic SVG, surgeon review |
| Wrong laterality | High | Medium | Laterality warning, big UI label, tests, require confirmation |
| Real PHI pasted into demo | High | Medium | Warnings, PHI-like detector, no storage/logging, synthetic-only policy |
| Surgeon says drawing is faster | High | Medium | Optimize correction UI, measure review time, focus on export/portal value |
| Diagram anatomically misleading | High | Medium | Clinician review of SVG, avoid detail, label simplified schematic |
| Free model extraction unreliable | Medium | High | Mock/rules first, local manual correction, evaluation set |
| Cloud free tier changes | Medium | Medium | Provider abstraction, mock/local fallback |
| Scope creep to all ENT | Medium | High | Procedure-pack architecture, strict MVP boundaries |
| App perceived as medical advice | High | Low/Medium | Disclaimers, no treatment/prognosis, clinician approval |
| Legal/regulatory uncertainty | High | Medium | Conservative claims, future legal review before clinical use |
| Poor patient comprehension | Medium | Medium | Family-centered language, test with caregivers later |
| Bad accessibility | Medium | Medium | Labels, keyboard nav, alt text, no color-only meaning |

---

## 35. Implementation milestones

### Milestone 0: Repo and foundations

Deliverables:

- Next.js + TypeScript repo
- Tailwind setup
- Zod setup
- Vitest setup
- Playwright setup
- Safety banner
- Synthetic-data policy docs

Acceptance:

- App loads.
- `pnpm lint`, `pnpm typecheck`, `pnpm test` pass.

### Milestone 1: Domain schema and fixtures

Deliverables:

- Ontology enums
- OperativeCase schema
- Six synthetic cases
- Gold JSON fixtures
- Schema tests

Acceptance:

- All fixtures validate.
- Unknown values rejected.

### Milestone 2: Mock extractor and first UI

Deliverables:

- Example picker
- Textarea
- Mock extractor
- Findings summary

Acceptance:

- Selecting hero case and generating shows structured findings.

### Milestone 3: SVG diagram renderer

Deliverables:

- Two-panel otology diagram
- Base anatomy components
- Incus erosion
- IS discontinuity
- Bone cement bridge
- PORP/TORP placeholders

Acceptance:

- Hero case renders correctly.
- PORP/TORP cases render distinct repairs.

### Milestone 4: Correction and evidence UI

Deliverables:

- Editable structured fields
- Evidence panel
- Warning panel
- Review status

Acceptance:

- Editing fields changes diagram instantly.
- Positive findings show source evidence.

### Milestone 5: Rules extractor and adversarial tests

Deliverables:

- Rules extractor
- Negation handling
- PHI-like detector
- Adversarial fixtures

Acceptance:

- Rules extractor passes adversarial tests.
- PHI-like input blocked/warned.

### Milestone 6: Export

Deliverables:

- Print-friendly layout
- Export view
- Disclaimer

Acceptance:

- Browser print/save as PDF produces clean one-page summary for hero case.

### Milestone 7: Optional local Ollama

Deliverables:

- Ollama extractor
- Local setup docs
- Error handling

Acceptance:

- Local model can extract hero case into valid schema.
- Invalid model outputs fail safely.

### Milestone 8: Optional Cloudflare demo

Deliverables:

- Worker endpoint
- Cloudflare JSON mode
- Redacted/no logging
- Provider toggle off by default

Acceptance:

- Cloud mode works on synthetic hero note.
- Possible PHI blocks cloud call.

### Milestone 9: Clinician demo polish

Deliverables:

- Clean UI copy
- Polished hero diagram
- Feedback form
- Demo script

Acceptance:

- Surgeon can understand and critique without engineering explanation.

---

## 36. Coding standards

### 36.1 TypeScript

- Enable strict mode.
- Avoid `any`.
- Use discriminated unions for provider responses.
- Keep domain types in `src/domain`.
- Keep UI types separate from schema types only when needed.

### 36.2 React

- Prefer small functional components.
- Keep state lifted only as high as necessary.
- Do not place domain logic in components.
- Diagram components should be pure.

### 36.3 Errors

Create typed errors:

```ts
export class PossiblePhiError extends Error {}
export class UnsupportedProcedureError extends Error {}
export class ExtractionValidationError extends Error {}
export class ModelProviderError extends Error {}
```

### 36.4 Formatting

- Prettier.
- ESLint.
- No console logs of notes.
- Use explicit TODOs with owner/context.

### 36.5 Dependencies

Keep dependencies minimal.

Recommended:

```json
{
  "dependencies": {
    "@hookform/resolvers": "latest",
    "clsx": "latest",
    "lucide-react": "latest",
    "next": "latest",
    "react": "latest",
    "react-dom": "latest",
    "react-hook-form": "latest",
    "tailwind-merge": "latest",
    "zod": "latest"
  },
  "devDependencies": {
    "@playwright/test": "latest",
    "@testing-library/jest-dom": "latest",
    "@testing-library/react": "latest",
    "@types/node": "latest",
    "@types/react": "latest",
    "@types/react-dom": "latest",
    "eslint": "latest",
    "eslint-config-next": "latest",
    "jsdom": "latest",
    "prettier": "latest",
    "tailwindcss": "latest",
    "typescript": "latest",
    "vitest": "latest"
  }
}
```

Before using `latest`, Codex should check generated compatibility if it has internet access. Otherwise pin versions from the created scaffold.

---

## 37. Accessibility checklist

- [ ] Page has one `h1`.
- [ ] Textarea has label.
- [ ] Buttons have descriptive text.
- [ ] Diagram SVG has `role="img"` and `aria-labelledby`.
- [ ] Diagram has generated alt text.
- [ ] Form controls are reachable by keyboard.
- [ ] Focus states visible.
- [ ] Error messages are announced or clearly visible.
- [ ] No meaning depends on color alone.
- [ ] Print export remains readable in black and white.

---

## 38. Security checklist

- [ ] `.env` ignored.
- [ ] `.env.example` committed.
- [ ] No raw note logs.
- [ ] No raw model response logs if response includes quotes.
- [ ] Request body size limited.
- [ ] PHI-like detector before model call.
- [ ] Cloud model call disabled by default.
- [ ] `Cache-Control: no-store` on extraction responses.
- [ ] No dangerous HTML injection.
- [ ] Content Security Policy considered for deployment.
- [ ] CORS restricted if Worker deployed.
- [ ] No API tokens in client bundle.
- [ ] No Codex auth files committed.

---

## 39. Product acceptance criteria for MVP

The MVP is successful when:

1. A user can open the app and immediately understand it is synthetic-only.
2. A user can select the hero tympanoplasty/OtoMimix case.
3. The app renders a two-panel diagram showing incus-stapes discontinuity and bone cement bridge.
4. The app shows extracted findings and source evidence.
5. The user can correct the reconstruction type and see the diagram update.
6. The user can mark the diagram reviewed for demo.
7. The user can print/save a family-facing one-page visual summary.
8. Tests cover schema, extraction, safety, mapping, and hero e2e workflow.
9. The app works with no paid API calls.
10. The app does not store or log raw note text.

---

## 40. Demo script

### 40.1 Intro

```text
This is a synthetic-data-only prototype. The idea came from seeing a pediatric otologist draw the operation for a family after tympanoplasty. The app does not make clinical decisions. It turns documented surgical findings into a draft educational diagram that the surgeon reviews and edits.
```

### 40.2 Demo steps

1. Select “Incus-stapes erosion repaired with OtoMimix.”
2. Show synthetic note.
3. Click generate.
4. Point to extracted findings.
5. Click incus erosion finding and show source text.
6. Point to two panels.
7. Edit repair type to PORP to show correction mechanism.
8. Revert to bone cement.
9. Mark reviewed.
10. Open export view.

### 40.3 Questions to ask after demo

```text
Would you use this if review took less than 30 seconds?
What is anatomically wrong or oversimplified?
What are the five most common tympanoplasty/ossiculoplasty scenarios this should support?
Would families benefit from taking this home or seeing it in the portal?
What would make this unsafe or annoying in real workflow?
```

---

## 41. Future expansion plan

Expand by procedure pack, not by free-form generalization.

### Pack 1: Tympanoplasty + ossiculoplasty

Current MVP.

### Pack 2: Cholesteatoma + tympanomastoidectomy

Add:

- Pars flaccida/pars tensa retraction
- Epitympanum
- Mastoid antrum
- Canal wall up/down
- Cholesteatoma extent simplified

### Pack 3: Cochlear implant

Add:

- Cochlea
- Round window/cochleostomy
- Electrode array
- Receiver-stimulator
- Facial recess, simplified

### Pack 4: Endoscopic sinus surgery

Add:

- Sinus anatomy
- Polyps
- Maxillary antrostomy
- Ethmoidectomy
- Sphenoidotomy/frontal sinusotomy

### Pack 5: Airway procedures

Add:

- Larynx/trachea schematic
- Subglottic stenosis
- Laryngomalacia
- Supraglottoplasty

Each pack needs:

- Own ontology additions
- Own SVG anatomy library
- Own synthetic dataset
- Own extraction tests
- Own clinician review

---

## 42. Things Codex should not do without explicit instruction

- Do not add real patient examples.
- Do not scrape operative notes from the internet and include them as clinical truth.
- Do not use public “deidentified” samples without labeling limitations.
- Do not add a database.
- Do not add authentication unless requested.
- Do not add paid APIs.
- Do not add free-form image generation.
- Do not remove safety banners.
- Do not change “not_documented” to “normal.”
- Do not generate prognosis or treatment advice.
- Do not claim HIPAA compliance.
- Do not implement EHR integration in MVP.

---

## 43. Initial Codex task list

Start with these tasks in order.

### Task 1: Scaffold repo

```text
Create a Next.js TypeScript app with Tailwind, Zod, Vitest, Testing Library, and Playwright. Add strict TypeScript, lint/typecheck/test scripts, and a safety-first README. Do not add any paid API dependency.
```

### Task 2: Add domain schema

```text
Implement src/domain/ontology.ts, schema.ts, normalize.ts, and types.ts using the product guide. Add tests validating the hero case and rejecting unknown enum values.
```

### Task 3: Add synthetic fixtures

```text
Create six synthetic otology operative-note fixtures and matching gold OperativeCase objects. Include the OtoMimix hero case, PORP, TORP, normal chain, incus erosion, and IS discontinuity. Add fixture validation tests.
```

### Task 4: Add mock extractor

```text
Implement the NoteExtractor interface and mock extractor. Build a minimal UI with example picker, textarea, generate button, and findings summary.
```

### Task 5: Add SVG renderer

```text
Build deterministic SVG components for simplified middle ear anatomy and render two panels: What we found and What we repaired. Support incus long-process erosion, IS discontinuity, OtoMimix bridge, PORP, and TORP.
```

### Task 6: Add correction UI

```text
Add structured correction controls for laterality, incus, IS joint, stapes, reconstruction type/material, and graft. Changes should update the diagram immediately and mark fields as clinician-edited.
```

### Task 7: Add rules extractor

```text
Implement rules-based extraction with phrase matching, evidence sentence capture, and basic negation handling. Add adversarial tests.
```

### Task 8: Add export

```text
Create a print-friendly family-facing export view with diagram, patient-friendly explanation, review status, and disclaimer. Exclude the raw operative note.
```

### Task 9: Add local Ollama optional provider

```text
Add an optional Ollama extractor using structured outputs. It must be disabled by default and must fail safely if Ollama is unavailable.
```

### Task 10: Polish demo

```text
Improve UI copy, accessibility, diagram labels, warnings, and demo flow. Add Playwright e2e test for the hero case.
```

---

## 44. Final guiding principle

The prototype should make one thing unmistakably clear:

> A surgeon can turn documented otology findings into a clear, editable, family-facing schematic without giving the model permission to invent medicine.

Build the narrow version extremely well. Then use clinician feedback to decide whether to expand.


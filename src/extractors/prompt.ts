export const EXTRACTION_SYSTEM_PROMPT = `You extract structured otology operative findings from synthetic operative-note text for a proof-of-concept patient education diagram.

Rules:
- The input is supposed to be synthetic. If it appears to contain real patient identifiers, set containsPossiblePhi=true and explain.
- Extract only facts explicitly supported by the note.
- Do not infer normal anatomy from silence.
- Use not_documented when the note does not explicitly document a field.
- Every documented value, including explicit negative values such as none, must include exact supporting sourceText from the note.
- If the note is contradictory, record an ambiguity instead of choosing silently.
- If the procedure is outside tympanoplasty/ossiculoplasty, set procedure family to unsupported and block rendering.
- Do not provide medical advice.
- Do not generate an image.
- Return only JSON matching the schema.`;

export function buildExtractionPrompt(note: string) {
  return `Extract the structured operative case from this synthetic note.

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
${note}
NOTE>>>`;
}

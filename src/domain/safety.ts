export interface PhiDetectionResult {
  containsPossiblePhi: boolean;
  warnings: string[];
}

const phiPatterns: Array<[RegExp, string]> = [
  [/\b(MRN|medical record number|account number|acct\s*#|DOB|date of birth)\b/i, "Contains a medical identifier label."],
  [/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/, "Contains a date-like pattern."],
  [/\b\d{4}-\d{2}-\d{2}\b/, "Contains an ISO date-like pattern."],
  [
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{2,4}\b/i,
    "Contains a written date-like pattern.",
  ],
  [/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i, "Contains an email-like pattern."],
  [/\b\d{3}[-.)\s]?\d{3}[-.\s]?\d{4}\b/, "Contains a phone-like pattern."],
  [/\b(Patient|Name)\s*:\s*[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\b/, "Contains a name-like label."],
  [/\b\d{1,5}\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln)\b/i, "Contains an address-like pattern."],
];

export function detectPossiblePhi(text: string): PhiDetectionResult {
  const warnings = phiPatterns
    .filter(([pattern]) => pattern.test(text))
    .map(([, message]) => message);

  return {
    containsPossiblePhi: warnings.length > 0,
    warnings,
  };
}

export function redactForLog(value: string) {
  return `[redacted:${value.length} chars]`;
}

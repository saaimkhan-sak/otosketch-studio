import { describe, expect, it } from "vitest";
import { detectPossiblePhi } from "@/domain/safety";

describe("detectPossiblePhi", () => {
  it("detects obvious identifier patterns", () => {
    expect(detectPossiblePhi("Patient: Jane Sample. MRN 1234. DOB 01/02/2003.").containsPossiblePhi).toBe(true);
    expect(detectPossiblePhi("Call 555-123-4567 after surgery.").containsPossiblePhi).toBe(true);
    expect(detectPossiblePhi("email test@example.com").containsPossiblePhi).toBe(true);
  });

  it("does not flag a normal synthetic note", () => {
    const result = detectPossiblePhi(
      "Synthetic operative note. Left tympanoplasty. The incus long process was eroded.",
    );
    expect(result.containsPossiblePhi).toBe(false);
  });
});

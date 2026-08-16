import { describe, expect, it } from "vitest";
import { validateSubmission, type SubmissionValidationInput } from "./submissionValidation";

function validInput(): SubmissionValidationInput {
  return {
    actualStart: 1_000,
    actualEnd: 1_801_000,
    durationMinutes: 30,
    method: "Tent fumigation",
    dosage: "4 g/m3",
    treatedAreas: ["Warehouse"],
    chemicalQuantities: [2.5],
    technicianSignerName: "Alex Technician",
    technicianSignatureLength: 100,
    hasCustomerSignature: true,
    customerSignerName: "Casey Customer",
    customerSignatureLength: 100,
    checklist: [
      { key: "sealed", required: true, evidence: "before_photo" },
      { key: "ventilated", required: true, evidence: "after_photo" },
    ],
    completedKeys: new Set(["sealed", "ventilated"]),
    evidenceKinds: new Set(["before", "after"]),
    answerKeys: ["sealed", "ventilated"],
    location: { status: "captured", latitude: -1.29, longitude: 36.82, accuracy: 10 },
  };
}

describe("validateSubmission", () => {
  it("accepts a complete field record", () => {
    expect(validateSubmission(validInput())).toBeNull();
  });

  it("rejects non-positive chemical usage", () => {
    expect(validateSubmission({ ...validInput(), chemicalQuantities: [0] })).toBe("At least one valid chemical usage row is required");
  });

  it("requires every mandatory checklist item", () => {
    expect(validateSubmission({ ...validInput(), completedKeys: new Set(["sealed"]) })).toBe("Complete every required checklist item");
  });

  it("requires configured evidence", () => {
    expect(validateSubmission({ ...validInput(), evidenceKinds: new Set(["before"]) })).toBe("Required before and after evidence must finish uploading");
  });

  it("accepts an absence reason instead of a customer signature", () => {
    expect(validateSubmission({ ...validInput(), hasCustomerSignature: false, representativeAbsentReason: "Site closed after treatment" })).toBeNull();
  });

  it("rejects malformed captured coordinates", () => {
    expect(validateSubmission({ ...validInput(), location: { status: "captured", latitude: 91, longitude: 20, accuracy: 5 } })).toBe("Captured location is invalid");
  });

  it("rejects duplicate checklist answers", () => {
    expect(validateSubmission({ ...validInput(), answerKeys: ["sealed", "sealed"] })).toBe("Checklist answers are invalid");
  });
});

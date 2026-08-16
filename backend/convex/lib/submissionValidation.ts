export type ChecklistRequirement = {
  key: string;
  required: boolean;
  evidence: "none" | "before_photo" | "after_photo";
};

export type SubmissionValidationInput = {
  actualStart: number;
  actualEnd: number;
  durationMinutes: number;
  method: string;
  dosage: string;
  treatedAreas: string[];
  chemicalQuantities: number[];
  technicianSignerName: string;
  technicianSignatureLength: number;
  customerSignerName?: string;
  customerSignatureLength?: number;
  hasCustomerSignature: boolean;
  representativeAbsentReason?: string;
  checklist: ChecklistRequirement[];
  completedKeys: Set<string>;
  evidenceKinds: Set<"before" | "after" | "other">;
  answerKeys: string[];
  location: { status: "captured" | "denied" | "unavailable" | "unsupported"; latitude?: number; longitude?: number; accuracy?: number };
};

export function validateSubmission(input: SubmissionValidationInput): string | null {
  if (!Number.isFinite(input.actualStart) || !Number.isFinite(input.actualEnd) || input.actualEnd <= input.actualStart || !Number.isInteger(input.durationMinutes) || input.durationMinutes <= 0 || input.durationMinutes > 7 * 24 * 60) return "Complete all treatment details";
  if (Math.abs((input.actualEnd - input.actualStart) / 60_000 - input.durationMinutes) > 5) return "Treatment duration does not match its start and end times";
  if (!input.method.trim() || input.method.trim().length > 200 || !input.dosage.trim() || input.dosage.trim().length > 200 || input.treatedAreas.length === 0 || input.treatedAreas.length > 50 || input.treatedAreas.some((area) => !area.trim() || area.trim().length > 200)) return "Complete all treatment details";
  if (input.chemicalQuantities.length === 0 || input.chemicalQuantities.some((quantity) => !Number.isFinite(quantity) || quantity <= 0)) return "At least one valid chemical usage row is required";
  if (!input.technicianSignerName.trim() || input.technicianSignatureLength < 20 || input.technicianSignatureLength > 200_000) return "Technician signature is required";
  if (input.hasCustomerSignature && (!input.customerSignerName?.trim() || (input.customerSignatureLength ?? 0) < 20 || (input.customerSignatureLength ?? 0) > 200_000)) return "Customer signer name and signature are required together";
  if (!input.hasCustomerSignature && !input.representativeAbsentReason?.trim()) return "Customer signature or absence reason is required";
  const configuredKeys = new Set(input.checklist.map((entry) => entry.key));
  if (new Set(input.answerKeys).size !== input.answerKeys.length || input.answerKeys.some((key) => !configuredKeys.has(key))) return "Checklist answers are invalid";
  if (input.checklist.some((entry) => entry.required && !input.completedKeys.has(entry.key))) return "Complete every required checklist item";
  if (input.checklist.some((entry) => entry.required && entry.evidence === "before_photo") && !input.evidenceKinds.has("before")) return "Required before and after evidence must finish uploading";
  if (input.checklist.some((entry) => entry.required && entry.evidence === "after_photo") && !input.evidenceKinds.has("after")) return "Required before and after evidence must finish uploading";
  const { status, latitude, longitude, accuracy } = input.location;
  if (status === "captured") {
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !Number.isFinite(accuracy) || latitude! < -90 || latitude! > 90 || longitude! < -180 || longitude! > 180 || accuracy! < 0 || accuracy! > 100_000) return "Captured location is invalid";
  } else if (latitude !== undefined || longitude !== undefined || accuracy !== undefined) return "Location coordinates require captured status";
  return null;
}

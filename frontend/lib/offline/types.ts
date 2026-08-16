export type SyncState = "queued" | "syncing" | "failed" | "conflict";

export type LocationEvidence = {
  status: "captured" | "denied" | "unavailable" | "unsupported";
  latitude?: number;
  longitude?: number;
  accuracy?: number;
};

export type InventoryProduct = {
  productId: string;
  name: string;
  activeIngredient: string;
  unit: string;
  quantity: number;
};

export type ChemicalUsage = {
  productId: string;
  quantity: number;
  batchNumber?: string;
  expiresAt?: number;
};

export type SubmissionPayload = {
  jobRevision: number;
  actualStart: number;
  actualEnd: number;
  method: string;
  treatedAreas: string[];
  dosage: string;
  durationMinutes: number;
  observations?: string;
  chemicalUsage: ChemicalUsage[];
  checklistAnswers: Array<{ key: string; completed: boolean; note?: string }>;
  technicianSignature: string;
  technicianSignerName: string;
  customerSignature?: string;
  customerSignerName?: string;
  representativeAbsentReason?: string;
  location: LocationEvidence;
};

export type CachedJob = {
  id: string;
  branchId?: string;
  customerName: string;
  siteName: string;
  siteAddress: string;
  serviceType: string;
  targetPest: string;
  status: string;
  scheduledStart: number;
  scheduledEnd: number;
  revision: number;
  cachedAt: number;
};

export type CachedFieldJob = CachedJob & {
  branchId: string;
  instructions?: string;
  approvalPolicy: "manager_required" | "manager_and_customer" | "technician_direct";
  inventory?: InventoryProduct[];
  snapshot: {
    customerName: string;
    siteName: string;
    siteAddress: string;
    checklistVersion: number;
    checklistItems: Array<{
      key: string;
      label: string;
      required: boolean;
      evidence: "none" | "before_photo" | "after_photo";
    }>;
  };
};

export type FieldDraft = {
  jobId: string;
  revision: number;
  values: Record<string, unknown>;
  photoIds: string[];
  updatedAt: number;
};

export type StoredPhoto = {
  id: string;
  jobId: string;
  kind: "before" | "after" | "other";
  blob: Blob;
  mimeType: string;
  size: number;
  name: string;
  createdAt: number;
};

export type OutboxEvidence = {
  photoId: string;
  kind: "before" | "after" | "other";
  mimeType: string;
  size: number;
  uploadKey?: string;
  storageId?: string;
  metadataSaved?: boolean;
};

export type OutboxEntry = {
  submissionKey: string;
  jobId: string;
  payload: SubmissionPayload;
  evidence: OutboxEvidence[];
  state: SyncState;
  attempts: number;
  error?: string;
  createdAt: number;
  updatedAt: number;
};

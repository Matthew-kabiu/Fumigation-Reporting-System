import type { SyncState } from "./types";

export function syncFailure(error: unknown): { state: Extract<SyncState, "failed" | "conflict">; error: string } {
  const record = error && typeof error === "object" ? error as { data?: unknown; message?: unknown } : undefined;
  const data = record?.data;
  const code = data && typeof data === "object" && "code" in data ? String(data.code) : "";
  const message = typeof record?.message === "string" ? record.message : "Synchronization failed";
  const conflict = code === "CONFLICT" || /\bCONFLICT\b|no longer|insufficient chemical stock/i.test(message);
  return { state: conflict ? "conflict" : "failed", error: message };
}

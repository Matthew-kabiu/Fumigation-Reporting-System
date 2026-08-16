"use client";

import { useAuth } from "@clerk/nextjs";
import { api } from "@backend/_generated/api";
import type { Id } from "@backend/_generated/dataModel";
import { useMutation } from "convex/react";
import type { FunctionReference } from "convex/server";
import { AlertTriangle, CheckCircle2, CloudUpload, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  CHANGE_EVENT,
  deleteOutbox,
  getPhoto,
  listOutbox,
  updateOutbox,
} from "@/lib/offline/database";
import { syncFailure } from "@/lib/offline/retry-state";
import type { OutboxEntry } from "@/lib/offline/types";
import styles from "./outbox-sync.module.css";

type GenerateUploadArgs = {
  jobId: Id<"jobs">;
  submissionKey: string;
  kind: "before" | "after" | "other";
  mimeType: string;
  size: number;
};
type GenerateUploadResult = { uploadUrl: string; uploadKey: string };
type SaveMetadataArgs = { uploadKey: string; storageId: Id<"_storage"> };

const generateUploadReference = api.evidence.generateUploadUrl as unknown as FunctionReference<
  "mutation",
  "public",
  GenerateUploadArgs,
  GenerateUploadResult
>;
const saveMetadataReference = api.evidence.saveMetadata as unknown as FunctionReference<
  "mutation",
  "public",
  SaveMetadataArgs,
  unknown
>;

export function useOutboxSync() {
  const { userId } = useAuth();
  const generateUploadUrl = useMutation(generateUploadReference);
  const saveMetadata = useMutation(saveMetadataReference);
  const submit = useMutation(api.submissions.submit);
  const [entries, setEntries] = useState<OutboxEntry[]>([]);
  const [online, setOnline] = useState(true);
  const running = useRef(false);

  const refresh = useCallback(async () => {
    if (!userId) return setEntries([]);
    setEntries(await listOutbox(userId));
  }, [userId]);

  const sync = useCallback(async () => {
    if (!userId || !navigator.onLine || running.current) return;
    running.current = true;
    try {
      const pending = await listOutbox(userId);
      for (const original of pending) {
        let entry: OutboxEntry = {
          ...original,
          state: "syncing",
          attempts: original.attempts + 1,
          error: undefined,
          updatedAt: Date.now(),
        };
        await updateOutbox(userId, entry);
        try {
          for (let index = 0; index < entry.evidence.length; index += 1) {
            const evidence = entry.evidence[index];
            if (evidence.metadataSaved) continue;
            let uploadKey = evidence.uploadKey;
            let storageId = evidence.storageId as Id<"_storage"> | undefined;
            if (!uploadKey || !storageId) {
              const photo = await getPhoto(userId, evidence.photoId);
              if (!photo) throw new Error(`Offline evidence ${evidence.photoId} is missing`);
              const upload = await generateUploadUrl({
                jobId: entry.jobId as Id<"jobs">,
                submissionKey: entry.submissionKey,
                kind: evidence.kind,
                mimeType: evidence.mimeType,
                size: evidence.size,
              });
              uploadKey = upload.uploadKey;
              entry.evidence[index] = { ...evidence, uploadKey };
              await updateOutbox(userId, entry);

              const response = await fetch(upload.uploadUrl, {
                method: "POST",
                headers: { "Content-Type": evidence.mimeType },
                body: photo.blob,
              });
              if (!response.ok) throw new Error(`Evidence upload failed (${response.status})`);
              const result = await response.json() as { storageId?: Id<"_storage"> };
              if (!result.storageId) throw new Error("Evidence upload did not return a storage ID");
              storageId = result.storageId;
              entry.evidence[index] = { ...entry.evidence[index], storageId: String(storageId) };
              await updateOutbox(userId, entry);
            }
            await saveMetadata({ uploadKey, storageId });
            entry.evidence[index] = {
              ...entry.evidence[index],
              metadataSaved: true,
            };
            await updateOutbox(userId, entry);
          }

          await submit({
            jobId: entry.jobId as Id<"jobs">,
            submissionKey: entry.submissionKey,
            ...entry.payload,
            chemicalUsage: entry.payload.chemicalUsage.map((usage) => ({
              ...usage,
              productId: usage.productId as Id<"chemicalProducts">,
            })),
          });
          await deleteOutbox(userId, entry.submissionKey);
        } catch (error) {
          const failure = syncFailure(error);
          entry = { ...entry, ...failure, updatedAt: Date.now() };
          await updateOutbox(userId, entry);
        }
      }
    } finally {
      running.current = false;
      await refresh();
    }
  }, [generateUploadUrl, refresh, saveMetadata, submit, userId]);

  useEffect(() => {
    const updateOnline = () => {
      setOnline(navigator.onLine);
      if (navigator.onLine) void sync();
    };
    queueMicrotask(updateOnline);
    queueMicrotask(() => void refresh().then(() => {
      if (navigator.onLine) void sync();
    }));
    window.addEventListener("online", updateOnline);
    window.addEventListener(CHANGE_EVENT, refresh);
    return () => {
      window.removeEventListener("online", updateOnline);
      window.removeEventListener(CHANGE_EVENT, refresh);
    };
  }, [refresh, sync]);

  return { entries, online, retry: sync };
}

export function OutboxSyncStatus() {
  const { entries, online, retry } = useOutboxSync();
  const syncing = entries.some((entry) => entry.state === "syncing");
  const conflicts = entries.filter((entry) => entry.state === "conflict").length;
  const failures = entries.filter((entry) => entry.state === "failed").length;

  return (
    <div className={styles.status} aria-live="polite">
      <span className={styles.summary} title={entries[0]?.error}>
        {conflicts || failures ? <AlertTriangle size={15} /> : entries.length ? <CloudUpload size={15} /> : <CheckCircle2 size={15} />}
        {entries.length ? `${entries.length} queued${conflicts ? `, ${conflicts} conflict` : failures ? `, ${failures} failed` : ""}` : "Outbox clear"}
      </span>
      {entries.length > 0 && (
        <button className={styles.retry} type="button" disabled={!online || syncing} onClick={() => void retry()}>
          <RefreshCw className={syncing ? "spin" : undefined} size={14} />
          <span>{online ? "Retry" : "Offline"}</span>
        </button>
      )}
    </div>
  );
}

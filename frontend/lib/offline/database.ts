import type {
  CachedFieldJob,
  CachedJob,
  FieldDraft,
  OutboxEntry,
  StoredPhoto,
  SubmissionPayload,
} from "./types";

const DATABASE_PREFIX = "fumivanta-field-user-";
const LEGACY_DATABASE = "fumivanta-field";
const VERSION = 2;
const JOBS = "jobs";
const DRAFTS = "drafts";
const OUTBOX = "outbox";
const PHOTOS = "photos";
const CHANGE_EVENT = "fumivanta-outbox-change";

function databaseName(userId: string) {
  return `${DATABASE_PREFIX}${encodeURIComponent(userId)}`;
}

function openDatabase(userId: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName(userId), VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(JOBS)) db.createObjectStore(JOBS, { keyPath: "id" });
      if (!db.objectStoreNames.contains(DRAFTS)) db.createObjectStore(DRAFTS, { keyPath: "jobId" });
      if (!db.objectStoreNames.contains(OUTBOX)) db.createObjectStore(OUTBOX, { keyPath: "submissionKey" });
      if (!db.objectStoreNames.contains(PHOTOS)) db.createObjectStore(PHOTOS, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Offline database could not be opened"));
  });
}

function complete(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Offline transaction failed"));
    transaction.onabort = () => reject(transaction.error ?? new Error("Offline transaction was cancelled"));
  });
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Offline request failed"));
  });
}

function notifyOutboxChanged() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(CHANGE_EVENT));
}

export { CHANGE_EVENT };

export async function replaceCachedJobs(userId: string, jobs: CachedJob[]) {
  const db = await openDatabase(userId);
  const transaction = db.transaction(JOBS, "readwrite");
  const store = transaction.objectStore(JOBS);
  const existing = await requestResult(store.getAll()) as CachedJob[];
  const incomingIds = new Set(jobs.map((job) => job.id));
  // Index once: the prior lookup below used to be a linear find() per incoming
  // job, which is quadratic across a full technician sync.
  const existingById = new Map(existing.map((job) => [job.id, job]));
  const staleIds = new Set<string>();
  for (const oldJob of existing) {
    if (incomingIds.has(oldJob.id)) continue;
    staleIds.add(oldJob.id);
    store.delete(oldJob.id);
  }
  for (const job of jobs) {
    const prior = existingById.get(job.id);
    store.put(prior && "snapshot" in prior ? { ...prior, ...job } : job);
  }
  await complete(transaction);
  if (staleIds.size > 0) {
    const prune = db.transaction([DRAFTS, PHOTOS, OUTBOX], "readwrite");
    const drafts = prune.objectStore(DRAFTS);
    const photoStore = prune.objectStore(PHOTOS);
    const [photos, outbox] = await Promise.all([
      requestResult(photoStore.getAll()) as Promise<StoredPhoto[]>,
      requestResult(prune.objectStore(OUTBOX).getAll()) as Promise<OutboxEntry[]>,
    ]);
    const queuedJobs = new Set(outbox.map((entry) => entry.jobId));
    for (const jobId of staleIds) {
      if (!queuedJobs.has(jobId)) drafts.delete(jobId);
    }
    for (const photo of photos) {
      if (staleIds.has(photo.jobId) && !queuedJobs.has(photo.jobId)) photoStore.delete(photo.id);
    }
    await complete(prune);
  }
  db.close();
}

export async function listCachedJobs(userId: string): Promise<CachedJob[]> {
  const db = await openDatabase(userId);
  const jobs = await requestResult(db.transaction(JOBS).objectStore(JOBS).getAll()) as CachedJob[];
  db.close();
  return jobs.sort((a, b) => a.scheduledStart - b.scheduledStart);
}

export async function cacheFieldJob(userId: string, job: CachedFieldJob) {
  const db = await openDatabase(userId);
  const transaction = db.transaction(JOBS, "readwrite");
  transaction.objectStore(JOBS).put(job);
  await complete(transaction);
  db.close();
}

export async function getCachedFieldJob(userId: string, jobId: string): Promise<CachedFieldJob | undefined> {
  const db = await openDatabase(userId);
  const job = await requestResult(db.transaction(JOBS).objectStore(JOBS).get(jobId)) as CachedFieldJob | undefined;
  db.close();
  return job?.snapshot ? job : undefined;
}

export async function saveDraft(userId: string, draft: FieldDraft) {
  const db = await openDatabase(userId);
  const transaction = db.transaction(DRAFTS, "readwrite");
  transaction.objectStore(DRAFTS).put(draft);
  await complete(transaction);
  db.close();
}

export async function getDraft(userId: string, jobId: string): Promise<FieldDraft | undefined> {
  const db = await openDatabase(userId);
  const draft = await requestResult(db.transaction(DRAFTS).objectStore(DRAFTS).get(jobId)) as FieldDraft | undefined;
  db.close();
  return draft;
}

export async function savePhoto(userId: string, jobId: string, kind: StoredPhoto["kind"], file: File) {
  const photo: StoredPhoto = {
    id: crypto.randomUUID(),
    jobId,
    kind,
    blob: file,
    mimeType: file.type,
    size: file.size,
    name: file.name,
    createdAt: Date.now(),
  };
  const db = await openDatabase(userId);
  const transaction = db.transaction(PHOTOS, "readwrite");
  transaction.objectStore(PHOTOS).add(photo);
  await complete(transaction);
  db.close();
  return photo;
}

export async function getPhoto(userId: string, photoId: string): Promise<StoredPhoto | undefined> {
  const db = await openDatabase(userId);
  const photo = await requestResult(db.transaction(PHOTOS).objectStore(PHOTOS).get(photoId)) as StoredPhoto | undefined;
  db.close();
  return photo;
}

export async function getPhotos(userId: string, photoIds: string[]): Promise<StoredPhoto[]> {
  const photos = await Promise.all(photoIds.map((photoId) => getPhoto(userId, photoId)));
  return photos.filter((photo): photo is StoredPhoto => Boolean(photo));
}

export async function deletePhoto(userId: string, photoId: string) {
  const db = await openDatabase(userId);
  const transaction = db.transaction(PHOTOS, "readwrite");
  transaction.objectStore(PHOTOS).delete(photoId);
  await complete(transaction);
  db.close();
}

export async function enqueueSubmission(
  userId: string,
  jobId: string,
  payload: SubmissionPayload,
  photos: StoredPhoto[],
) {
  const now = Date.now();
  const entry: OutboxEntry = {
    submissionKey: crypto.randomUUID(),
    jobId,
    payload: structuredClone(payload),
    evidence: photos.map(({ id, kind, mimeType, size }) => ({ photoId: id, kind, mimeType, size })),
    state: "queued",
    attempts: 0,
    createdAt: now,
    updatedAt: now,
  };
  const db = await openDatabase(userId);
  const transaction = db.transaction(OUTBOX, "readwrite");
  transaction.objectStore(OUTBOX).add(entry);
  await complete(transaction);
  db.close();
  notifyOutboxChanged();
  return entry;
}

export async function listOutbox(userId: string): Promise<OutboxEntry[]> {
  const db = await openDatabase(userId);
  const entries = await requestResult(db.transaction(OUTBOX).objectStore(OUTBOX).getAll()) as OutboxEntry[];
  db.close();
  return entries.sort((a, b) => a.createdAt - b.createdAt);
}

export async function getOutbox(userId: string, submissionKey: string): Promise<OutboxEntry | undefined> {
  const db = await openDatabase(userId);
  const entry = await requestResult(db.transaction(OUTBOX).objectStore(OUTBOX).get(submissionKey)) as OutboxEntry | undefined;
  db.close();
  return entry;
}

export async function updateOutbox(userId: string, entry: OutboxEntry) {
  const db = await openDatabase(userId);
  const transaction = db.transaction(OUTBOX, "readwrite");
  transaction.objectStore(OUTBOX).put({ ...entry, updatedAt: Date.now() });
  await complete(transaction);
  db.close();
  notifyOutboxChanged();
}

export async function deleteOutbox(userId: string, submissionKey: string) {
  // Independent reads, so open the database alongside the lookup instead of
  // waiting for it first.
  const [entry, db] = await Promise.all([getOutbox(userId, submissionKey), openDatabase(userId)]);
  const transaction = db.transaction([OUTBOX, PHOTOS], "readwrite");
  transaction.objectStore(OUTBOX).delete(submissionKey);
  for (const evidence of entry?.evidence ?? []) transaction.objectStore(PHOTOS).delete(evidence.photoId);
  await complete(transaction);
  db.close();
  notifyOutboxChanged();
}

export function purgeOfflineData(userId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(databaseName(userId));
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error("Offline database could not be purged"));
    request.onblocked = () => reject(new Error("Close other Fumivanta tabs before signing out"));
  });
}

export function purgeLegacyOfflineData(): Promise<void> {
  return new Promise((resolve) => {
    const request = indexedDB.deleteDatabase(LEGACY_DATABASE);
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  });
}

"use client";

import { useAuth } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import type { Id } from "@backend/_generated/dataModel";
import { api } from "@backend/_generated/api";
import { Camera, Check, CloudUpload, LocateFixed, Save, ShieldCheck, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { SignaturePad } from "./signature-pad";
import {
  cacheFieldJob,
  deletePhoto,
  enqueueSubmission,
  getCachedFieldJob,
  getDraft,
  getPhotos,
  saveDraft,
  savePhoto,
} from "@/lib/offline/database";
import type { CachedFieldJob, InventoryProduct, LocationEvidence, StoredPhoto, SubmissionPayload } from "@/lib/offline/types";
import { Select } from "@/components/ui/select";
import styles from "./field-job-form.module.css";

const MAX_PHOTOS = 20;
const MAX_PHOTO_SIZE = 10 * 1024 * 1024;
const PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function optionalText(value: string) {
  const trimmed = value.trim();
  return trimmed || undefined;
}

export function FieldJobForm({ jobId }: { jobId: string }) {
  const { userId } = useAuth();
  const liveJob = useQuery(api.jobs.getFieldSnapshot, { jobId: jobId as Id<"jobs"> });
  const [cachedJob, setCachedJob] = useState<CachedFieldJob>();
  const [cachedAt] = useState(() => Date.now());
  const branchId = liveJob?.branchId ? String(liveJob.branchId) : cachedJob?.branchId;
  const liveInventory = useQuery(api.inventory.listForBranch, branchId ? { branchId: branchId as Id<"branches"> } : "skip");
  const [actualStart, setActualStart] = useState("");
  const [actualEnd, setActualEnd] = useState("");
  const [method, setMethod] = useState("");
  const [areas, setAreas] = useState("");
  const [observations, setObservations] = useState("");
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [technicianName, setTechnicianName] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [absenceReason, setAbsenceReason] = useState("");
  const [technicianSignature, setTechnicianSignature] = useState("");
  const [customerSignature, setCustomerSignature] = useState("");
  const [completed, setCompleted] = useState<string[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [photos, setPhotos] = useState<StoredPhoto[]>([]);
  const [location, setLocation] = useState<LocationEvidence>({ status: "unavailable" });
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!userId) return;
    // Guards every await below: navigating away mid-read would otherwise
    // restore a draft into an unmounted form.
    let cancelled = false;
    void getCachedFieldJob(userId, jobId).then((cached) => {
      if (!cancelled) setCachedJob(cached);
    });
    void getDraft(userId, jobId).then(async (draft) => {
      if (!draft || cancelled) return;
      const values = draft.values;
      setActualStart(String(values.actualStart ?? ""));
      setActualEnd(String(values.actualEnd ?? ""));
      setMethod(String(values.method ?? ""));
      setAreas(String(values.areas ?? ""));
      setObservations(String(values.observations ?? ""));
      setProductId(String(values.productId ?? ""));
      setQuantity(String(values.quantity ?? ""));
      setTechnicianName(String(values.technicianName ?? ""));
      setCustomerName(String(values.customerName ?? ""));
      setAbsenceReason(String(values.absenceReason ?? ""));
      setTechnicianSignature(String(values.technicianSignature ?? ""));
      setCustomerSignature(String(values.customerSignature ?? ""));
      setCompleted(Array.isArray(values.completed) ? values.completed.map(String) : []);
      setNotes(values.notes && typeof values.notes === "object" ? values.notes as Record<string, string> : {});
      setLocation(values.location && typeof values.location === "object" ? values.location as LocationEvidence : { status: "unavailable" });
      const storedPhotos = await getPhotos(userId, draft.photoIds ?? []);
      if (!cancelled) setPhotos(storedPhotos);
    });
    return () => {
      cancelled = true;
    };
  }, [jobId, userId]);

  const inventory: InventoryProduct[] = liveInventory?.map((product) => ({ ...product, productId: String(product.productId) })) ?? cachedJob?.inventory ?? [];
  const selectedProduct = inventory.find((product) => product.productId === productId);
  // `completed` is scanned once per checklist item in three places; index it so
  // those become O(1) instead of a linear search inside each loop.
  const completedSet = useMemo(() => new Set(completed), [completed]);

  const job: CachedFieldJob | undefined = liveJob
    ? {
        ...liveJob,
        id: String(liveJob.id),
        branchId: String(liveJob.branchId),
        customerName: liveJob.snapshot.customerName,
        siteName: liveJob.snapshot.siteName,
        siteAddress: liveJob.snapshot.siteAddress,
        inventory,
        cachedAt,
      }
    : cachedJob;

  useEffect(() => {
    if (!liveJob || !userId) return;
    const record: CachedFieldJob = {
      ...liveJob,
      id: String(liveJob.id),
      branchId: String(liveJob.branchId),
      customerName: liveJob.snapshot.customerName,
      siteName: liveJob.snapshot.siteName,
      siteAddress: liveJob.snapshot.siteAddress,
      inventory: liveInventory?.map((product) => ({ ...product, productId: String(product.productId) })) ?? cachedJob?.inventory ?? [],
      cachedAt,
    };
    void cacheFieldJob(userId, record);
  }, [cachedAt, cachedJob?.inventory, liveInventory, liveJob, userId]);

  function draftValues() {
    return {
      actualStart,
      actualEnd,
      method,
      areas,
      observations,
      productId,
      quantity,
      technicianName,
      customerName,
      absenceReason,
      technicianSignature,
      customerSignature,
      completed,
      notes,
      location,
    };
  }

  async function save() {
    if (!job || !userId) return;
    await saveDraft(userId, { jobId, revision: job.revision, values: draftValues(), photoIds: photos.map((photo) => photo.id), updatedAt: Date.now() });
    setMessage("Draft and photos saved on this device.");
  }

  async function addPhotos(kind: StoredPhoto["kind"], event: ChangeEvent<HTMLInputElement>) {
    if (!userId) return;
    const files = [...(event.target.files ?? [])];
    event.target.value = "";
    if (photos.length + files.length > MAX_PHOTOS) return setMessage(`A job can contain up to ${MAX_PHOTOS} photos.`);
    const invalid = files.find((file) => !PHOTO_TYPES.has(file.type) || file.size <= 0 || file.size > MAX_PHOTO_SIZE);
    if (invalid) return setMessage(`${invalid.name} must be a JPEG, PNG, or WebP image up to 10 MB.`);
    const stored = await Promise.all(files.map((file) => savePhoto(userId, jobId, kind, file)));
    setPhotos((current) => [...current, ...stored]);
    setMessage(`${stored.length} ${kind} photo${stored.length === 1 ? "" : "s"} stored offline.`);
  }

  async function removePhoto(photo: StoredPhoto) {
    if (!userId) return;
    await deletePhoto(userId, photo.id);
    setPhotos((current) => current.filter((item) => item.id !== photo.id));
  }

  function locate() {
    if (!navigator.geolocation) return setLocation({ status: "unsupported" });
    navigator.geolocation.getCurrentPosition(
      (position) => setLocation({ status: "captured", latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy }),
      (error) => setLocation({ status: error.code === error.PERMISSION_DENIED ? "denied" : "unavailable" }),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!job || !userId) return;
    const start = new Date(actualStart).getTime();
    const end = new Date(actualEnd).getTime();
    const amount = Number(quantity);
    const treatedAreas = areas.split(",").map((area) => area.trim()).filter(Boolean);
    const required: string[] = [];
    for (const item of job.snapshot.checklistItems) if (item.required) required.push(item.key);
    const needsBefore = job.snapshot.checklistItems.some((item) => item.required && item.evidence === "before_photo");
    const needsAfter = job.snapshot.checklistItems.some((item) => item.required && item.evidence === "after_photo");
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return setMessage("Actual end must be after actual start.");
    if (required.some((key) => !completedSet.has(key)) || !method.trim() || !treatedAreas.length || !selectedProduct || !Number.isFinite(amount) || amount <= 0 || !technicianName.trim() || !technicianSignature || (!customerSignature && !absenceReason.trim())) {
      return setMessage("Complete treatment details, chemical usage, required checks, and signature evidence before queuing.");
    }
    if ((needsBefore && !photos.some((photo) => photo.kind === "before")) || (needsAfter && !photos.some((photo) => photo.kind === "after"))) {
      return setMessage("Add the required before and after photo evidence before queuing.");
    }
    const payload: SubmissionPayload = {
      jobRevision: job.revision,
      actualStart: start,
      actualEnd: end,
      durationMinutes: Math.max(1, Math.round((end - start) / 60_000)),
      method: method.trim(),
      treatedAreas,
      dosage: `${amount} ${selectedProduct.unit}`,
      observations: optionalText(observations),
      chemicalUsage: [{
        productId: selectedProduct.productId,
        quantity: amount,
      }],
      checklistAnswers: job.snapshot.checklistItems.map((item) => ({ key: item.key, completed: completedSet.has(item.key), note: optionalText(notes[item.key] ?? "") })),
      technicianSignerName: technicianName.trim(),
      technicianSignature,
      customerSignerName: optionalText(customerName),
      customerSignature: customerSignature || undefined,
      representativeAbsentReason: optionalText(absenceReason),
      location,
    };
    await enqueueSubmission(userId, jobId, payload, photos);
    await saveDraft(userId, { jobId, revision: job.revision, values: draftValues(), photoIds: [], updatedAt: Date.now() });
    setPhotos([]);
    setMessage("Submission secured in the device outbox. It will sync automatically when online.");
  }

  if (!job) return <div className="center-state">Open this job online once to make the full field record available offline.</div>;

  const duration = actualStart && actualEnd ? Math.max(0, Math.round((new Date(actualEnd).getTime() - new Date(actualStart).getTime()) / 60_000)) : 0;
  return (
    <form className="page-stack field-form" onSubmit={submit}>
      <header className="page-header compact"><div><p className="eyebrow">Field record · revision {job.revision}</p><h1>{job.snapshot.customerName}</h1><p>{job.snapshot.siteName} · {job.snapshot.siteAddress}</p></div><span className="status-tag">{job.status.replaceAll("_", " ")}</span></header>

      <section className="form-section"><div className="panel-heading"><ShieldCheck /><div><h2>Treatment record</h2><p>{job.serviceType} · target: {job.targetPest}</p></div></div>
        <div className="field-grid">
          <label>Actual start<input type="datetime-local" value={actualStart} onChange={(event) => setActualStart(event.target.value)} required /></label>
          <label>Actual end<input type="datetime-local" value={actualEnd} onChange={(event) => setActualEnd(event.target.value)} required /></label>
          <label>Duration<input value={`${duration} minutes`} readOnly /></label>
          <label>Method<input value={method} onChange={(event) => setMethod(event.target.value)} required /></label>
          <label>Treated areas<input value={areas} onChange={(event) => setAreas(event.target.value)} placeholder="Warehouse, loading bay" required /></label>
          <label>Product<Select value={productId} onChange={(event) => setProductId(event.target.value)} required><option value="">Select stocked product</option>{inventory.map((product) => <option value={product.productId} key={product.productId}>{product.name} ({product.quantity} {product.unit} available)</option>)}</Select></label>
          <label>Quantity<input type="number" min="0" step="any" value={quantity} onChange={(event) => setQuantity(event.target.value)} required /></label>
          <label>Unit<input value={selectedProduct?.unit ?? "Select a product"} readOnly /></label>
          <label className={styles.wide}>Observations<textarea value={observations} onChange={(event) => setObservations(event.target.value)} /></label>
        </div>
      </section>

      <section className="form-section"><div className="panel-heading"><Check /><div><h2>Completion checklist</h2><p>Version {job.snapshot.checklistVersion}</p></div></div><div className="check-list">{job.snapshot.checklistItems.map((item) => <div className={styles.checkItem} key={item.key}><label className="check-row"><input type="checkbox" checked={completedSet.has(item.key)} onChange={(event) => setCompleted((current) => event.target.checked ? [...new Set([...current, item.key])] : current.filter((key) => key !== item.key))} /><span>{item.label}{item.required ? " *" : ""}</span><small>{item.evidence.replaceAll("_", " ")}</small></label><label className={styles.note}>Note<textarea value={notes[item.key] ?? ""} onChange={(event) => setNotes((current) => ({ ...current, [item.key]: event.target.value }))} /></label></div>)}</div></section>

      <section className="form-section"><div className="panel-heading"><Camera /><div><h2>Photo evidence</h2><p>JPEG, PNG, or WebP; 10 MB each; {photos.length}/{MAX_PHOTOS} stored</p></div></div><div className={styles.photoActions}><label className={styles.fileButton}>Add before photos<input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" multiple onChange={(event) => void addPhotos("before", event)} /></label><label className={styles.fileButton}>Add after photos<input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" multiple onChange={(event) => void addPhotos("after", event)} /></label></div><div className={styles.photoList}>{photos.map((photo) => <div className={styles.photoRow} key={photo.id}><span>{photo.kind}: {photo.name} ({(photo.size / 1024 / 1024).toFixed(1)} MB)</span><button type="button" onClick={() => void removePhoto(photo)} aria-label={`Remove ${photo.name}`}><Trash2 size={15} /></button></div>)}</div></section>

      <section className="form-section"><div className="panel-heading"><LocateFixed /><div><h2>Location and signatures</h2><p>Location status: {location.status}</p></div></div><Button icon={LocateFixed} type="button" variant="secondary" onClick={locate}>Capture location</Button><div className="field-grid"><label>Technician signer<input value={technicianName} onChange={(event) => setTechnicianName(event.target.value)} required /></label><label>Customer signer<input value={customerName} onChange={(event) => setCustomerName(event.target.value)} /></label><label className={styles.wide}>Representative absent reason<input value={absenceReason} onChange={(event) => setAbsenceReason(event.target.value)} /></label></div><div className="signature-grid"><SignaturePad label="Technician signature" value={technicianSignature} onChange={setTechnicianSignature} /><SignaturePad label="Customer signature" value={customerSignature} onChange={setCustomerSignature} /></div></section>
      <div className="form-actions"><Button icon={Save} type="button" variant="secondary" onClick={() => void save()}>Save offline draft</Button><Button icon={CloudUpload} type="submit">Queue submission</Button></div>
      {message && <p className="outbox-message" role="status">{message}</p>}
    </form>
  );
}

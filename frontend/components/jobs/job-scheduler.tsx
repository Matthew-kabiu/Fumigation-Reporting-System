"use client";

import { useMutation, useQuery } from "convex/react";
import { CalendarPlus, CheckSquare2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { api } from "@backend/_generated/api";
import type { Id } from "@backend/_generated/dataModel";
import { ROUTES } from "@/lib/routes";
import { BranchSelector } from "./branch-selector";
import { WorkflowState } from "./workflow-state";
import { Select } from "@/components/ui/select";
import styles from "./workflows.module.css";
import { useBranchSelection } from "@/hooks/use-branch-selection";

export function JobScheduler() {
  const router = useRouter();
  const { branches, branchId, setBranchId } = useBranchSelection();
  const [customerId, setCustomerId] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const customers = useQuery(api.customers.listForBranch, branchId ? { branchId: branchId as Id<"branches">, limit: 100 } : "skip");
  const sites = useQuery(api.sites.listForCustomer, customerId ? { customerId: customerId as Id<"customers"> } : "skip");
  const checklist = useQuery(api.checklists.active);
  const technicians = useQuery(api.users.listForBranch, branchId ? { branchId: branchId as Id<"branches"> } : "skip");
  // Single pass, computed once per technicians change rather than per render.
  const activeTechnicians = useMemo(
    () => (technicians ?? []).filter((user) => user.role === "technician" && user.status === "active"),
    [technicians],
  );
  const settings = useQuery(api.settings.get);
  const createJob = useMutation(api.jobs.create);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    if (!checklist) { setError("An active checklist is required before scheduling."); return; }
    setSaving(true); setError("");
    const technicianId = String(form.get("technicianId") ?? "");
    try {
      const jobId = await createJob({ branchId: branchId as Id<"branches">, customerId: customerId as Id<"customers">, siteId: String(form.get("siteId")) as Id<"sites">, checklistTemplateId: checklist.id, assignedTechnicianId: technicianId ? technicianId as Id<"users"> : undefined, scheduledStart: new Date(String(form.get("start"))).getTime(), scheduledEnd: new Date(String(form.get("end"))).getTime(), serviceType: String(form.get("serviceType")), targetPest: String(form.get("targetPest")), instructions: optional(form, "instructions") });
      router.push(ROUTES.job(jobId));
    } catch { setError("We could not schedule this job. Check the time, customer, and assignment."); }
    finally { setSaving(false); }
  }

  return <main className={styles.stack}>
    <header className={styles.header}><div><p className={styles.eyebrow}>New assignment</p><h1>Schedule a fumigation job.</h1><p>The active checklist and company approval policy are captured automatically when this job is created.</p></div></header>
    <BranchSelector branches={branches} value={branchId} onChange={(id) => { setBranchId(id); setCustomerId(""); }} />
    {error && <p className={`${styles.message} ${styles.error}`} role="alert">{error}</p>}
    <div className={styles.detailGrid}>
      <form className={`${styles.panel} ${styles.form}`} onSubmit={submit}>
        <div className={styles.panelHeader}><div><h2>Job details</h2><p>All times use your browser&apos;s local timezone.</p></div><CalendarPlus aria-hidden="true" size={22} /></div>
        <div className={styles.formGrid}>
          <label className={styles.field}><span>Customer</span><Select required value={customerId} onChange={(event) => setCustomerId(event.target.value)}><option value="">Select customer</option>{customers?.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</Select></label>
          <label className={styles.field}><span>Service site</span><Select name="siteId" required disabled={!customerId}><option value="">Select site</option>{sites?.map((site) => <option key={site.id} value={site.id}>{site.name} · {site.address}</option>)}</Select></label>
          <label className={styles.field}><span>Starts</span><input name="start" type="datetime-local" required /></label>
          <label className={styles.field}><span>Ends</span><input name="end" type="datetime-local" required /></label>
          <label className={styles.field}><span>Service type</span><input name="serviceType" required minLength={2} placeholder="Structural fumigation" /></label>
          <label className={styles.field}><span>Target pest</span><input name="targetPest" required minLength={2} placeholder="Drywood termites" /></label>
          <label className={`${styles.field} ${styles.full}`}><span>Technician</span><Select name="technicianId"><option value="">Leave unassigned</option>{activeTechnicians.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</Select></label>
          <label className={`${styles.field} ${styles.full}`}><span>Instructions</span><textarea name="instructions" /></label>
        </div>
        <button className="button button-primary" disabled={saving || !branchId || !customerId || !checklist} type="submit"><CalendarPlus aria-hidden="true" size={17} /> {saving ? "Scheduling..." : "Schedule job"}</button>
      </form>
      <aside className={`${styles.panel} ${styles.form}`}>
        <div className={styles.panelHeader}><div><h2>Captured controls</h2><p>Current operational rules applied to this job.</p></div><CheckSquare2 aria-hidden="true" size={22} /></div>
        {checklist === undefined || settings === undefined ? <WorkflowState kind="loading" title="Loading controls" detail="Reading checklist and approval settings." /> : <><div className={styles.fact}><span>Checklist</span><strong>{checklist ? `${checklist.name} · v${checklist.version}` : "Not configured"}</strong></div><div className={styles.fact}><span>Approval policy</span><strong>{settings.approvalPolicy.replaceAll("_", " ")}</strong></div>{checklist && <div className={styles.list}>{checklist.items.map((item) => <div className={styles.row} key={item.key}><div><h3>{item.label}</h3><p>{item.evidence === "none" ? "No photo required" : item.evidence.replaceAll("_", " ")}</p></div><span className={styles.tag}>{item.required ? "Required" : "Optional"}</span></div>)}</div>}</>}
      </aside>
    </div>
  </main>;
}

function optional(form: FormData, key: string) { const value = String(form.get(key) ?? "").trim(); return value || undefined; }

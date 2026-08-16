"use client";

import { useMutation, useQuery } from "convex/react";
import { Ban, CalendarClock, CheckCircle2, RotateCcw, UserCheck, XCircle } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { api } from "@backend/_generated/api";
import type { Id } from "@backend/_generated/dataModel";
import { ROUTES } from "@/lib/routes";
import { formatDateTime as formatDate } from "@/lib/utils/format-date";
import { WorkflowState } from "./workflow-state";
import { Select } from "@/components/ui/select";
import styles from "./workflows.module.css";

export function JobDetail({ jobId }: { jobId: string }) {
  const id = jobId as Id<"jobs">;
  const user = useQuery(api.users.current);
  const job = useQuery(api.jobs.getForStaff, { jobId: id });
  const canOperate = user?.role === "company_admin" || user?.role === "manager" || user?.role === "operations";
  const canApprove = user?.role === "company_admin" || user?.role === "manager";
  const technicians = useQuery(api.users.listForBranch, job && canOperate ? { branchId: job.branchId } : "skip");
  // Single pass, computed once per technicians change rather than per render.
  const activeTechnicians = useMemo(
    () => (technicians ?? []).filter((entry) => entry.role === "technician" && entry.status === "active"),
    [technicians],
  );
  const assign = useMutation(api.jobs.assign);
  const reschedule = useMutation(api.jobs.reschedule);
  const cancel = useMutation(api.jobs.cancel);
  const reject = useMutation(api.jobs.reject);
  const approve = useMutation(api.reports.approve);
  const close = useMutation(api.jobs.close);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);

  async function run(action: () => Promise<unknown>, success: string) {
    setWorking(true); setError(""); setMessage("");
    try { await action(); setMessage(success); }
    catch { setError("That action is not available for the job's current state. Refresh and try again."); }
    finally { setWorking(false); }
  }

  if (job === undefined) return <main className={styles.stack}><WorkflowState kind="loading" title="Loading job" detail="Reading the current assignment and review state." /></main>;
  if (job === null) return <main className={styles.stack}><WorkflowState kind="error" title="Job unavailable" detail="It may have been removed or is outside your branch access." /></main>;

  return <main className={styles.stack}>
    <header className={styles.header}><div><p className={styles.eyebrow}>Job · revision {job.revision}</p><h1>{job.customer?.name ?? job.snapshot.customerName}</h1><p>{job.site?.name ?? job.snapshot.siteName} · {job.site?.address ?? job.snapshot.siteAddress}</p></div><span className={`${styles.tag} ${job.status === "under_review" ? styles.tagWarn : styles.tagLive}`}>{job.status.replaceAll("_", " ")}</span></header>
    {(message || error) && <p className={`${styles.message} ${error ? styles.error : ""}`} role={error ? "alert" : "status"}>{error || message}</p>}
    <div className={styles.detailGrid}>
      <section className={styles.panel} aria-labelledby="job-summary"><div className={styles.panelHeader}><div><h2 id="job-summary">Treatment brief</h2><p>The field team works from this immutable customer and site snapshot.</p></div><CalendarClock aria-hidden="true" size={22} /></div><div className={styles.facts}><Fact label="Service" value={job.serviceType} /><Fact label="Target pest" value={job.targetPest} /><Fact label="Starts" value={formatDate(job.scheduledStart)} /><Fact label="Ends" value={formatDate(job.scheduledEnd)} /><Fact label="Technician" value={job.technician?.name ?? "Unassigned"} /><Fact label="Approval" value={job.approvalPolicy.replaceAll("_", " ")} /></div>{job.instructions && <div className={styles.timelineItem}><strong>Instructions</strong><span>{job.instructions}</span></div>}
        <div className={styles.panelHeader}><div><h2>Checklist snapshot</h2><p>Version {job.snapshot.checklistVersion}, captured at scheduling.</p></div></div><div className={styles.list}>{job.snapshot.checklistItems.map((item) => <div className={styles.row} key={item.key}><div><h3>{item.label}</h3><p>{item.evidence.replaceAll("_", " ")}</p></div><span className={styles.tag}>{item.required ? "Required" : "Optional"}</span></div>)}</div>
      </section>
      <aside className={`${styles.panel} ${styles.form}`} aria-labelledby="job-actions"><div className={styles.panelHeader}><div><h2 id="job-actions">{canOperate ? "Job actions" : "Job record"}</h2><p>{canOperate ? "Only valid transitions are accepted." : "This audit view is read-only."}</p></div></div>
        {canOperate && <><form className={styles.form} onSubmit={(event) => { event.preventDefault(); const value = new FormData(event.currentTarget).get("technicianId") as string; void run(() => assign({ jobId: id, technicianId: value as Id<"users"> }), "Technician assignment updated."); }}><label className={styles.field}><span>Assigned technician</span><Select name="technicianId" required defaultValue={job.assignedTechnicianId ?? ""}><option value="" disabled>Select technician</option>{activeTechnicians.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</Select></label><button className="button button-secondary" disabled={working} type="submit"><UserCheck aria-hidden="true" size={16} /> Assign</button></form>
        <form className={styles.form} onSubmit={(event) => submitReschedule(event, (start, end) => run(() => reschedule({ jobId: id, scheduledStart: start, scheduledEnd: end }), "Job rescheduled."))}><div className={styles.formGrid}><label className={styles.field}><span>New start</span><input name="start" type="datetime-local" required /></label><label className={styles.field}><span>New end</span><input name="end" type="datetime-local" required /></label></div><button className="button button-secondary" disabled={working} type="submit"><RotateCcw aria-hidden="true" size={16} /> Reschedule</button></form>
        {job.status === "under_review" && canApprove && <><button className="button button-primary" disabled={working} onClick={() => void run(() => approve({ jobId: id }), "Job approved and report created.")} type="button"><CheckCircle2 aria-hidden="true" size={16} /> Approve report</button><ReasonAction label="Reject submission" icon="reject" working={working} onSubmit={(reason) => run(() => reject({ jobId: id, reason }), "Submission returned to the field team.")} /></>}
        {!["cancelled", "closed", "accepted"].includes(job.status) && <ReasonAction label="Cancel job" icon="cancel" working={working} onSubmit={(reason) => run(() => cancel({ jobId: id, reason }), "Job cancelled.")} />}
        {["approved", "delivered", "accepted"].includes(job.status) && <button className="button button-primary" disabled={working} onClick={() => void run(() => close({ jobId: id }), "Job closed.")} type="button"><CheckCircle2 aria-hidden="true" size={16} /> Close job</button>}</>}
        {job.reports.length > 0 && <div className={styles.list}>{job.reports.map((report) => <Link className={styles.row} href={ROUTES.report(report.id)} key={report.id}><div><h3>{report.reportNumber}</h3><p>Version {report.version}</p></div><span className={styles.tag}>{report.status}</span></Link>)}</div>}
      </aside>
    </div>
  </main>;
}

function Fact({ label, value }: { label: string; value: string }) { return <div className={styles.fact}><span>{label}</span><strong>{value}</strong></div>; }

function submitReschedule(event: FormEvent<HTMLFormElement>, action: (start: number, end: number) => void) { event.preventDefault(); const data = new FormData(event.currentTarget); action(new Date(String(data.get("start"))).getTime(), new Date(String(data.get("end"))).getTime()); }
function ReasonAction({ label, icon, working, onSubmit }: { label: string; icon: "reject" | "cancel"; working: boolean; onSubmit: (reason: string) => Promise<unknown> }) { const Icon = icon === "reject" ? XCircle : Ban; return <form className={styles.form} onSubmit={(event) => { event.preventDefault(); void onSubmit(String(new FormData(event.currentTarget).get("reason"))); }}><label className={styles.field}><span>{label} reason</span><textarea name="reason" required minLength={3} /></label><button className="button button-danger" disabled={working} type="submit"><Icon aria-hidden="true" size={16} /> {label}</button></form>; }

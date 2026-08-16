"use client";

import { useMutation, useQuery } from "convex/react";
import { CheckCircle2, FileCheck2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { api } from "@backend/_generated/api";
import type { Id } from "@backend/_generated/dataModel";
import { BranchSelector } from "@/components/jobs/branch-selector";
import { WorkflowState } from "@/components/jobs/workflow-state";
import styles from "@/components/jobs/workflows.module.css";
import { ROUTES } from "@/lib/routes";
import { formatDate } from "@/lib/utils/format-date";
import { useBranchSelection } from "@/hooks/use-branch-selection";

const REVIEW_WINDOW_MS = 365 * 86_400_000;

export function ReportsWorkspace() {
  const { branches, branchId, setBranchId } = useBranchSelection();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  const user = useQuery(api.users.current);
  // Per mount, not module scope: a module-level Date.now() freezes the review
  // window at the moment the chunk first loaded.
  const [reviewWindow] = useState(() => {
    const now = Date.now();
    return { start: now - REVIEW_WINDOW_MS, end: now + REVIEW_WINDOW_MS };
  });
  const reports = useQuery(api.reports.listForBranch, branchId ? { branchId: branchId as Id<"branches">, limit: 100 } : "skip");
  const reviewJobs = useQuery(api.jobs.listForBranch, branchId ? { branchId: branchId as Id<"branches">, from: reviewWindow.start, to: reviewWindow.end, limit: 100 } : "skip");
  const approve = useMutation(api.reports.approve);
  const canApprove = user?.role === "company_admin" || user?.role === "manager";
  const pending = reviewJobs?.filter((job) => job.status === "under_review") ?? [];

  async function approveJob(jobId: Id<"jobs">) {
    setWorking(true);
    setError("");
    setMessage("");
    try {
      await approve({ jobId });
      setMessage("Submission approved and report created.");
    } catch {
      setError("This submission could not be approved from its current state.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <main className={styles.stack}>
      <header className={styles.header}>
        <div><p className={styles.eyebrow}>Approved record</p><h1>Reports customers can trust.</h1><p>Review approved snapshots, deliver them to the portal, and retain an acceptance trail.</p></div>
      </header>
      <BranchSelector branches={branches} value={branchId} onChange={setBranchId} />
      {(message || error) && <p className={`${styles.message} ${error ? styles.error : ""}`} role={error ? "alert" : "status"}>{error || message}</p>}
      {pending.length > 0 && (
        <section className={styles.panel}>
          <div className={styles.panelHeader}><div><h2>Awaiting approval</h2><p>Review the job detail before issuing its report.</p></div><CheckCircle2 aria-hidden="true" size={22} /></div>
          <div className={styles.list}>
            {pending.map((job) => (
              <div className={styles.row} key={job.id}>
                <div><Link href={ROUTES.job(job.id)}><h3>{job.customerName} · {job.siteName}</h3><p>{job.serviceType} · submitted for review</p></Link></div>
                {canApprove && <button className="button button-primary" disabled={working} type="button" onClick={() => void approveJob(job.id)}><CheckCircle2 aria-hidden="true" size={16} /> Approve</button>}
              </div>
            ))}
          </div>
        </section>
      )}
      <section className={styles.panel}>
        <div className={styles.panelHeader}><div><h2>Branch reports</h2><p>Newest approvals first.</p></div><FileCheck2 aria-hidden="true" size={22} /></div>
        {!branchId ? <WorkflowState kind="empty" title="No branch selected" detail="Choose a branch to load its approved records." /> : reports === undefined ? <WorkflowState kind="loading" title="Loading reports" detail="Reading approved records for this branch." /> : reports.length === 0 ? <WorkflowState kind="empty" title="No reports yet" detail="Approve a submitted job to create its first report." /> : (
          <div className={styles.list}>
            {reports.map((report) => (
              <Link className={styles.row} href={ROUTES.report(report.id)} key={report.id}>
                <div><h3>{report.reportNumber} · {report.siteName}</h3><p>{report.serviceType} · version {report.version}</p></div>
                <div className={styles.rowMeta}><span className={`${styles.tag} ${report.status === "accepted" ? styles.tagLive : ""}`}>{report.status}</span><time>{formatDate(report.approvedAt)}</time></div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}


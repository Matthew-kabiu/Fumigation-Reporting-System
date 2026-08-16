"use client";

import { useMutation, useQuery } from "convex/react";
import { CheckCircle2, Printer } from "lucide-react";
import { useState, type FormEvent } from "react";
import { api } from "@backend/_generated/api";
import type { Id } from "@backend/_generated/dataModel";
import { WorkflowState } from "@/components/jobs/workflow-state";
import styles from "@/components/jobs/workflows.module.css";
import { ReportDocument, type ReportRecord } from "@/components/reports/report-document";
import { AcceptanceSignature } from "./acceptance-signature";

export function PortalReportDetail({ reportId }: { reportId: string }) {
  const id = reportId as Id<"reports">;
  const report = useQuery(api.reports.getMine, { reportId: id });
  const accept = useMutation(api.reports.accept);
  const [signature, setSignature] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (!signature) { setError("Draw your signature before accepting this report."); return; } setSaving(true); setError(""); try { await accept({ reportId: id, signerName: String(new FormData(event.currentTarget).get("signerName")), signature }); setMessage("Report accepted. Thank you for confirming the treatment record."); } catch { setError("We could not record acceptance. The report may already be accepted; refresh and try again."); } finally { setSaving(false); } }
  if (report === undefined) return <main className={`${styles.stack} ${styles.portalMode}`}><WorkflowState kind="loading" title="Loading report" detail="Reading your delivered treatment record." /></main>;
  if (report === null) return <main className={`${styles.stack} ${styles.portalMode}`}><WorkflowState kind="error" title="Report unavailable" detail="This report was not shared with your customer account." /></main>;
  return <main className={`${styles.stack} ${styles.portalMode}`}><header className={`${styles.header} ${styles.noPrint}`}><div><p className={styles.eyebrow}>Report {report.reportNumber}</p><h1>{report.snapshot.siteName}</h1><p>{report.snapshot.serviceType} · {report.status}</p></div><button className="button button-secondary" type="button" onClick={() => window.print()}><Printer aria-hidden="true" size={16} /> Print</button></header><ReportDocument report={report as ReportRecord} />{report.status === "delivered" && <form className={`${styles.panel} ${styles.form} ${styles.noPrint}`} onSubmit={submit}><div className={styles.panelHeader}><div><h2>Accept this report</h2><p>Signing confirms receipt and acceptance of the treatment record shown above.</p></div><CheckCircle2 aria-hidden="true" size={22} /></div><label className={styles.field}><span>Signer name</span><input name="signerName" required minLength={2} autoComplete="name" /></label><AcceptanceSignature onChange={setSignature} /><button className="button button-primary" disabled={saving || !signature} type="submit"><CheckCircle2 aria-hidden="true" size={16} /> {saving ? "Recording..." : "Accept report"}</button>{(message || error) && <p className={`${styles.message} ${error ? styles.error : ""}`} role={error ? "alert" : "status"}>{error || message}</p>}</form>}{report.status === "accepted" && <p className={`${styles.message} ${styles.noPrint}`} role="status">This report has been accepted.</p>}</main>;
}

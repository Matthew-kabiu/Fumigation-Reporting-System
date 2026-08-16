"use client";

import { useMutation, useQuery } from "convex/react";
import { Printer, Send } from "lucide-react";
import { useState } from "react";
import { api } from "@backend/_generated/api";
import type { Id } from "@backend/_generated/dataModel";
import { WorkflowState } from "@/components/jobs/workflow-state";
import styles from "@/components/jobs/workflows.module.css";
import { formatDate } from "@/lib/utils/format-date";
import { ReportDocument, type ReportRecord } from "./report-document";

export function StaffReportDetail({ reportId }: { reportId: string }) {
  const id = reportId as Id<"reports">;
  const user = useQuery(api.users.current);
  const report = useQuery(api.reports.getForStaff, { reportId: id });
  const deliver = useMutation(api.reports.deliver);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  async function send() { setWorking(true); setError(""); try { await deliver({ reportId: id }); setMessage("Report delivered to the customer portal."); } catch { setError("This report could not be delivered from its current state."); } finally { setWorking(false); } }
  if (report === undefined) return <main className={styles.stack}><WorkflowState kind="loading" title="Loading report" detail="Reading the immutable approved snapshot." /></main>;
  if (report === null) return <main className={styles.stack}><WorkflowState kind="error" title="Report unavailable" detail="It may be outside your branch access." /></main>;
  return <main className={styles.stack}><header className={`${styles.header} ${styles.noPrint}`}><div><p className={styles.eyebrow}>Report {report.reportNumber}</p><h1>{report.snapshot.customerName}</h1><p>{report.snapshot.siteName} · approved {formatDate(report.approvedAt)}</p></div><div className={styles.actions}><button className="button button-secondary" type="button" onClick={() => window.print()}><Printer aria-hidden="true" size={16} /> Print</button>{report.status === "approved" && user?.role !== "auditor" && <button className="button button-primary" disabled={working} type="button" onClick={() => void send()}><Send aria-hidden="true" size={16} /> {working ? "Delivering..." : "Deliver"}</button>}</div></header>{(message || error) && <p className={`${styles.message} ${error ? styles.error : ""}`} role={error ? "alert" : "status"}>{error || message}</p>}<ReportDocument report={report as ReportRecord} /></main>;
}

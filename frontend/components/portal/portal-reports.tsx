"use client";

import { useQuery } from "convex/react";
import { FileCheck2 } from "lucide-react";
import Link from "next/link";
import { api } from "@backend/_generated/api";
import { WorkflowState } from "@/components/jobs/workflow-state";
import styles from "@/components/jobs/workflows.module.css";
import { ROUTES } from "@/lib/routes";
import { formatDate } from "@/lib/utils/format-date";

export function PortalReports() {
  const reports = useQuery(api.reports.listMine, { limit: 100 });
  return <main className={`${styles.stack} ${styles.portalMode}`}><header className={styles.header}><div><p className={styles.eyebrow}>Fumivanta Portal</p><h1>Your treatment records.</h1><p>Open delivered reports, print a copy, and sign any record awaiting acceptance.</p></div></header><section className={styles.panel}><div className={styles.panelHeader}><div><h2>Reports</h2><p>Newest delivered treatment first.</p></div><FileCheck2 aria-hidden="true" size={22} /></div>{reports === undefined ? <WorkflowState kind="loading" title="Loading reports" detail="Reading records shared with your account." /> : reports.length === 0 ? <WorkflowState kind="empty" title="No reports delivered" detail="Delivered treatment reports will appear here." /> : <div className={styles.list}>{reports.map((report) => <Link className={styles.row} href={ROUTES.portalReport(report.id)} key={report.id}><div><h3>{report.reportNumber} · {report.siteName}</h3><p>{report.serviceType} · approved {formatDate(report.approvedAt)}</p></div><span className={`${styles.tag} ${report.status === "accepted" ? styles.tagLive : styles.tagWarn}`}>{report.status === "accepted" ? "Accepted" : "Signature requested"}</span></Link>)}</div>}</section></main>;
}

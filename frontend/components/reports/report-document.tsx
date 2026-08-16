import { CheckCircle2, FileImage, MapPin, ShieldCheck } from "lucide-react";
import styles from "@/components/jobs/workflows.module.css";
import { formatDateTime as formatDate } from "@/lib/utils/format-date";

export type ReportRecord = {
  id: string;
  reportNumber: string;
  jobId: string;
  version: number;
  status: string;
  approvedAt: number;
  deliveredAt?: number;
  acceptedAt?: number;
  snapshot: {
    customerName: string;
    siteName: string;
    siteAddress: string;
    serviceType: string;
    targetPest: string;
    actualStart: number;
    actualEnd: number;
    method: string;
    treatedAreas: string[];
    dosage?: string;
    durationMinutes?: number;
    observations?: string;
    checklistAnswers?: Array<{ key: string; label: string; completed: boolean; note?: string }>;
    evidence?: Array<{ evidenceId: string; kind: string; mimeType: string; size: number; url: string | null }>;
    chemicalUsage: Array<{ productName: string; activeIngredient: string; quantity: number; unit: string; batchNumber?: string }>;
    technicianSignerName: string;
    customerSignerName?: string;
    representativeAbsentReason?: string;
    location?: { status: string; latitude?: number; longitude?: number; accuracy?: number };
  };
};

export function ReportDocument({ report }: { report: ReportRecord }) {
  const snapshot = report.snapshot;
  return <article className={styles.form}>
    <div className={styles.printHeader}><strong>Fumivanta treatment report</strong></div>
    <section className={styles.panel}><div className={styles.panelHeader}><div><h2>Treatment record</h2><p>Report {report.reportNumber} · version {report.version}</p></div><ShieldCheck aria-hidden="true" size={22} /></div><div className={styles.facts}><Fact label="Customer" value={snapshot.customerName} /><Fact label="Site" value={snapshot.siteName} /><Fact label="Address" value={snapshot.siteAddress} /><Fact label="Service" value={snapshot.serviceType} /><Fact label="Target pest" value={snapshot.targetPest} /><Fact label="Method" value={snapshot.method} /><Fact label="Treatment started" value={formatDate(snapshot.actualStart)} /><Fact label="Treatment ended" value={formatDate(snapshot.actualEnd)} />{snapshot.dosage && <Fact label="Dosage" value={snapshot.dosage} />}{snapshot.durationMinutes && <Fact label="Duration" value={`${snapshot.durationMinutes} minutes`} />}</div></section>
    <section className={styles.equalGrid}><div className={styles.panel}><div className={styles.panelHeader}><div><h2>Treated areas</h2><p>Areas recorded by the technician.</p></div><MapPin aria-hidden="true" size={22} /></div><div className={styles.list}>{snapshot.treatedAreas.map((area) => <div className={styles.row} key={area}><strong>{area}</strong><CheckCircle2 aria-hidden="true" size={17} /></div>)}</div></div><div className={styles.panel}><div className={styles.panelHeader}><div><h2>Chemical usage</h2><p>Products and quantities captured in the field.</p></div></div><div className={styles.list}>{snapshot.chemicalUsage.map((chemical) => <div className={styles.row} key={`${chemical.productName}|${chemical.batchNumber ?? ""}|${chemical.quantity}${chemical.unit}`}><div><h3>{chemical.productName}</h3><p>{chemical.activeIngredient}{chemical.batchNumber ? ` · Batch ${chemical.batchNumber}` : ""}</p></div><strong>{chemical.quantity} {chemical.unit}</strong></div>)}</div></div></section>
    {snapshot.checklistAnswers && <section className={styles.panel}><div className={styles.panelHeader}><div><h2>Checklist completion</h2><p>Controls recorded with the field submission.</p></div></div><div className={styles.list}>{snapshot.checklistAnswers.map((answer) => <div className={styles.row} key={answer.key}><div><h3>{answer.label}</h3>{answer.note && <p>{answer.note}</p>}</div><span className={`${styles.tag} ${answer.completed ? styles.tagLive : styles.tagWarn}`}>{answer.completed ? "Complete" : "Incomplete"}</span></div>)}</div></section>}
    <section className={styles.equalGrid}><div className={styles.panel}><div className={styles.panelHeader}><div><h2>Sign-off</h2><p>Names retained in the approved snapshot.</p></div></div><div className={styles.timeline}><div className={styles.timelineItem}><strong>{snapshot.technicianSignerName}</strong><span>Technician</span></div><div className={styles.timelineItem}><strong>{snapshot.customerSignerName || "Representative absent"}</strong><span>{snapshot.representativeAbsentReason || "Customer representative"}</span></div></div></div><div className={styles.panel}><div className={styles.panelHeader}><div><h2>Record status</h2><p>Immutable lifecycle timestamps.</p></div></div><div className={styles.timeline}><div className={styles.timelineItem}><strong>Approved</strong><span>{formatDate(report.approvedAt)}</span></div>{report.deliveredAt && <div className={styles.timelineItem}><strong>Delivered</strong><span>{formatDate(report.deliveredAt)}</span></div>}{report.acceptedAt && <div className={styles.timelineItem}><strong>Accepted</strong><span>{formatDate(report.acceptedAt)}</span></div>}</div></div></section>
    {snapshot.observations && <section className={styles.panel}><div className={styles.panelHeader}><div><h2>Observations</h2><p>{snapshot.observations}</p></div></div></section>}
    {snapshot.evidence && snapshot.evidence.length > 0 && <section className={styles.panel}><div className={styles.panelHeader}><div><h2>Evidence</h2><p>Files retained with the approved report.</p></div><FileImage aria-hidden="true" size={22} /></div><div className={styles.list}>{snapshot.evidence.map((file) => file.url ? <a className={styles.row} href={file.url} key={file.evidenceId} target="_blank" rel="noreferrer"><div><h3>{file.kind.replaceAll("_", " ")} evidence</h3><p>{file.mimeType} · {formatBytes(file.size)}</p></div><span className={styles.tag}>Open file</span></a> : <div className={styles.row} key={file.evidenceId}><div><h3>{file.kind.replaceAll("_", " ")} evidence</h3><p>File currently unavailable</p></div></div>)}</div></section>}
  </article>;
}

function Fact({ label, value }: { label: string; value: string }) { return <div className={styles.fact}><span>{label}</span><strong>{value}</strong></div>; }

function formatBytes(value: number) { return value < 1024 * 1024 ? `${Math.ceil(value / 1024)} KB` : `${(value / 1024 / 1024).toFixed(1)} MB`; }

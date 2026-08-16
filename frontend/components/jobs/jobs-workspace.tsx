"use client";

import { useQuery } from "convex/react";
import { CalendarDays, List, Plus } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { api } from "@backend/_generated/api";
import type { Id } from "@backend/_generated/dataModel";
import { ROUTES } from "@/lib/routes";
import { BranchSelector } from "./branch-selector";
import { WorkflowState } from "./workflow-state";
import styles from "./workflows.module.css";
import { useBranchSelection } from "@/hooks/use-branch-selection";
import { formatDayAndTime, formatDayHeading, formatTime } from "@/lib/utils/format-date";

export function JobsWorkspace() {
  const { branches, branchId, setBranchId } = useBranchSelection();
  const [view, setView] = useState<"calendar" | "list">("calendar");
  const user = useQuery(api.users.current);
  // Resolved per mount, not at module scope: a module-level Date.now() is
  // evaluated once when the chunk loads and would pin this installed PWA to a
  // stale week for the rest of the session.
  const [windowStart] = useState(() => startOfWeek(Date.now()));
  const windowEnd = windowStart + 7 * 86_400_000 - 1;
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, index) => windowStart + index * 86_400_000),
    [windowStart],
  );
  const jobs = useQuery(api.jobs.listForBranch, branchId ? { branchId: branchId as Id<"branches">, from: windowStart, to: windowEnd, limit: 100 } : "skip");
  // Bucket once instead of filtering the whole job list inside each of the
  // seven day cells.
  const jobsByDay = useMemo(() => {
    const buckets = new Map<string, typeof jobs & object>();
    for (const job of jobs ?? []) {
      const key = dayKey(job.scheduledStart);
      const bucket = buckets.get(key);
      if (bucket) bucket.push(job);
      else buckets.set(key, [job]);
    }
    return buckets;
  }, [jobs]);

  return <main className={styles.stack}>
    <header className={styles.header}><div><p className={styles.eyebrow}>Operations</p><h1>The job operating line.</h1><p>Schedule, assign, monitor, review, and close each treatment from one branch calendar.</p></div>{user?.role !== "auditor" && <Link className="button button-primary" href={ROUTES.newJob}><Plus aria-hidden="true" size={17} /> Schedule job</Link>}</header>
    <div className={styles.toolbar}><BranchSelector branches={branches} value={branchId} onChange={setBranchId} /><div className={styles.tabs} role="tablist" aria-label="Job view"><button className={`${styles.tab} ${view === "calendar" ? styles.tabActive : ""}`} onClick={() => setView("calendar")} role="tab" aria-selected={view === "calendar"}><CalendarDays aria-hidden="true" size={15} /> Calendar</button><button className={`${styles.tab} ${view === "list" ? styles.tabActive : ""}`} onClick={() => setView("list")} role="tab" aria-selected={view === "list"}><List aria-hidden="true" size={15} /> List</button></div></div>
    {!branchId ? <WorkflowState kind="empty" title="No branch selected" detail="Choose a branch to load its schedule." /> : jobs === undefined ? <WorkflowState kind="loading" title="Loading schedule" detail="Reading this week's branch assignments." /> : jobs.length === 0 ? <WorkflowState kind="empty" title="No jobs this week" detail="Schedule a job to put work on the operating line." /> : view === "calendar" ? <section className={styles.calendar} aria-label="Current week job calendar">{days.map((day) => <div className={styles.day} key={day}><strong>{formatDayHeading(day)}</strong>{(jobsByDay.get(dayKey(day)) ?? []).map((job) => <Link href={ROUTES.job(job.id)} key={job.id} title={`${job.customerName}, ${job.serviceType}`}>{formatTime(job.scheduledStart)} · {job.customerName}</Link>)}</div>)}</section> : <section className={styles.panel}><div className={styles.list}>{jobs.map((job) => <Link className={styles.row} href={ROUTES.job(job.id)} key={job.id}><div><h3>{job.customerName} · {job.siteName}</h3><p>{job.serviceType} for {job.targetPest} · {job.siteAddress}</p></div><div className={styles.rowMeta}><span className={styles.tag}>{job.status.replaceAll("_", " ")}</span><time>{formatDayAndTime(job.scheduledStart)}</time></div></Link>)}</div></section>}
  </main>;
}

function startOfWeek(value: number) { const date = new Date(value); const day = (date.getDay() + 6) % 7; date.setHours(0, 0, 0, 0); date.setDate(date.getDate() - day); return date.getTime(); }
function dayKey(value: number) { return new Date(value).toDateString(); }

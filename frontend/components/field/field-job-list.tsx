"use client";

import { useAuth } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { CalendarClock, CloudOff, MapPin, RadioTower, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@backend/_generated/api";
import { listCachedJobs, replaceCachedJobs } from "@/lib/offline/database";
import type { CachedJob } from "@/lib/offline/types";
import { ROUTES } from "@/lib/routes";
import { formatDateTime } from "@/lib/utils/format-date";

const DAY = 86_400_000;

export function FieldJobList() {
  const { userId } = useAuth();
  const [online, setOnline] = useState(true);
  const [cached, setCached] = useState<CachedJob[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [windowRange] = useState(() => ({ from: Date.now() - 7 * DAY, to: Date.now() + 30 * DAY }));
  const liveJobs = useQuery(api.jobs.listAssigned, { ...windowRange, limit: 100 });

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  useEffect(() => {
    if (userId) void listCachedJobs(userId).then(setCached);
  }, [refreshKey, userId]);

  useEffect(() => {
    if (!liveJobs || !userId) return;
    const rows: CachedJob[] = liveJobs.map((job) => ({
      ...job,
      id: String(job.id),
      cachedAt: Date.now(),
    }));
    void replaceCachedJobs(userId, rows).then(() => {
      setCached(rows);
    });
  }, [liveJobs, userId]);

  const jobs: CachedJob[] = liveJobs?.map((job) => ({
    ...job,
    id: String(job.id),
    cachedAt: windowRange.from + 7 * DAY,
  })) ?? cached;

  return (
    <div className="page-stack field-page">
      <header className="page-header compact">
        <div><p className="eyebrow">Fumivanta Field</p><h1>Assigned work.</h1><p>Jobs synchronized here remain available when the signal drops.</p></div>
        <div className={online ? "connection-pill online" : "connection-pill offline"}>
          {online ? <RadioTower size={16} /> : <CloudOff size={16} />}{online ? "Online" : "Offline"}
        </div>
      </header>

      <div className="field-toolbar">
        <span>{jobs.length} assigned jobs cached</span>
        <button className="nav-action" onClick={() => setRefreshKey((value) => value + 1)}><RefreshCw size={16} /> Refresh cache</button>
      </div>

      <section className="job-list" aria-label="Assigned field jobs">
        {jobs.length === 0 ? (
          <div className="empty-state"><CalendarClock size={30} /><h2>No assigned jobs</h2><p>New assignments will be stored here after synchronization.</p></div>
        ) : jobs.map((job) => (
          <Link className="job-card" href={ROUTES.fieldJob(job.id)} key={job.id}>
            <div><span className="status-tag">{job.status.replaceAll("_", " ")}</span><h2>{job.customerName}</h2><p>{job.serviceType} · {job.targetPest}</p></div>
            <div className="job-meta"><span><MapPin size={15} /> {job.siteName}</span><span>{formatDateTime(job.scheduledStart)}</span></div>
          </Link>
        ))}
      </section>
    </div>
  );
}

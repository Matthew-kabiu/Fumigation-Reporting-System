"use client";

import { useQuery } from "convex/react";
import { AlertTriangle, ArrowUpRight, Building2, CheckCircle2, ClipboardClock, RadioTower } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { api } from "@backend/_generated/api";
import type { Id } from "@backend/_generated/dataModel";
import { ROUTES } from "@/lib/routes";

export function Overview() {
  const user = useQuery(api.users.current);
  const branches = useQuery(api.branches.listMine);
  const [windowRange] = useState(() => ({ from: Date.now() - 7 * 86_400_000, to: Date.now() + 30 * 86_400_000 }));
  const branchId = branches?.[0]?.id;
  const jobs = useQuery(api.jobs.listForBranch, branchId ? { branchId: branchId as Id<"branches">, ...windowRange, limit: 100 } : "skip");
  const reports = useQuery(api.reports.listForBranch, branchId ? { branchId: branchId as Id<"branches">, limit: 100 } : "skip");
  const awaitingReview = jobs?.filter((job) => job.status === "under_review").length ?? 0;

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Fumivanta Desk</p>
          <h1>Good work starts with a clear handoff.</h1>
          <p>{user ? `${user.name} · ${user.role.replaceAll("_", " ")}` : "Loading your operating context..."}</p>
        </div>
        <Link className="button button-primary" href={ROUTES.newJob}>
          <ClipboardClock aria-hidden="true" size={17} /> Create job
        </Link>
      </header>

      <section className="metric-grid" aria-label="Operations summary">
        <article className="metric-card lime"><span>Active branches</span><strong>{branches?.length ?? "—"}</strong><Building2 /></article>
        <article className="metric-card"><span>Scheduled work</span><strong>{jobs?.length ?? "—"}</strong><RadioTower /></article>
        <article className="metric-card"><span>Awaiting review</span><strong>{awaitingReview}</strong><AlertTriangle /></article>
        <article className="metric-card"><span>Reports issued</span><strong>{reports?.length ?? "—"}</strong><CheckCircle2 /></article>
      </section>

      <section className="ledger-panel">
        <div><p className="eyebrow">Start here</p><h2>{branches?.length ? "Your operating line is ready." : "Create the first branch."}</h2></div>
        <p>{branches?.length ? "Add customers and sites, load chemical stock, then schedule the first treatment." : "The first signed-in user is the company admin. Create a branch before adding operational records."}</p>
        <Link className="text-link" href={ROUTES.branches}>Open branches <ArrowUpRight size={16} /></Link>
      </section>
    </div>
  );
}

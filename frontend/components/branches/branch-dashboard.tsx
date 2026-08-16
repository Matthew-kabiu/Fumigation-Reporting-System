"use client";

import { useMutation, useQuery } from "convex/react";
import { Building2, Save, ShieldCheck, UserCog, UsersRound } from "lucide-react";
import { useState, type FormEvent } from "react";
import { api } from "@backend/_generated/api";
import type { Id } from "@backend/_generated/dataModel";
import { BranchSelector } from "@/components/jobs/branch-selector";
import { WorkflowState } from "@/components/jobs/workflow-state";
import { Select } from "@/components/ui/select";
import styles from "@/components/jobs/workflows.module.css";

type MembershipRole = "manager" | "operations" | "technician" | "auditor";
type AccountRole = "company_admin" | MembershipRole | "customer";

export function BranchDashboard() {
  const [branchId, setBranchId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const branches = useQuery(api.branches.listMine);
  const settings = useQuery(api.settings.get);
  const accounts = useQuery(api.users.listAccounts);
  const members = useQuery(api.users.listForBranch, branchId ? { branchId: branchId as Id<"branches"> } : "skip");
  const createBranch = useMutation(api.branches.create);
  const updateSettings = useMutation(api.settings.update);
  const activateAccount = useMutation(api.users.activate);
  const setMembership = useMutation(api.users.setBranchMembership);

  async function run(action: () => Promise<unknown>, success: string) { setSaving(true); setError(""); setMessage(""); try { await action(); setMessage(success); } catch { setError("We could not save that branch setting. Confirm your administrator access and try again."); } finally { setSaving(false); } }
  // Reads the form and resets it synchronously, before any await. Doing the
  // reset inside the async callback mixed a DOM side effect into a state update
  // and touched a form element that may already be unmounted.
  async function submitBranch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("name"));
    const code = String(data.get("code"));
    form.reset();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      setBranchId(await createBranch({ name, code }));
      setMessage("Branch created and added to your access scope.");
    } catch {
      setError("We could not create that branch. Confirm your administrator access and try again.");
    } finally {
      setSaving(false);
    }
  }
  function submitPolicy(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const policy = String(new FormData(event.currentTarget).get("approvalPolicy")) as "manager_required" | "manager_and_customer" | "technician_direct"; void run(() => updateSettings({ approvalPolicy: policy }), "Approval policy updated for newly scheduled jobs."); }
  function changeRole(userId: Id<"users">, role: string) { void run(() => setMembership({ branchId: branchId as Id<"branches">, userId, role: role === "remove" ? null : role as MembershipRole }), role === "remove" ? "Member removed from this branch." : "Member branch role updated."); }
  function activate(event: FormEvent<HTMLFormElement>, userId: Id<"users">) { event.preventDefault(); const role = String(new FormData(event.currentTarget).get("role")) as AccountRole; void run(() => activateAccount({ userId, role }), "Account activated. Assign branch access where required."); }

  const activeBranches = branches?.length ?? 0;
  const pendingAccounts = accounts?.filter((account) => account.status !== "active").length ?? 0;
  const activeMembers = members?.length ?? 0;

  return <main className={styles.stack}>
    <header className={styles.header}><div><p className={styles.eyebrow}>Branches</p><h1>Your operating boundaries, in one place.</h1><p>Create branches, set the approval rule once, then control what each active team member can do in every location.</p></div></header>
    {(message || error) && <p className={`${styles.message} ${error ? styles.error : ""}`} role={error ? "alert" : "status"}>{error || message}</p>}
    <section className="metric-grid" aria-label="Branch summary">
      <article className="metric-card lime"><span>Active branches</span><strong>{activeBranches}</strong><Building2 aria-hidden="true" size={22} /></article>
      <article className="metric-card"><span>Accounts awaiting approval</span><strong>{pendingAccounts}</strong><UserCog aria-hidden="true" size={22} /></article>
      <article className="metric-card"><span>Members in selected branch</span><strong>{activeMembers}</strong><UsersRound aria-hidden="true" size={22} /></article>
      <article className="metric-card"><span>Approval policy</span><strong className="metric-short">{settings ? (settings.approvalPolicy === "manager_required" ? "Manager" : settings.approvalPolicy === "manager_and_customer" ? "Manager + customer" : "Technician direct") : "—"}</strong><ShieldCheck aria-hidden="true" size={22} /></article>
    </section>
    <div className={styles.equalGrid}>
      <form className={`${styles.panel} ${styles.form}`} onSubmit={(event) => void submitBranch(event)}><div className={styles.panelHeader}><div><h2>Create branch</h2><p>A unique code identifies the operating location.</p></div><Building2 aria-hidden="true" size={22} /></div><label className={styles.field}><span>Branch name</span><input name="name" required minLength={2} maxLength={80} /></label><label className={styles.field}><span>Branch code</span><input name="code" required minLength={2} maxLength={12} /></label><button className="button button-primary" disabled={saving} type="submit"><Building2 aria-hidden="true" size={16} /> {saving ? "Saving..." : "Create branch"}</button><div className={styles.list}>{branches?.map((branch) => <div className={styles.row} key={branch.id}><strong>{branch.name}</strong><span className={styles.tag}>{branch.code}</span></div>)}</div></form>
      <form className={`${styles.panel} ${styles.form}`} onSubmit={submitPolicy}><div className={styles.panelHeader}><div><h2>Approval policy</h2><p>Applied automatically when each new job is scheduled.</p></div><ShieldCheck aria-hidden="true" size={22} /></div>{settings === undefined ? <WorkflowState kind="loading" title="Loading policy" detail="Reading the company approval setting." /> : <label className={styles.field}><span>Field submission approval</span><Select name="approvalPolicy" defaultValue={settings.approvalPolicy}><option value="manager_required">Manager approval required</option><option value="manager_and_customer">Manager and customer acceptance</option><option value="technician_direct">Technician direct issue</option></Select></label>}<button className="button button-primary" disabled={saving || !settings} type="submit"><Save aria-hidden="true" size={16} /> Save policy</button></form>
    </div>
    <section className={styles.panel} aria-labelledby="member-role-title"><div className={styles.panelHeader}><div><h2 id="member-role-title">Accounts and branch access</h2><p>Approve new accounts, then assign staff to the selected branch. Customer accounts are linked from the Customers screen.</p></div><UserCog aria-hidden="true" size={22} /></div><BranchSelector branches={branches} value={branchId} onChange={setBranchId} />{accounts === undefined ? <WorkflowState kind="loading" title="Loading accounts" detail="Reading company access requests." /> : <div className={styles.list}>{accounts.map((account) => { const membership = members?.find((entry) => entry.id === account.id); return account.status !== "active" ? <form className={styles.row} key={account.id} onSubmit={(event) => activate(event, account.id)}><div><h3>{account.name}</h3><p>{account.email || "No email available"} · {account.status}</p></div><label className={styles.field}><span className={styles.visuallyHidden}>Account role for {account.name}</span><Select name="role" defaultValue="technician" aria-label={`Account role for ${account.name}`}><option value="manager">Manager</option><option value="operations">Operations</option><option value="technician">Technician</option><option value="customer">Customer</option><option value="auditor">Auditor</option><option value="company_admin">Company admin</option></Select></label><button className="button button-secondary" disabled={saving} type="submit">Activate</button></form> : <div className={styles.row} key={account.id}><div><h3>{account.name}</h3><p>{account.email || "No email available"} · {account.role.replaceAll("_", " ")}</p></div>{account.role === "customer" ? <span className={styles.tag}>Link under Customers</span> : account.role === "company_admin" ? <span className={styles.tag}>All branches</span> : <label className={styles.field}><span className={styles.visuallyHidden}>Branch role for {account.name}</span><Select value={membership?.membershipRole ?? "remove"} disabled={!branchId || members === undefined || saving} onChange={(event) => changeRole(account.id, event.target.value)} aria-label={`Branch role for ${account.name}`}><option value="remove">No branch access</option><option value="manager">Manager</option><option value="operations">Operations</option><option value="technician">Technician</option><option value="auditor">Auditor</option></Select></label>}</div>; })}</div>}</section>
  </main>;
}

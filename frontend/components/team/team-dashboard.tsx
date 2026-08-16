"use client";

import { useMutation, useQuery } from "convex/react";
import { Copy, Link2, ShieldCheck, UserCog, UserRoundPlus, UsersRound, UserX } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { api } from "@backend/_generated/api";
import type { Id } from "@backend/_generated/dataModel";
import { WorkflowState } from "@/components/jobs/workflow-state";
import { Select } from "@/components/ui/select";
import styles from "@/components/jobs/workflows.module.css";
import type { Invitation } from "@/lib/services/invitations";
import { formatDate } from "@/lib/utils/format-date";

type AccountRole = "company_admin" | "manager" | "operations" | "technician" | "customer" | "auditor";

const roleOptions: { value: AccountRole; label: string }[] = [
  { value: "company_admin", label: "Company admin" },
  { value: "manager", label: "Manager" },
  { value: "operations", label: "Operations" },
  { value: "technician", label: "Technician" },
  { value: "customer", label: "Customer" },
  { value: "auditor", label: "Auditor" },
];

export function TeamDashboard({ invitations }: { invitations: Invitation[] }) {
  const router = useRouter();
  const invitePending = useRef(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  const [copied, setCopied] = useState(false);

  const current = useQuery(api.users.current);
  const accounts = useQuery(api.users.listAccounts);
  const updateRole = useMutation(api.users.updateRole);
  const setStatus = useMutation(api.users.setStatus);
  const activateAccount = useMutation(api.users.activate);

  async function run(action: () => Promise<unknown>, success: string) {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await action();
      setMessage(success);
    } catch {
      setError("We could not save that team change. Confirm your administrator access and try again.");
    } finally {
      setSaving(false);
    }
  }

  async function submitInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const email = String(new FormData(form).get("email")).trim().toLowerCase();
    // Ref, not state: setInviting is async, so a fast double submit could
    // pass a stale `inviting` check and create two invitations.
    if (!email || invitePending.current) return;
    invitePending.current = true;
    setInviting(true);
    setError("");
    setMessage("");
    setInviteLink("");
    try {
      const response = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(String(data?.error ?? "That invitation could not be created."));
        return;
      }
      setInviteLink(String(data?.url ?? ""));
      form.reset();
      setMessage(`Invitation created for ${data.email}.`);
      router.refresh();
    } catch {
      setError("We could not create that invitation right now.");
    } finally {
      invitePending.current = false;
      setInviting(false);
    }
  }

  async function revoke(id: string) {
    await run(async () => {
      const response = await fetch("/api/invitations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!response.ok) throw new Error("revoke failed");
      router.refresh();
    }, "Invitation revoked.");
  }

  function changeRole(userId: Id<"users">, role: string) {
    void run(() => updateRole({ userId, role: role as AccountRole }), "Account role updated.");
  }

  function activate(event: FormEvent<HTMLFormElement>, userId: Id<"users">) {
    event.preventDefault();
    const role = String(new FormData(event.currentTarget).get("role")) as AccountRole;
    void run(() => activateAccount({ userId, role }), "Account activated. Assign branch access where required.");
  }

  function toggleStatus(userId: Id<"users">, status: "active" | "disabled") {
    void run(() => setStatus({ userId, status }), status === "disabled" ? "Account disabled." : "Account reactivated.");
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy the link to your clipboard.");
    }
  }

  const totalAccounts = accounts?.length ?? 0;
  const activeAccounts = accounts?.filter((account) => account.status === "active").length ?? 0;
  const pendingAccounts = accounts?.filter((account) => account.status === "pending").length ?? 0;
  const disabledAccounts = accounts?.filter((account) => account.status === "disabled").length ?? 0;

  return <main className={styles.stack}>
    <header className={styles.header}><div><p className={styles.eyebrow}>Team</p><h1>Your people, roles, and access.</h1><p>Invite teammates by link, approve new signups, assign roles, and control who can reach the workspace.</p></div></header>
    {(message || error) && <p className={`${styles.message} ${error ? styles.error : ""}`} role={error ? "alert" : "status"}>{error || message}</p>}
    <section className="metric-grid" aria-label="Team summary">
      <article className="metric-card lime"><span>Total members</span><strong>{totalAccounts}</strong><UsersRound aria-hidden="true" size={22} /></article>
      <article className="metric-card"><span>Active accounts</span><strong>{activeAccounts}</strong><ShieldCheck aria-hidden="true" size={22} /></article>
      <article className="metric-card"><span>Pending approval</span><strong>{pendingAccounts}</strong><UserRoundPlus aria-hidden="true" size={22} /></article>
      <article className="metric-card"><span>Disabled</span><strong className="metric-short">{disabledAccounts}</strong><UserX aria-hidden="true" size={22} /></article>
    </section>
    <div className={styles.equalGrid}>
      <form className={`${styles.panel} ${styles.form}`} onSubmit={submitInvite}><div className={styles.panelHeader}><div><h2>Invite by link</h2><p>We generate a sign-up link you can share with the person directly.</p></div><UserRoundPlus aria-hidden="true" size={22} /></div><label className={styles.field}><span>Email address</span><input name="email" type="email" required maxLength={254} placeholder="teammate@example.com" /></label><button className="button button-primary" disabled={inviting || saving} type="submit"><UserRoundPlus aria-hidden="true" size={16} /> {inviting ? "Creating..." : "Create invite link"}</button>{inviteLink ? <div className={styles.list}><div className={styles.row}><strong className="metric-short">Invite link</strong><button className="button button-secondary" type="button" onClick={() => void copyLink()} disabled={copied}><Copy aria-hidden="true" size={16} /> {copied ? "Copied" : "Copy"}</button></div></div> : null}</form>
      <section className={styles.panel} aria-labelledby="invite-list-title"><div className={styles.panelHeader}><div><h2 id="invite-list-title">Open invitations</h2><p>Pending links waiting to be accepted. Revoke to invalidate them.</p></div><Link2 aria-hidden="true" size={22} /></div>{invitations.length === 0 ? <p className={`${styles.message} ${styles.error}`} role="status">No open invitations right now.</p> : <div className={styles.list}>{invitations.map((invitation) => <div className={styles.row} key={invitation.id}><div><h3>{invitation.email}</h3><p>Created {formatDate(invitation.createdAt)} · awaiting acceptance</p></div><button className="button button-secondary" disabled={saving} type="button" onClick={() => void revoke(invitation.id)}>Revoke</button></div>)}</div>}</section>
    </div>
    <section className={styles.panel} aria-labelledby="member-list-title"><div className={styles.panelHeader}><div><h2 id="member-list-title">Team members</h2><p>New signups start as pending technicians. Approve them, set their role, then disable access when someone leaves.</p></div><UserCog aria-hidden="true" size={22} /></div>{accounts === undefined ? <WorkflowState kind="loading" title="Loading members" detail="Reading company access accounts." /> : <div className={styles.list}>{accounts.map((account) => account.status !== "active" ? <form className={styles.row} key={account.id} onSubmit={(event) => activate(event, account.id)}><div><h3>{account.name}</h3><p>{account.email || "No email available"} · {account.status}</p></div><label className={styles.field}><span className={styles.visuallyHidden}>Account role for {account.name}</span><Select name="role" defaultValue="technician" aria-label={`Account role for ${account.name}`}><option value="manager">Manager</option><option value="operations">Operations</option><option value="technician">Technician</option><option value="customer">Customer</option><option value="auditor">Auditor</option><option value="company_admin">Company admin</option></Select></label><button className="button button-secondary" disabled={saving} type="submit">Approve</button></form> : <div className={styles.row} key={account.id}><div><h3>{account.name}</h3><p>{account.email || "No email available"} · {account.role.replaceAll("_", " ")}</p></div><label className={styles.field}><span className={styles.visuallyHidden}>Role for {account.name}</span><Select value={account.role} disabled={saving || account.id === current?.id} aria-label={`Role for ${account.name}`} onChange={(event) => changeRole(account.id, event.target.value)}>{roleOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</Select></label>{account.id === current?.id ? <span className={styles.tag}>You</span> : <button className="button button-secondary" disabled={saving} type="button" onClick={() => toggleStatus(account.id, "disabled")}>Disable</button>}</div>)}</div>}</section>
  </main>;
}

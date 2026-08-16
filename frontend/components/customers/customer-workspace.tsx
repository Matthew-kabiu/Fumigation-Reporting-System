"use client";

import { useMutation, useQuery } from "convex/react";
import { Building, MapPin, Plus, UserRoundPlus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { api } from "@backend/_generated/api";
import type { Id } from "@backend/_generated/dataModel";
import { BranchSelector } from "@/components/jobs/branch-selector";
import { WorkflowState } from "@/components/jobs/workflow-state";
import styles from "@/components/jobs/workflows.module.css";
import { useBranchSelection } from "@/hooks/use-branch-selection";

export function CustomerWorkspace() {
  const { branches, branchId, setBranchId } = useBranchSelection();
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const branch = branchId as Id<"branches">;
  const customer = selectedCustomerId as Id<"customers">;
  const customers = useQuery(api.customers.listForBranch, branchId ? { branchId: branch, limit: 100 } : "skip");
  const sites = useQuery(api.sites.listForCustomer, selectedCustomerId ? { customerId: customer } : "skip");
  const customerAccounts = useQuery(api.users.listCustomerAccounts, selectedCustomerId && branchId ? { branchId: branch } : "skip");
  const linkedUsers = useQuery(api.customers.listUsers, selectedCustomerId ? { customerId: customer } : "skip");
  const createCustomer = useMutation(api.customers.create);
  const createSite = useMutation(api.sites.create);
  const setUserAccess = useMutation(api.customers.setUserAccess);

  async function submitCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const element = event.currentTarget;
    const form = new FormData(element);
    setSaving(true); setError(""); setMessage("");
    try {
      const id = await createCustomer({ branchId: branch, name: String(form.get("name")), contactName: optional(form, "contactName"), contactEmail: optional(form, "contactEmail"), contactPhone: optional(form, "contactPhone"), notes: optional(form, "notes") });
      element.reset();
      setSelectedCustomerId(id);
      setMessage("Customer created. Add their first service site next.");
    } catch { setError("We could not create this customer. Check the details and try again."); }
    finally { setSaving(false); }
  }

  async function submitSite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const element = event.currentTarget;
    const form = new FormData(element);
    setSaving(true); setError(""); setMessage("");
    try {
      await createSite({ customerId: customer, name: String(form.get("name")), address: String(form.get("address")), contactName: optional(form, "contactName"), contactPhone: optional(form, "contactPhone"), accessNotes: optional(form, "accessNotes"), riskNotes: optional(form, "riskNotes") });
      element.reset();
      setMessage("Service site added to the customer record.");
    } catch { setError("We could not add this site. Check the address and try again."); }
    finally { setSaving(false); }
  }

  async function changeCustomerAccess(userId: Id<"users">, linked: boolean) {
    setSaving(true); setError(""); setMessage("");
    try { await setUserAccess({ customerId: customer, userId, linked }); setMessage(linked ? "Customer portal access granted." : "Customer portal access removed."); }
    catch { setError("We could not update portal access. Confirm the account is active and try again."); }
    finally { setSaving(false); }
  }

  return (
    <main className={styles.stack}>
      <header className={styles.header}><div><p className={styles.eyebrow}>Customer registry</p><h1>Customers and service sites.</h1><p>Keep contacts, access instructions, and site risks together before work reaches the schedule.</p></div></header>
      <div className={styles.toolbar}><BranchSelector branches={branches} value={branchId} onChange={(id) => { setBranchId(id); setSelectedCustomerId(""); }} /></div>
      {(message || error) && <p className={`${styles.message} ${error ? styles.error : ""}`} role={error ? "alert" : "status"}>{error || message}</p>}
      <div className={styles.grid}>
        <form className={`${styles.panel} ${styles.form}`} onSubmit={submitCustomer}>
          <div className={styles.panelHeader}><div><h2>Create customer</h2><p>Primary account and contact details.</p></div><UserRoundPlus aria-hidden="true" size={22} /></div>
          <Field label="Customer name" name="name" required minLength={2} />
          <Field label="Contact name" name="contactName" />
          <Field label="Email" name="contactEmail" type="email" />
          <Field label="Phone" name="contactPhone" type="tel" />
          <label className={styles.field}><span>Notes</span><textarea name="notes" /></label>
          <button className="button button-primary" disabled={!branchId || saving} type="submit"><Plus aria-hidden="true" size={17} /> {saving ? "Saving..." : "Create customer"}</button>
        </form>
        <section className={styles.panel} aria-labelledby="customer-list-title">
          <div className={styles.panelHeader}><div><h2 id="customer-list-title">Active customers</h2><p>Select a customer to manage service sites.</p></div><Building aria-hidden="true" size={22} /></div>
          {!branchId ? <WorkflowState kind="empty" title="No branch selected" detail="Choose a branch to load its customer registry." /> : customers === undefined ? <WorkflowState kind="loading" title="Loading customers" detail="Reading this branch's customer registry." /> : customers.length === 0 ? <WorkflowState kind="empty" title="No customers yet" detail="Create the first customer using the form." /> : <div className={styles.list}>{customers.map((entry) => <button type="button" className={styles.row} key={entry.id} onClick={() => setSelectedCustomerId(entry.id)} aria-pressed={selectedCustomerId === entry.id}><div><h3>{entry.name}</h3><p>{entry.contactName || "No primary contact recorded"}</p></div><span className={`${styles.tag} ${selectedCustomerId === entry.id ? styles.tagLive : ""}`}>{selectedCustomerId === entry.id ? "Selected" : entry.status}</span></button>)}</div>}
        </section>
      </div>
      {selectedCustomerId && <div className={styles.equalGrid}>
        <form className={`${styles.panel} ${styles.form}`} onSubmit={submitSite}>
          <div className={styles.panelHeader}><div><h2>Add service site</h2><p>Location-specific access and risk details.</p></div><MapPin aria-hidden="true" size={22} /></div>
          <div className={styles.formGrid}><Field label="Site name" name="name" required minLength={2} /><Field label="Address" name="address" required minLength={5} /><Field label="Site contact" name="contactName" /><Field label="Contact phone" name="contactPhone" type="tel" /><label className={`${styles.field} ${styles.full}`}><span>Access notes</span><textarea name="accessNotes" /></label><label className={`${styles.field} ${styles.full}`}><span>Risk notes</span><textarea name="riskNotes" /></label></div>
          <button className="button button-primary" disabled={saving} type="submit"><Plus aria-hidden="true" size={17} /> {saving ? "Saving..." : "Add site"}</button>
        </form>
        <section className={styles.panel}><div className={styles.panelHeader}><div><h2>Service sites</h2><p>Active locations for this customer.</p></div><MapPin aria-hidden="true" size={22} /></div>{sites === undefined ? <WorkflowState kind="loading" title="Loading sites" detail="Reading service locations." /> : sites.length === 0 ? <WorkflowState kind="empty" title="No sites yet" detail="Add a service location to schedule work." /> : <div className={styles.list}>{sites.map((site) => <div className={styles.row} key={site.id}><div><h3>{site.name}</h3><p>{site.address}</p></div><span className={styles.tag}>Active</span></div>)}</div>}</section>
        <section className={styles.panel}><div className={styles.panelHeader}><div><h2>Portal access</h2><p>Link active customer accounts to this customer record.</p></div><UserRoundPlus aria-hidden="true" size={22} /></div>{customerAccounts === undefined || linkedUsers === undefined ? <WorkflowState kind="loading" title="Loading portal access" detail="Reading active customer accounts." /> : customerAccounts.length === 0 ? <WorkflowState kind="empty" title="No customer accounts" detail="Activate a customer account in Company settings first." /> : <div className={styles.list}>{customerAccounts.map((account) => { const linked = linkedUsers.some((entry) => entry.id === account.id); return <div className={styles.row} key={account.id}><div><h3>{account.name}</h3><p>{account.email || "No email available"}</p></div><button className={`button ${linked ? "button-secondary" : "button-primary"}`} disabled={saving} type="button" onClick={() => void changeCustomerAccess(account.id, !linked)}>{linked ? "Remove access" : "Grant access"}</button></div>; })}</div>}</section>
      </div>}
    </main>
  );
}

function optional(form: FormData, key: string) { const value = String(form.get(key) ?? "").trim(); return value || undefined; }
function Field({ label, name, ...props }: { label: string; name: string } & React.InputHTMLAttributes<HTMLInputElement>) { return <label className={styles.field}><span>{label}</span><input name={name} {...props} /></label>; }

"use client";

import { useMutation, useQuery } from "convex/react";
import { Boxes, FlaskConical, PackagePlus, Scale } from "lucide-react";
import { useState, type FormEvent } from "react";
import { api } from "@backend/_generated/api";
import type { Id } from "@backend/_generated/dataModel";
import { BranchSelector } from "@/components/jobs/branch-selector";
import { WorkflowState } from "@/components/jobs/workflow-state";
import { Select } from "@/components/ui/select";
import styles from "@/components/jobs/workflows.module.css";
import { useBranchSelection } from "@/hooks/use-branch-selection";

export function InventoryWorkspace() {
  const { branches, branchId, setBranchId } = useBranchSelection();
  const [mode, setMode] = useState<"receipt" | "adjustment">("receipt");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const user = useQuery(api.users.current);
  const products = useQuery(api.inventory.listProducts, { activeOnly: true });
  const balances = useQuery(api.inventory.listForBranch, branchId ? { branchId: branchId as Id<"branches"> } : "skip");
  const createProduct = useMutation(api.inventory.createProduct);
  const adjustStock = useMutation(api.inventory.adjustStock);
  const receiveStock = useMutation(api.inventory.receiveStock);
  const canManage = user?.role === "company_admin" || user?.role === "manager";

  async function run(action: () => Promise<unknown>, success: string, form: HTMLFormElement) {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      await action();
      form.reset();
      setMessage(success);
    } catch {
      setError("We could not update inventory. Check the product, quantity, and current balance.");
    } finally {
      setSaving(false);
    }
  }

  function submitProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    void run(() => createProduct({ name: String(data.get("name")), activeIngredient: String(data.get("activeIngredient")), unit: String(data.get("unit")), safetyNotes: optional(data, "safetyNotes") }), "Product added to the chemical catalog.", form);
  }

  function submitStock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const quantity = Number(data.get("quantity"));
    const branch = branchId as Id<"branches">;
    const productId = String(data.get("productId")) as Id<"chemicalProducts">;
    const note = String(data.get("note"));
    void run(() => mode === "receipt" ? receiveStock({ branchId: branch, productId, quantity: Math.abs(quantity), note }) : adjustStock({ branchId: branch, productId, quantityDelta: quantity, note }), mode === "receipt" ? "Stock receipt posted." : "Stock adjustment posted.", form);
  }

  return (
    <main className={styles.stack}>
      <header className={styles.header}><div><p className={styles.eyebrow}>Chemical ledger</p><h1>Stock that follows the treatment.</h1><p>Maintain the product catalog and post traceable branch receipts or corrections without hiding prior balances.</p></div></header>
      <div className={styles.toolbar}><BranchSelector branches={branches} value={branchId} onChange={setBranchId} /></div>
      {(message || error) && <p className={`${styles.message} ${error ? styles.error : ""}`} role={error ? "alert" : "status"}>{error || message}</p>}
      <section className={styles.panel} aria-labelledby="balance-title">
        <div className={styles.panelHeader}><div><h2 id="balance-title">Branch balances</h2><p>Current available quantity by product.</p></div><Boxes aria-hidden="true" size={22} /></div>
        {!branchId ? <WorkflowState kind="empty" title="No branch selected" detail="Choose a branch to load its stock ledger." /> : balances === undefined ? <WorkflowState kind="loading" title="Loading balances" detail="Reading the branch stock ledger." /> : balances.length === 0 ? <WorkflowState kind="empty" title="No stock on hand" detail="Post a receipt to establish the first balance." /> : <div className={styles.list}>{balances.map((balance) => <div className={styles.row} key={balance.productId}><div><h3>{balance.name}</h3><p>{balance.activeIngredient}</p></div><div className={styles.rowMeta}><strong>{balance.quantity.toLocaleString()} {balance.unit}</strong><span className={`${styles.tag} ${balance.quantity > 0 ? styles.tagLive : styles.tagWarn}`}>{balance.quantity > 0 ? "Available" : "Empty"}</span></div></div>)}</div>}
      </section>
      <div className={styles.equalGrid}>
        <form className={`${styles.panel} ${styles.form}`} onSubmit={submitProduct}>
          <div className={styles.panelHeader}><div><h2>Product catalog</h2><p>{canManage ? "Create and review reusable chemical entries." : "Review reusable chemical entries."}</p></div><FlaskConical aria-hidden="true" size={22} /></div>
          {canManage && <><div className={styles.formGrid}><Field label="Product name" name="name" required /><Field label="Active ingredient" name="activeIngredient" required /><Field label="Unit" name="unit" required placeholder="L, kg, units" /><label className={`${styles.field} ${styles.full}`}><span>Safety notes</span><textarea name="safetyNotes" /></label></div><button className="button button-primary" disabled={saving} type="submit"><PackagePlus aria-hidden="true" size={16} /> {saving ? "Saving..." : "Create product"}</button></>}
          {products === undefined ? <WorkflowState kind="loading" title="Loading catalog" detail="Reading active chemical products." /> : products.length === 0 ? <WorkflowState kind="empty" title="No products" detail={canManage ? "Create the first chemical product above." : "A manager must create the first chemical product."} /> : <div className={styles.list}>{products.map((product) => <div className={styles.row} key={product.id}><div><h3>{product.name}</h3><p>{product.activeIngredient}{product.safetyNotes ? ` · ${product.safetyNotes}` : ""}</p></div><span className={styles.tag}>{product.unit}</span></div>)}</div>}
        </form>
        <form className={`${styles.panel} ${styles.form}`} onSubmit={submitStock}>
          <div className={styles.panelHeader}><div><h2>Post stock movement</h2><p>Receipts add stock. Adjustments may add or subtract.</p></div><Scale aria-hidden="true" size={22} /></div>
          <div className={styles.tabs} role="tablist" aria-label="Stock movement type"><button className={`${styles.tab} ${mode === "receipt" ? styles.tabActive : ""}`} type="button" role="tab" aria-selected={mode === "receipt"} onClick={() => setMode("receipt")}>Receipt</button>{canManage && <button className={`${styles.tab} ${mode === "adjustment" ? styles.tabActive : ""}`} type="button" role="tab" aria-selected={mode === "adjustment"} onClick={() => setMode("adjustment")}>Adjustment</button>}</div>
          <label className={styles.field}><span>Product</span><Select name="productId" required><option value="">Select product</option>{products?.map((product) => <option key={product.id} value={product.id}>{product.name} ({product.unit})</option>)}</Select></label>
          <Field label={mode === "receipt" ? "Quantity received" : "Quantity delta"} name="quantity" type="number" step="any" required />
          <Field label="Ledger note" name="note" required minLength={2} />
          <button className="button button-primary" disabled={saving || !branchId} type="submit"><Scale aria-hidden="true" size={16} /> {saving ? "Posting..." : `Post ${mode}`}</button>
        </form>
      </div>
    </main>
  );
}

function optional(form: FormData, key: string) {
  const value = String(form.get(key) ?? "").trim();
  return value || undefined;
}

function Field({ label, name, ...props }: { label: string; name: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return <label className={styles.field}><span>{label}</span><input name={name} {...props} /></label>;
}

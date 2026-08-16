"use client";

import { Building2 } from "lucide-react";
import { Select } from "@/components/ui/select";
import styles from "./workflows.module.css";

type Branch = { id: string; name: string; code: string };

/**
 * Presentational only. Selection state and the default branch live in
 * `useBranchSelection`, so this component never pushes a value to its parent
 * from an effect.
 */
export function BranchSelector({
  branches,
  value,
  onChange,
}: {
  branches: Branch[] | undefined;
  value: string;
  onChange: (branchId: string) => void;
}) {
  return (
    <div className={styles.selector}>
      <label htmlFor="branch-selector"><Building2 aria-hidden="true" size={15} /> Branch</label>
      <Select id="branch-selector" value={value} onChange={(event) => onChange(event.target.value)} disabled={!branches?.length}>
        {!branches?.length && <option value="">{branches ? "No branches" : "Loading branches..."}</option>}
        {branches?.map((branch) => <option key={branch.id} value={branch.id}>{branch.name} ({branch.code})</option>)}
      </Select>
    </div>
  );
}

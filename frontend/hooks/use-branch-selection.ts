"use client";

import { useQuery } from "convex/react";
import { useState } from "react";
import { api } from "@backend/_generated/api";

/**
 * Owns branch selection for a workspace screen.
 *
 * The default branch is derived during render rather than pushed to a parent
 * from inside an effect, so there is no extra render pass and no window where
 * the screen has branches loaded but no selection.
 */
export function useBranchSelection() {
  const branches = useQuery(api.branches.listMine);
  const [selected, setSelected] = useState("");
  // Fall back to the first branch until the user picks one explicitly.
  const branchId = selected || branches?.[0]?.id || "";
  return { branches, branchId, setBranchId: setSelected };
}

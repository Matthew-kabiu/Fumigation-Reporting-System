import { Building2 } from "lucide-react";
import Link from "next/link";
import { ROUTES } from "@/lib/routes";

/**
 * Shown when the signed-in user can reach the workspace but has no branch in
 * scope. Every workspace query is keyed on a branch id, and a skipped Convex
 * query returns `undefined` — the same value as a loading one — so without this
 * gate the whole app renders spinners that can never resolve.
 */
export function BranchSetupGate({ canCreateBranch }: { canCreateBranch: boolean }) {
  return (
    <div className="branch-gate">
      <Building2 aria-hidden="true" size={30} />
      <h1>{canCreateBranch ? "Create your first branch." : "No branch access yet."}</h1>
      <p>
        {canCreateBranch
          ? "Branches are the operating boundary for customers, jobs, stock, and reports. Nothing can be scheduled until one exists."
          : "Your account is active but has not been added to a branch. Ask a company admin to grant you access, then reload this page."}
      </p>
      {canCreateBranch && (
        <Link className="button button-primary" href={ROUTES.branches}>
          <Building2 aria-hidden="true" size={17} />
          <span>Create a branch</span>
        </Link>
      )}
    </div>
  );
}

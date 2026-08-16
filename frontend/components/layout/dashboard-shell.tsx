"use client";

import { useAuth, useClerk } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { BriefcaseBusiness, Building2, ClipboardList, FileCheck2, FlaskConical, LayoutDashboard, LoaderCircle, LogOut, PanelLeftClose, PanelLeftOpen, RadioTower, UserCog, UsersRound } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { api } from "@backend/_generated/api";
import { ROUTES } from "@/lib/routes";
import { OutboxSyncStatus } from "@/components/field/outbox-sync";
import { BranchSetupGate } from "@/components/layout/branch-setup-gate";
import { APP_TOOLTIP_ID } from "@/components/ui/app-tooltip";
import { purgeOfflineData } from "@/lib/offline/database";

type AppRole = "company_admin" | "manager" | "operations" | "technician" | "customer" | "auditor";

const navigation = [
  { href: ROUTES.dashboard, label: "Overview", icon: LayoutDashboard, roles: ["company_admin", "manager", "operations"] },
  { href: ROUTES.customers, label: "Customers", icon: UsersRound, roles: ["company_admin", "manager", "operations"] },
  { href: ROUTES.jobs, label: "Jobs", icon: BriefcaseBusiness, roles: ["company_admin", "manager", "operations", "auditor"] },
  { href: ROUTES.field, label: "Field", icon: RadioTower, roles: ["technician"] },
  { href: ROUTES.inventory, label: "Inventory", icon: FlaskConical, roles: ["company_admin", "manager", "operations"] },
  { href: ROUTES.reports, label: "Reports", icon: FileCheck2, roles: ["company_admin", "manager", "operations", "auditor"] },
  { href: ROUTES.branches, label: "Branches", icon: Building2, roles: ["company_admin"] },
  { href: ROUTES.team, label: "Team", icon: UserCog, roles: ["company_admin"] },
  { href: ROUTES.portalReports, label: "Reports", icon: FileCheck2, roles: ["customer"] },
];

const roleHome: Record<AppRole, string> = {
  company_admin: ROUTES.dashboard,
  manager: ROUTES.dashboard,
  operations: ROUTES.dashboard,
  technician: ROUTES.field,
  customer: ROUTES.portalReports,
  auditor: ROUTES.reports,
};

export function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { userId } = useAuth();
  const { signOut } = useClerk();
  // Collapsed by default per the dashboard layout standard (§5.2).
  const [expanded, setExpanded] = useState(false);
  const currentUser = useQuery(api.users.current);
  const branches = useQuery(api.branches.listMine);
  const role = currentUser?.role as AppRole | undefined;
  const visibleNavigation = role ? navigation.filter((item) => item.roles.includes(role)) : [];
  const routeAllowed = visibleNavigation.some((item) => pathname.startsWith(item.href))
    && !(role === "auditor" && pathname === ROUTES.newJob);

  useEffect(() => {
    if (role && !routeAllowed) router.replace(roleHome[role]);
  }, [role, routeAllowed, router]);

  async function signOutSafely() {
    try {
      if (userId) {
        await purgeOfflineData(userId);
        if ("serviceWorker" in navigator) {
          const registration = await navigator.serviceWorker.getRegistration();
          (navigator.serviceWorker.controller ?? registration?.active)?.postMessage({ type: "PURGE_ACCOUNT", userId });
        }
      }
    } finally {
      await signOut({ redirectUrl: "/" });
    }
  }

  if (!role || !routeAllowed) return <div className="center-state"><LoaderCircle className="spin" /> Loading your workspace...</div>;

  // Customer portal reads are keyed on the customer record, not a branch, so
  // customers are never gated. A company admin still reaches Settings, since
  // that screen holds the only branch-creation form.
  const needsBranchSetup = role !== "customer" && branches?.length === 0;
  const showBranchGate = needsBranchSetup && !(role === "company_admin" && pathname.startsWith(ROUTES.branches));

  return (
    <div className="app-shell" data-expanded={expanded ? "true" : "false"}>
      <aside className="sidebar">
        <div className="sidebar-head">
          <Link className="wordmark sidebar-wordmark" href={roleHome[role]} aria-label="Fumivanta workspace">
            <span className="wordmark-mark">F</span>
            <span>Fumivanta</span>
          </Link>
          <button
            className="sidebar-toggle"
            type="button"
            onClick={() => setExpanded((open) => !open)}
            aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
            aria-expanded={expanded}
            data-tooltip-id={APP_TOOLTIP_ID}
            data-tooltip-content={expanded ? "Collapse sidebar" : "Expand sidebar"}
          >
            {expanded ? <PanelLeftClose aria-hidden="true" size={18} /> : <PanelLeftOpen aria-hidden="true" size={18} />}
          </button>
        </div>
        <nav className="sidebar-nav" aria-label="Workspace navigation">
          {visibleNavigation.map(({ href, label, icon: Icon }) => (
            <Link
              className={pathname.startsWith(href) ? "sidebar-link active" : "sidebar-link"}
              href={href}
              key={href}
              aria-label={label}
              data-tooltip-id={APP_TOOLTIP_ID}
              data-tooltip-content={expanded ? undefined : label}
            >
              <Icon aria-hidden="true" size={18} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-foot">
          {role === "technician" && <><ClipboardList aria-hidden="true" size={18} /><OutboxSyncStatus /></>}
          <button
            className="nav-action sidebar-signout"
            type="button"
            onClick={() => void signOutSafely()}
            aria-label="Sign out and clear offline data"
            data-tooltip-id={APP_TOOLTIP_ID}
            data-tooltip-content={expanded ? undefined : "Sign out"}
          >
            <LogOut aria-hidden="true" size={16} /><span>Sign out</span>
          </button>
        </div>
      </aside>
      <main className="app-main">
        {showBranchGate ? <BranchSetupGate canCreateBranch={role === "company_admin"} /> : children}
      </main>
    </div>
  );
}

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AuthBootstrap } from "@/components/auth/auth-bootstrap";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export default async function WorkspaceLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session.userId) redirect("/sign-in");
  return (
    <AuthBootstrap>
      <DashboardShell>{children}</DashboardShell>
    </AuthBootstrap>
  );
}

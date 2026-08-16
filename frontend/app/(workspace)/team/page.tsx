import { TeamDashboard } from "@/components/team/team-dashboard";
import { listPendingInvitations } from "@/lib/services/invitations";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const invitations = await listPendingInvitations();
  return <TeamDashboard invitations={invitations} />;
}

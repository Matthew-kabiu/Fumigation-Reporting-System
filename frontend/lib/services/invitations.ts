import { auth, clerkClient } from "@clerk/nextjs/server";
import { fetchQuery } from "convex/nextjs";
import { api } from "@backend/_generated/api";

export type Invitation = { id: string; email: string; status: string; createdAt: number; url: string | null };

export function invitationPayload(invitation: {
  id: string;
  emailAddress: string;
  status: string;
  createdAt: number;
  url?: string;
}): Invitation {
  return {
    id: invitation.id,
    email: invitation.emailAddress,
    status: invitation.status,
    createdAt: invitation.createdAt,
    url: invitation.url ?? null,
  };
}

export async function requireCompanyAdmin() {
  const session = await auth();
  const token = await session.getToken();
  if (!token) return null;
  try {
    const current = await fetchQuery(api.users.current, {}, { token });
    return current.role === "company_admin" ? current : null;
  } catch {
    return null;
  }
}

/**
 * Reads pending invitations on the server so the team page can pass them down
 * as props. Fetching this in a client effect instead meant a setState-in-effect
 * on every mount, with no abort path and an unavoidable empty first paint.
 */
export async function listPendingInvitations(): Promise<Invitation[]> {
  const admin = await requireCompanyAdmin();
  if (!admin) return [];
  const clerk = await clerkClient();
  const list = await clerk.invitations.getInvitationList({ status: "pending" });
  return list.data.map(invitationPayload);
}

import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { invitationPayload, listPendingInvitations, requireCompanyAdmin } from "@/lib/services/invitations";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const admin = await requireCompanyAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  let email = "";
  try {
    const body = await request.json();
    email = String(body?.email ?? "").trim().toLowerCase();
  } catch {
    return NextResponse.json({ error: "A valid email address is required" }, { status: 400 });
  }
  if (!email) {
    return NextResponse.json({ error: "A valid email address is required" }, { status: 400 });
  }

  const redirectUrl = process.env.NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL ?? "/dashboard";

  try {
    const clerk = await clerkClient();
    const invitation = await clerk.invitations.createInvitation({
      emailAddress: email,
      notify: false,
      redirectUrl,
    });
    return NextResponse.json(invitationPayload(invitation), { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "That address could not be invited. Confirm it is not already an account or active invitation." },
      { status: 409 },
    );
  }
}

export async function GET() {
  const admin = await requireCompanyAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  return NextResponse.json(await listPendingInvitations());
}

export async function DELETE(request: Request) {
  const admin = await requireCompanyAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  let id = "";
  try {
    const body = await request.json();
    id = String(body?.id ?? "");
  } catch {
    return NextResponse.json({ error: "An invitation id is required" }, { status: 400 });
  }
  if (!id) {
    return NextResponse.json({ error: "An invitation id is required" }, { status: 400 });
  }

  try {
    const clerk = await clerkClient();
    await clerk.invitations.revokeInvitation(id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "That invitation could not be revoked." }, { status: 409 });
  }
}

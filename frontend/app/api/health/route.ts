import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    { status: "healthy", service: "fumivanta-frontend" },
    { headers: { "Cache-Control": "no-store" } },
  );
}

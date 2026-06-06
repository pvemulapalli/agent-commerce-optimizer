import { validateAdminRequest } from "@/lib/admin-auth";
import { listEmailSubscribers } from "@/lib/email-subscribers";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const authError = validateAdminRequest(
    request,
    new URL(request.url).searchParams.get("token"),
  );
  if (authError) {
    return authError;
  }

  const emails = await listEmailSubscribers();

  return NextResponse.json({
    status: "ok",
    count: emails.length,
    emails,
  });
}

import { validateAdminRequest } from "@/lib/admin-auth";
import { listPlatformFeedback } from "@/lib/platform-feedback";
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

  const limitRaw = new URL(request.url).searchParams.get("limit");
  const limit = limitRaw ? Number.parseInt(limitRaw, 10) : 100;
  const feedback = await listPlatformFeedback(Number.isNaN(limit) ? 100 : limit);

  return NextResponse.json({
    status: "ok",
    count: feedback.length,
    feedback,
  });
}

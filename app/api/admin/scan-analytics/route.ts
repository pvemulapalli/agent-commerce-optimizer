import { validateAdminRequest } from "@/lib/admin-auth";
import { buildScanAnalyticsReport } from "@/lib/scan-analytics";
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

  try {
    const report = await buildScanAnalyticsReport();
    return NextResponse.json(report);
  } catch (error) {
    console.error("[admin/scan-analytics] build failed:", error);
    return NextResponse.json(
      { error: "Failed to build scan analytics report." },
      { status: 500 },
    );
  }
}

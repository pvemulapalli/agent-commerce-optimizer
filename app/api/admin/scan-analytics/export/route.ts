import { validateAdminRequest } from "@/lib/admin-auth";
import {
  buildScanAnalyticsReport,
  scanAnalyticsReportToCsv,
} from "@/lib/scan-analytics";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const authError = validateAdminRequest(request, url.searchParams.get("token"));

  if (authError) {
    return authError;
  }

  const format = url.searchParams.get("format")?.trim().toLowerCase() ?? "json";

  try {
    const report = await buildScanAnalyticsReport();
    const stamp = report.generatedAt.slice(0, 10);

    if (format === "csv") {
      return new NextResponse(scanAnalyticsReportToCsv(report), {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="merchant-signals-scan-analytics-${stamp}.csv"`,
          "Cache-Control": "no-store",
        },
      });
    }

    if (format === "json") {
      return new NextResponse(JSON.stringify(report, null, 2), {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="merchant-signals-scan-analytics-${stamp}.json"`,
          "Cache-Control": "no-store",
        },
      });
    }

    return NextResponse.json(
      { error: "Invalid format. Use csv or json." },
      { status: 400 },
    );
  } catch (error) {
    console.error("[admin/scan-analytics/export] build failed:", error);
    return NextResponse.json(
      { error: "Failed to export scan analytics report." },
      { status: 500 },
    );
  }
}

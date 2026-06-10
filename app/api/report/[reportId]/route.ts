import { enforceReportRateLimit } from "@/lib/report-rate-limit";
import { getShareableReport, isValidReportId } from "@/lib/shareable-reports";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ reportId: string }> },
) {
  const rateLimitResponse = await enforceReportRateLimit(request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const { reportId } = await context.params;

  if (!isValidReportId(reportId)) {
    return NextResponse.json({ error: "Report not found." }, { status: 404 });
  }

  const record = await getShareableReport(reportId);

  if (!record) {
    return NextResponse.json({ error: "Report not found." }, { status: 404 });
  }

  return NextResponse.json(record);
}

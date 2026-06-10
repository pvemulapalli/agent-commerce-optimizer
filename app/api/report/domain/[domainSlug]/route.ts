import { decodeDomainReportSlug } from "@/lib/report-permalink";
import { enforceReportRateLimit } from "@/lib/report-rate-limit";
import { getShareableReportForDomainAccess } from "@/lib/shareable-reports";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ domainSlug: string }> },
) {
  const rateLimitResponse = await enforceReportRateLimit(request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const { domainSlug } = await context.params;
  const domain = decodeDomainReportSlug(domainSlug);
  const accessKey = new URL(request.url).searchParams.get("access");
  const record = await getShareableReportForDomainAccess({ domainOrUrl: domain, accessKey });

  if (!record) {
    return NextResponse.json({ error: "Report not found." }, { status: 404 });
  }

  return NextResponse.json(record);
}

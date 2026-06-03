import { runAudit } from "@/lib/run-audit";
import { validateScanRequest } from "@/lib/scan-request";
import { scanUrlSchema } from "@/lib/scan-request-schema";
import { recordCompletedScan } from "@/lib/scan-activity";
import type { AuditApiResponse } from "@/lib/types";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const parsed = scanUrlSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  const guardResponse = await validateScanRequest(
    request,
    parsed.data.url,
    parsed.data.turnstileToken,
  );

  if (guardResponse) {
    return guardResponse;
  }

  try {
    const response: AuditApiResponse = await runAudit(parsed.data.url);
    const scanRecord = await recordCompletedScan(response);

    return NextResponse.json({
      ...response,
      ...(scanRecord ? { scanRecord } : {}),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Audit failed unexpectedly";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { DomainUnreachableError } from "@/lib/domain-reachability";
import { generateFixAssets } from "@/lib/generate-assets";
import { runAudit } from "@/lib/run-audit";
import { validateScanRequest } from "@/lib/scan-request";
import { scanUrlSchema } from "@/lib/scan-request-schema";
import type { GenerateFixesApiResponse } from "@/lib/types";
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
    const audit = await runAudit(parsed.data.url);
    const assets = generateFixAssets(audit.generationContext);

    const response: GenerateFixesApiResponse = {
      auditedUrl: audit.url,
      generatedAt: new Date().toISOString(),
      assets,
      cacheStatus: audit.cacheStatus,
    };

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof DomainUnreachableError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const message =
      error instanceof Error ? error.message : "Fix generation failed unexpectedly";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

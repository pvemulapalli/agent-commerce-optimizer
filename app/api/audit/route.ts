import { crawlSite } from "@/lib/crawler";
import { groupFindings, runChecks } from "@/lib/checks";
import type { AuditResult } from "@/lib/types";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 120;

const auditRequestSchema = z.object({
  url: z
    .string()
    .trim()
    .min(1, "URL is required")
    .refine(
      (value) => {
        try {
          const normalized =
            value.startsWith("http://") || value.startsWith("https://")
              ? value
              : `https://${value}`;
          const parsed = new URL(normalized);
          return ["http:", "https:"].includes(parsed.protocol);
        } catch {
          return false;
        }
      },
      { message: "Enter a valid website URL" },
    ),
});

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

  const parsed = auditRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  try {
    const crawlData = await crawlSite(parsed.data.url);
    const { platform, findings } = runChecks(crawlData);
    const grouped = groupFindings(findings);

    const result: AuditResult & { grouped: typeof grouped } = {
      url: crawlData.entryUrl,
      crawledAt: crawlData.crawledAt,
      platform,
      findings,
      grouped,
    };

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Audit failed unexpectedly";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

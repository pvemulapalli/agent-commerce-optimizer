import { generateFixAssets } from "@/lib/generate-assets";
import { runAudit } from "@/lib/run-audit";
import type { GenerateFixesApiResponse } from "@/lib/types";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 120;

const generateFixesRequestSchema = z.object({
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

  const parsed = generateFixesRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
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
    const message =
      error instanceof Error ? error.message : "Fix generation failed unexpectedly";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

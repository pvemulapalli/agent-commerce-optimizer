import { validateAdminRequest } from "@/lib/admin-auth";
import { reclassifyDomainPlatform } from "@/lib/platform-admin";
import type { CommercePlatform } from "@/lib/types";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const reclassifySchema = z.object({
  token: z.string().trim().min(1, "Token is required"),
  domain: z.string().trim().min(1, "Domain is required"),
  platform: z.enum([
    "Shopify",
    "BigCommerce",
    "Salesforce Commerce Cloud",
    "WooCommerce",
    "Wix",
    "Squarespace",
    "Magento",
    "VTEX",
    "Fenicio",
    "CommerceTools",
    "Unknown",
  ]),
});

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = reclassifySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  const authError = validateAdminRequest(request, parsed.data.token);
  if (authError) {
    return authError;
  }

  try {
    const result = await reclassifyDomainPlatform({
      domain: parsed.data.domain,
      platform: parsed.data.platform as CommercePlatform,
    });

    return NextResponse.json({
      status: "ok",
      ...result,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Reclassification failed unexpectedly";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

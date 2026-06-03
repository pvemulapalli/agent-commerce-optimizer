import { validateAdminRequest } from "@/lib/admin-auth";
import { getBannedDomains, saveBannedDomains } from "@/lib/banned-domains";
import { isRedisConfigured } from "@/lib/redis";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const saveSchema = z.object({
  token: z.string().trim().min(1, "Token is required"),
  domains: z.array(z.string()),
});

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  const authError = validateAdminRequest(request, token);
  if (authError) {
    return authError;
  }

  const domains = await getBannedDomains();

  return NextResponse.json({
    status: "ok",
    domains,
    source: isRedisConfigured() ? "redis-or-env" : "env",
    redisConfigured: isRedisConfigured(),
  });
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = saveSchema.safeParse(body);

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
    const domains = await saveBannedDomains(parsed.data.domains);

    return NextResponse.json({
      status: "ok",
      domains,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Save failed unexpectedly";

    return NextResponse.json({ error: message }, { status: 503 });
  }
}

import {
  isValidAdminToken,
  unauthorizedJsonResponse,
} from "@/lib/admin-auth";
import { clearCommerceOptimizerRedisKeys } from "@/lib/redis-admin";
import { isRedisConfigured } from "@/lib/redis";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const resetSchema = z.object({
  token: z.string().trim().min(1, "Token is required"),
});

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = resetSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  if (!isValidAdminToken(parsed.data.token)) {
    return unauthorizedJsonResponse();
  }

  if (!isRedisConfigured()) {
    return NextResponse.json(
      { error: "Redis is not configured" },
      { status: 503 },
    );
  }

  try {
    const deletedKeys = await clearCommerceOptimizerRedisKeys();

    return NextResponse.json({
      status: "ok",
      deletedKeys,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Reset failed unexpectedly";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

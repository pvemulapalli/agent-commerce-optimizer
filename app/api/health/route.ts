import { APP_VERSION } from "@/lib/app-version";
import { isRedisConfigured } from "@/lib/redis";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "commerce-optimizer",
    version: APP_VERSION,
    timestamp: new Date().toISOString(),
    redis: isRedisConfigured() ? "configured" : "missing",
  });
}

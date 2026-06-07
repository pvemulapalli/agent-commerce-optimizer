import { buildRobotsTxt } from "@/lib/ai-discoverability";
import { getAppOrigin } from "@/lib/app-origin";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const origin = await getAppOrigin();

  return new NextResponse(buildRobotsTxt(origin), {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}

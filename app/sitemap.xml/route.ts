import { buildSitemapXml } from "@/lib/ai-discoverability";
import { getAppOrigin } from "@/lib/app-origin";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const origin = await getAppOrigin();

  return new NextResponse(buildSitemapXml(origin), {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}

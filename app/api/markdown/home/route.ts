import { buildHomeMarkdown } from "@/lib/ai-discoverability";
import { getAppOrigin } from "@/lib/app-origin";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const origin = await getAppOrigin();

  return new NextResponse(buildHomeMarkdown(origin), {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
      Vary: "Accept",
    },
  });
}

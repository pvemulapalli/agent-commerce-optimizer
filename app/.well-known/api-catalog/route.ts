import { buildApiCatalog } from "@/lib/ai-discoverability";
import { getAppOrigin } from "@/lib/app-origin";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const origin = await getAppOrigin();
  const catalog = buildApiCatalog(origin);

  return NextResponse.json(catalog, {
    status: 200,
    headers: {
      "Content-Type": "application/linkset+json",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
      Link: `<${origin}/.well-known/api-catalog>; rel="api-catalog"`,
    },
  });
}

import { getContributorsContent } from "@/lib/contributors";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const content = await getContributorsContent();

  return NextResponse.json({
    status: "ok",
    ...content,
  });
}

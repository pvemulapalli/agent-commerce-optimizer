import { getScanActivity } from "@/lib/scan-activity";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? Number.parseInt(limitParam, 10) : 5;

  try {
    const activity = await getScanActivity(
      Number.isNaN(limit) ? 5 : limit,
    );

    return NextResponse.json(activity);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load recent scans";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

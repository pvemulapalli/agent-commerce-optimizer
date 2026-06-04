import { buildCommerceOptimizerIndex } from "@/lib/commerce-index";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    const index = await buildCommerceOptimizerIndex();
    return NextResponse.json(index);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to build commerce index";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

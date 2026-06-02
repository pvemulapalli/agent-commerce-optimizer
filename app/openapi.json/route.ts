import { getOpenApiDocument } from "@/lib/openapi";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(getOpenApiDocument());
}

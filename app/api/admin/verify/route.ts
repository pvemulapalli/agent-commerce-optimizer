import { validateAdminRequest } from "@/lib/admin-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const verifySchema = z.object({
  token: z.string().trim().min(1, "Token is required"),
});

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = verifySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  const authError = validateAdminRequest(request, parsed.data.token);
  if (authError) {
    return authError;
  }

  return NextResponse.json({ status: "ok" });
}

export async function GET(request: Request) {
  const authError = validateAdminRequest(
    request,
    new URL(request.url).searchParams.get("token"),
  );
  if (authError) {
    return authError;
  }

  return NextResponse.json({ status: "ok" });
}

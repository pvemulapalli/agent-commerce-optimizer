import { validateAdminRequest } from "@/lib/admin-auth";
import { deleteAuditByDomain } from "@/lib/redis-admin";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const deleteSchema = z.object({
  token: z.string().trim().min(1, "Token is required"),
  domain: z.string().trim().min(1, "Domain is required"),
});

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = deleteSchema.safeParse(body);

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

  try {
    const result = await deleteAuditByDomain(parsed.data.domain);

    return NextResponse.json({
      status: "ok",
      ...result,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Delete failed unexpectedly";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

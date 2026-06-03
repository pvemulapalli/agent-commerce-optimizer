import { NextResponse } from "next/server";

export function isValidAdminToken(token: string | null | undefined): boolean {
  const expected = process.env.ADMIN_RESET_TOKEN?.trim();
  const provided = token?.trim();
  return Boolean(expected) && Boolean(provided) && provided === expected;
}

export function unauthorizedJsonResponse() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

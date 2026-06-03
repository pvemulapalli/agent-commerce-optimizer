import { NextResponse } from "next/server";

export function isAdminTokenConfigured(): boolean {
  return Boolean(process.env.ADMIN_RESET_TOKEN?.trim());
}

export function getConfiguredAdminToken(): string | undefined {
  return process.env.ADMIN_RESET_TOKEN?.trim() || undefined;
}

export function extractAdminToken(
  request: Request,
  bodyToken?: string | null,
): string | undefined {
  const fromBody = bodyToken?.trim();
  if (fromBody) {
    return fromBody;
  }

  const authorization = request.headers.get("authorization");
  if (authorization?.startsWith("Bearer ")) {
    const bearerToken = authorization.slice("Bearer ".length).trim();
    if (bearerToken) {
      return bearerToken;
    }
  }

  const queryToken = new URL(request.url).searchParams.get("token")?.trim();
  if (queryToken) {
    return queryToken;
  }

  return undefined;
}

export function isValidAdminToken(token: string | null | undefined): boolean {
  const expected = getConfiguredAdminToken();
  const provided = token?.trim();
  return Boolean(expected) && Boolean(provided) && provided === expected;
}

export function unauthorizedJsonResponse() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function adminNotConfiguredJsonResponse() {
  return NextResponse.json(
    {
      error:
        "Admin token is not configured on the server. Set ADMIN_RESET_TOKEN in .env.local or Vercel environment variables, then restart the dev server.",
    },
    { status: 503 },
  );
}

export function validateAdminRequest(
  request: Request,
  bodyToken?: string | null,
): Response | null {
  if (!isAdminTokenConfigured()) {
    return adminNotConfiguredJsonResponse();
  }

  const token = extractAdminToken(request, bodyToken);

  if (!isValidAdminToken(token)) {
    return unauthorizedJsonResponse();
  }

  return null;
}

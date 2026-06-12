/** Shared admin session helpers for maintenance UI pages. */
export const ADMIN_TOKEN_SESSION_KEY = "aco-admin-token";

export function readStoredAdminToken(): string {
  if (typeof window === "undefined") {
    return "";
  }

  return sessionStorage.getItem(ADMIN_TOKEN_SESSION_KEY)?.trim() ?? "";
}

export function storeAdminToken(value: string): void {
  const trimmed = value.trim();
  if (trimmed) {
    sessionStorage.setItem(ADMIN_TOKEN_SESSION_KEY, trimmed);
  } else {
    sessionStorage.removeItem(ADMIN_TOKEN_SESSION_KEY);
  }
}

export function adminHeaders(token: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token.trim()}`,
  };
}

export async function verifyAdminToken(
  token: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const trimmed = token.trim();

  if (!trimmed) {
    return { ok: false, error: "Token is required." };
  }

  const response = await fetch("/api/admin/verify", {
    method: "POST",
    headers: adminHeaders(trimmed),
    body: JSON.stringify({ token: trimmed }),
  });

  const data = (await response.json()) as { error?: string };

  if (!response.ok) {
    return {
      ok: false,
      error:
        data.error ??
        (response.status === 503
          ? "Admin token is not configured on the server."
          : "Invalid admin token."),
    };
  }

  return { ok: true };
}

export function adminApiUrl(path: string, token: string): string {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}token=${encodeURIComponent(token.trim())}`;
}

import { getClientIp } from "./request-utils";

export function isTurnstileEnabled(): boolean {
  return process.env.ENABLE_TURNSTILE === "true";
}

export function getTurnstileSiteKey(): string | null {
  return process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() || null;
}

export function isTurnstileRequired(): boolean {
  return isTurnstileEnabled() && Boolean(getTurnstileSiteKey());
}

export async function verifyTurnstileToken(
  token: string | undefined,
  request: Request,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isTurnstileEnabled()) {
    return { ok: true };
  }

  if (!token?.trim()) {
    return { ok: false, error: "Turnstile verification is required before scanning." };
  }

  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret) {
    return { ok: true };
  }

  const response = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret,
        response: token,
        remoteip: getClientIp(request),
      }),
    },
  );

  if (!response.ok) {
    return { ok: false, error: "Turnstile verification failed. Please try again." };
  }

  const result = (await response.json()) as { success?: boolean };

  if (!result.success) {
    return { ok: false, error: "Turnstile verification failed. Please try again." };
  }

  return { ok: true };
}

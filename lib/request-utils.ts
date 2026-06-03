import { createHash } from "crypto";

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");

  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  return "unknown";
}

/** Hashed identifier for rate-limit keys — raw IP is never stored in Redis. */
export function getRateLimitKey(request: Request): string {
  const ip = getClientIp(request);
  return createHash("sha256").update(ip).digest("hex").slice(0, 32);
}

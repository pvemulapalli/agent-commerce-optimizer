/**
 * Banned scan domains.
 *
 * Edit BANNED_SCAN_DOMAINS in .env.local or Vercel env vars for the default list.
 * Use /admin to update the Redis override in production (takes priority when present).
 */

import { normalizeAuditUrl } from "./cache";
import { getRegistrableDomain } from "./domains";
import { getRedis, isRedisConfigured } from "./redis";

const REDIS_BANNED_KEY = "aco:admin:banned-domains";

export const BANNED_DOMAIN_MESSAGE =
  "This domain is not supported for scanning.";

export function normalizeHostname(hostname: string): string {
  return getRegistrableDomain(hostname.trim().toLowerCase());
}

export function parseBannedDomainsFromEnv(): string[] {
  const raw = process.env.BANNED_SCAN_DOMAINS?.trim();

  if (!raw) {
    return [];
  }

  return [...new Set(raw.split(",").map((entry) => normalizeHostname(entry)).filter(Boolean))];
}

function parseStoredDomains(raw: unknown): string[] | null {
  if (!raw) {
    return null;
  }

  if (typeof raw === "string") {
    const parsed = JSON.parse(raw) as unknown;

    if (Array.isArray(parsed)) {
      return [...new Set(parsed.map(String).map(normalizeHostname).filter(Boolean))];
    }

    return null;
  }

  if (Array.isArray(raw)) {
    return [...new Set(raw.map(String).map(normalizeHostname).filter(Boolean))];
  }

  return null;
}

export async function getBannedDomains(): Promise<string[]> {
  if (isRedisConfigured()) {
    try {
      const redis = getRedis();
      const override = await redis.get(REDIS_BANNED_KEY);
      const parsedOverride = parseStoredDomains(override);

      if (parsedOverride) {
        return parsedOverride;
      }
    } catch (error) {
      console.error("[banned-domains] read override failed:", error);
    }
  }

  return parseBannedDomainsFromEnv();
}

export async function saveBannedDomains(domains: string[]): Promise<string[]> {
  const normalized = [...new Set(domains.map(normalizeHostname).filter(Boolean))];

  if (!isRedisConfigured()) {
    throw new Error(
      "Redis is not configured. Update BANNED_SCAN_DOMAINS in environment variables instead.",
    );
  }

  const redis = getRedis();
  await redis.set(REDIS_BANNED_KEY, JSON.stringify(normalized));

  return normalized;
}

export async function isBannedDomain(hostname: string): Promise<boolean> {
  const registrable = normalizeHostname(hostname);
  const banned = await getBannedDomains();

  for (const domain of banned) {
    if (registrable === domain || registrable.endsWith(`.${domain}`)) {
      return true;
    }
  }

  return false;
}

export async function isBannedScanUrl(url: string): Promise<boolean> {
  try {
    const hostname = new URL(normalizeAuditUrl(url)).hostname;
    return isBannedDomain(hostname);
  } catch {
    return false;
  }
}

export function createBannedDomainResponse(): Response {
  return new Response(JSON.stringify({ error: BANNED_DOMAIN_MESSAGE }), {
    status: 403,
    headers: { "Content-Type": "application/json" },
  });
}

/** @deprecated Use getBannedDomains */
export async function getBannedScanDomains(): Promise<Set<string>> {
  return new Set(await getBannedDomains());
}

/** @deprecated Use isBannedDomain */
export async function isBannedScanHostname(hostname: string): Promise<boolean> {
  return isBannedDomain(hostname);
}

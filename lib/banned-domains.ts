/**
 * Banned scan domains.
 *
 * Edit BANNED_SCAN_DOMAINS in .env.local or Vercel env vars for the default list.
 * Use the maintenance UI to update the Redis override in production (takes priority when present).
 */

import {
  BANNED_DOMAIN_CODE,
  BANNED_DOMAIN_MESSAGE,
  BANNED_DOMAIN_TITLE,
} from "./banned-domain-messages";
import { normalizeAuditUrl } from "./cache";
import { getRegistrableDomain } from "./domains";
import { getRedis, isRedisConfigured } from "./redis";

export {
  BANNED_DOMAIN_CODE,
  BANNED_DOMAIN_MESSAGE,
  BANNED_DOMAIN_TITLE,
  isBannedDomainError,
} from "./banned-domain-messages";

const REDIS_BANNED_KEY = "aco:admin:banned-domains";

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
  try {
    const { getDomainReviewQueue } = await import("./domain-review-queue");
    const records = await getDomainReviewQueue();
    return records
      .filter((record) => record.type === "MANUAL_BLOCK")
      .map((record) => record.domain);
  } catch (error) {
    console.error("[banned-domains] read from review queue failed:", error);
    return parseBannedDomainsFromEnv();
  }
}

export async function saveBannedDomains(domains: string[]): Promise<string[]> {
  const normalized = [...new Set(domains.map(normalizeHostname).filter(Boolean))];

  if (!isRedisConfigured()) {
    throw new Error(
      "Redis is not configured. Update BANNED_SCAN_DOMAINS in environment variables instead.",
    );
  }

  const { upsertDomainReviewRecord, removeDomainReviewRecord, getDomainReviewQueue } =
    await import("./domain-review-queue");

  const existing = await getDomainReviewQueue();
  const existingManualBlocks = new Set(
    existing.filter((record) => record.type === "MANUAL_BLOCK").map((record) => record.domain),
  );
  const nextManualBlocks = new Set(normalized);

  for (const domain of normalized) {
    await upsertDomainReviewRecord({
      domain,
      type: "MANUAL_BLOCK",
      reason: "manual_block",
      source: "admin",
      status: "APPROVED",
      retryAfter: null,
    });
  }

  for (const domain of existingManualBlocks) {
    if (!nextManualBlocks.has(domain)) {
      await removeDomainReviewRecord(domain);
    }
  }

  const redis = getRedis();
  await redis.set(REDIS_BANNED_KEY, JSON.stringify([]));

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
  return new Response(
    JSON.stringify({
      error: BANNED_DOMAIN_MESSAGE,
      title: BANNED_DOMAIN_TITLE,
      code: BANNED_DOMAIN_CODE,
    }),
    {
      status: 403,
      headers: { "Content-Type": "application/json" },
    },
  );
}

/** @deprecated Use getBannedDomains */
export async function getBannedScanDomains(): Promise<Set<string>> {
  return new Set(await getBannedDomains());
}

/** @deprecated Use isBannedDomain */
export async function isBannedScanHostname(hostname: string): Promise<boolean> {
  return isBannedDomain(hostname);
}

import { normalizeAuditUrl } from "./cache";
import { getRegistrableDomain } from "./domains";

const DEFAULT_BANNED_DOMAINS = [
  "amazon.com",
  "walmart.com",
  "target.com",
  "homedepot.com",
  "etsy.com",
];

export const BANNED_DOMAIN_MESSAGE =
  "This domain is not supported for scanning.";

let cachedBannedDomains: Set<string> | null = null;

function parseBannedDomainsEnv(): Set<string> {
  const raw = process.env.BANNED_SCAN_DOMAINS?.trim();

  const entries = raw
    ? raw.split(",").map((entry) => entry.trim().toLowerCase()).filter(Boolean)
    : DEFAULT_BANNED_DOMAINS;

  return new Set(entries);
}

export function getBannedScanDomains(): Set<string> {
  if (!cachedBannedDomains) {
    cachedBannedDomains = parseBannedDomainsEnv();
  }

  return cachedBannedDomains;
}

export function isBannedScanHostname(hostname: string): boolean {
  const registrable = getRegistrableDomain(hostname);
  const banned = getBannedScanDomains();

  if (banned.has(registrable)) {
    return true;
  }

  for (const domain of banned) {
    if (registrable === domain || registrable.endsWith(`.${domain}`)) {
      return true;
    }
  }

  return false;
}

export function isBannedScanUrl(url: string): boolean {
  try {
    const hostname = new URL(normalizeAuditUrl(url)).hostname;
    return isBannedScanHostname(hostname);
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

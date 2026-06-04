import dns from "node:dns/promises";
import { deleteCachedAuditsForHostname, normalizeAuditUrl } from "./cache";

const REACHABILITY_TIMEOUT_MS = 12_000;
const USER_AGENT =
  "AI-Commerce-Discoverability-Audit/1.2 (+https://github.com/agent-commerce-optimizer)";

export const DOMAIN_UNREACHABLE_MESSAGE =
  "Unable to reach this website. Please verify the URL and try again.";

export class DomainUnreachableError extends Error {
  constructor(message = DOMAIN_UNREACHABLE_MESSAGE) {
    super(message);
    this.name = "DomainUnreachableError";
  }
}

function isValidHostname(hostname: string): boolean {
  if (!hostname || hostname.length > 253) {
    return false;
  }

  if (hostname.startsWith(".") || hostname.endsWith(".")) {
    return false;
  }

  if (hostname === "localhost") {
    return true;
  }

  if (!hostname.includes(".")) {
    return false;
  }

  return /^[a-z0-9.-]+$/i.test(hostname);
}

async function resolveHostname(hostname: string): Promise<void> {
  try {
    await dns.lookup(hostname);
    return;
  } catch {
    // Fall through to explicit record lookups.
  }

  const lookups = await Promise.allSettled([
    dns.resolve4(hostname),
    dns.resolve6(hostname),
    dns.resolveCname(hostname),
  ]);

  const resolved = lookups.some((result) => result.status === "fulfilled");
  if (!resolved) {
    throw new DomainUnreachableError();
  }
}

async function probeSite(url: URL): Promise<void> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REACHABILITY_TIMEOUT_MS);

  try {
    await fetch(url.href, {
      method: "GET",
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
      },
    });
  } catch {
    throw new DomainUnreachableError();
  } finally {
    clearTimeout(timeout);
  }
}

/** Validates DNS resolution and HTTP reachability before crawling. */
export async function validateDomainReachability(inputUrl: string): Promise<void> {
  let url: URL;

  try {
    url = new URL(inputUrl);
  } catch {
    throw new DomainUnreachableError();
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new DomainUnreachableError();
  }

  const hostname = url.hostname;
  if (!isValidHostname(hostname)) {
    throw new DomainUnreachableError();
  }

  await resolveHostname(hostname);
  await probeSite(url);
}

/**
 * Validates reachability and purges any stale cached audit for unreachable domains.
 * Always runs before serving cache or starting a crawl.
 */
export async function ensureDomainReachable(inputUrl: string): Promise<void> {
  try {
    await validateDomainReachability(inputUrl);
  } catch (error) {
    if (error instanceof DomainUnreachableError) {
      try {
        const hostname = new URL(normalizeAuditUrl(inputUrl)).hostname;
        await deleteCachedAuditsForHostname(hostname);
      } catch {
        // Ignore cache purge failures — still surface the reachability error.
      }
    }

    throw error;
  }
}

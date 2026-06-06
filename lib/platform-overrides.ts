import type { CommercePlatform, ConfidenceLevel, PlatformAnalysis } from "./types";
import { normalizeDomainFromUrl } from "./domain-normalization";
import { getPlatformLabel } from "./platform";
import { getRedis, isRedisConfigured } from "./redis";

const OVERRIDES_KEY = "aco:admin:platform-overrides";

const memoryOverrides = new Map<string, CommercePlatform>();

export async function getPlatformOverride(
  urlOrDomain: string,
): Promise<CommercePlatform | null> {
  const domain = normalizeDomainFromUrl(
    urlOrDomain.includes("://") ? urlOrDomain : `https://${urlOrDomain}/`,
  );

  try {
    if (isRedisConfigured()) {
      const redis = getRedis();
      const value = await redis.hget<string>(OVERRIDES_KEY, domain);
      return (value as CommercePlatform | null) ?? null;
    }

    return memoryOverrides.get(domain) ?? null;
  } catch (error) {
    console.error("[platform-overrides] read failed:", error);
    return null;
  }
}

export async function setPlatformOverride(
  domainInput: string,
  platform: CommercePlatform,
): Promise<string> {
  const domain = normalizeDomainFromUrl(
    domainInput.includes("://") ? domainInput : `https://${domainInput}/`,
  );

  if (isRedisConfigured()) {
    const redis = getRedis();
    await redis.hset(OVERRIDES_KEY, { [domain]: platform });
  } else {
    memoryOverrides.set(domain, platform);
  }

  return domain;
}

export async function listPlatformOverrides(): Promise<
  Array<{ domain: string; platform: CommercePlatform }>
> {
  try {
    if (isRedisConfigured()) {
      const redis = getRedis();
      const record = await redis.hgetall<Record<string, CommercePlatform>>(OVERRIDES_KEY);
      if (!record) {
        return [];
      }

      return Object.entries(record).map(([domain, platform]) => ({ domain, platform }));
    }

    return [...memoryOverrides.entries()].map(([domain, platform]) => ({ domain, platform }));
  } catch (error) {
    console.error("[platform-overrides] list failed:", error);
    return [];
  }
}

export function applyPlatformOverride(
  analysis: PlatformAnalysis,
  override: CommercePlatform,
): PlatformAnalysis {
  return {
    platform: override,
    confidence: "high" as ConfidenceLevel,
    evidence: [
      `Admin platform override applied (${getPlatformLabel(override)})`,
      ...analysis.evidence,
    ],
    sourceUrls: analysis.sourceUrls,
  };
}

import { deleteCachedAuditsForHostname } from "./cache";
import { normalizeHostname } from "./banned-domains";
import { removeRecentAuditByHostname, getScanActivity } from "./scan-activity";
import { getRedis, isRedisConfigured } from "./redis";

const ACO_KEY_PREFIXES = [
  "aco:scan:",
  "aco:audit:",
  "aco:ratelimit:",
  "aco:admin:",
  "aco:benchmark:",
  "aco:email:",
  "aco:platform:feedback",
];

export async function clearCommerceOptimizerRedisKeys(): Promise<number> {
  if (!isRedisConfigured()) {
    return 0;
  }

  const redis = getRedis();
  let deletedKeys = 0;

  for (const prefix of ACO_KEY_PREFIXES) {
    const keys = await redis.keys(`${prefix}*`);

    if (keys.length === 0) {
      continue;
    }

    deletedKeys += keys.length;
    await redis.del(...keys);
  }

  return deletedKeys;
}

export function parseAdminDomainInput(input: string): string {
  const trimmed = input.trim();

  if (!trimmed) {
    return "";
  }

  try {
    const withProtocol =
      trimmed.startsWith("http://") || trimmed.startsWith("https://")
        ? trimmed
        : `https://${trimmed}`;
    return normalizeHostname(new URL(withProtocol).hostname);
  } catch {
    return normalizeHostname(trimmed.replace(/^www\./, ""));
  }
}

export async function deleteAuditByDomain(domainInput: string): Promise<{
  hostname: string;
  deletedKeys: number;
  removedRecentAudit: boolean;
  totalScans: number;
}> {
  const hostname = parseAdminDomainInput(domainInput);

  if (!hostname) {
    throw new Error("Domain is required");
  }

  const deletedCacheKeys = await deleteCachedAuditsForHostname(hostname);
  const removedRecentAudit = await removeRecentAuditByHostname(hostname);
  const { totalScans } = await getScanActivity(1);

  return {
    hostname,
    deletedKeys: deletedCacheKeys,
    removedRecentAudit,
    totalScans,
  };
}

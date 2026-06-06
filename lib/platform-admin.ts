import { updateCachedAuditPlatform } from "./cache";
import { normalizeDomainFromUrl } from "./domain-normalization";
import { updateAuditHistoryPlatform } from "./audit-history";
import { updateBenchmarkSamplesPlatform } from "./benchmark-samples";
import { parseAdminDomainInput } from "./redis-admin";
import { updateRecentScanPlatform } from "./scan-activity";
import { setPlatformOverride } from "./platform-overrides";
import type { CommercePlatform } from "./types";

export async function reclassifyDomainPlatform(input: {
  domain: string;
  platform: CommercePlatform;
}): Promise<{
  domain: string;
  platform: CommercePlatform;
  updatedRecentScan: boolean;
  updatedHistoryRecords: number;
  updatedBenchmarkSamples: number;
  updatedCachedAudit: boolean;
}> {
  const domain = parseAdminDomainInput(input.domain) || normalizeDomainFromUrl(input.domain);

  if (!domain) {
    throw new Error("Domain is required");
  }

  await setPlatformOverride(domain, input.platform);

  const [updatedRecentScan, updatedHistoryRecords, updatedBenchmarkSamples, updatedCachedAudit] =
    await Promise.all([
      updateRecentScanPlatform(domain, input.platform),
      updateAuditHistoryPlatform(domain, input.platform),
      updateBenchmarkSamplesPlatform(domain, input.platform),
      updateCachedAuditPlatform(domain, input.platform),
    ]);

  return {
    domain,
    platform: input.platform,
    updatedRecentScan,
    updatedHistoryRecords,
    updatedBenchmarkSamples,
    updatedCachedAudit,
  };
}

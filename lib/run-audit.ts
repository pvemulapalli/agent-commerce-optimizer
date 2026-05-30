import {
  isCacheEnabled,
  readCachedAudit,
  writeCachedAudit,
} from "@/lib/cache";
import { crawlSite } from "@/lib/crawler";
import { finalizeFindings, groupFindings, runChecks } from "@/lib/checks";
import type { AuditApiResponse } from "@/lib/types";

export async function runAudit(url: string): Promise<AuditApiResponse> {
  if (isCacheEnabled()) {
    const cached = await readCachedAudit(url);
    if (cached) {
      const findings = finalizeFindings(cached.findings, cached.platform);
      return {
        ...cached,
        findings,
        grouped: groupFindings(findings),
        cacheStatus: "HIT",
      };
    }
  }

  const crawlData = await crawlSite(url);
  const { platform, findings } = runChecks(crawlData);
  const finalizedFindings = finalizeFindings(findings, platform);
  const grouped = groupFindings(finalizedFindings);

  const result = {
    url: crawlData.entryUrl,
    crawledAt: crawlData.crawledAt,
    platform,
    findings: finalizedFindings,
    grouped,
  };

  const cacheStatus = isCacheEnabled() ? ("MISS" as const) : ("BYPASS" as const);
  let expiresAt: string | null = null;

  if (isCacheEnabled()) {
    expiresAt = await writeCachedAudit(url, result);
  }

  return {
    ...result,
    cacheStatus,
    expiresAt,
  };
}

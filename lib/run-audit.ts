import {
  isCacheEnabled,
  readCachedAudit,
  writeCachedAudit,
} from "@/lib/cache";
import { crawlSite } from "@/lib/crawler";
import { finalizeFindings, groupFindings, runChecks } from "@/lib/checks";
import { buildCrawlSummary, inferCrawlSummaryFromFindings } from "@/lib/crawl-quality";
import type { CrawlSummary } from "@/lib/crawl-quality";
import { ensureDomainReachable } from "@/lib/domain-reachability";
import {
  buildGenerationContext,
  buildGenerationContextFromFindings,
} from "@/lib/generation-context";

import type { AuditApiResponse, GenerationContext } from "@/lib/types";

export interface AuditRunResult extends AuditApiResponse {
  crawlSummary: CrawlSummary;
  generationContext: GenerationContext;
}

export async function runAudit(url: string): Promise<AuditRunResult> {
  await ensureDomainReachable(url);

  if (isCacheEnabled()) {
    const cached = await readCachedAudit(url);
    if (cached) {
      const findings = finalizeFindings(cached.findings, cached.platform);
      const generationContext =
        cached.generationContext ??
        buildGenerationContextFromFindings(
          cached.url,
          cached.crawledAt,
          cached.platform,
          findings,
        );

      return {
        ...cached,
        findings,
        grouped: groupFindings(findings),
        cacheStatus: "HIT",
        crawlSummary: inferCrawlSummaryFromFindings(
          findings,
          generationContext?.pages.length ?? 0,
        ),
        generationContext,
      };
    }
  }

  const crawlData = await crawlSite(url);
  const crawlSummary = buildCrawlSummary(crawlData);
  const { platform, findings } = runChecks(crawlData);
  const finalizedFindings = finalizeFindings(findings, platform);
  const grouped = groupFindings(finalizedFindings);
  const generationContext = buildGenerationContext(
    crawlData,
    platform,
    finalizedFindings,
  );

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
    expiresAt = await writeCachedAudit(url, result, generationContext);
  }

  return {
    ...result,
    cacheStatus,
    expiresAt,
    crawlSummary,
    generationContext,
  };
}

import {
  deleteCachedAuditsForHostname,
  isCacheEnabled,
  readCachedAudit,
  writeCachedAudit,
} from "@/lib/cache";
import { crawlSite } from "@/lib/crawler";
import { finalizeFindings, groupFindings, runChecks } from "@/lib/checks";
import { buildCrawlSummary, inferCrawlSummaryFromFindings } from "@/lib/crawl-quality";
import type { CrawlSummary } from "@/lib/crawl-quality";
import {
  assertEcommerceEligible,
  EcommerceIneligibleError,
} from "@/lib/ecommerce-eligibility";
import {
  assertMinimumCrawlHealth,
  ensureDomainReachable,
} from "@/lib/domain-reachability";
import {
  buildGenerationContext,
  buildGenerationContextFromFindings,
} from "@/lib/generation-context";
import {
  applyPlatformOverride,
  getPlatformOverride,
} from "@/lib/platform-overrides";

import type { AuditApiResponse, GenerationContext, PlatformAnalysis } from "@/lib/types";

export interface AuditRunResult extends AuditApiResponse {
  crawlSummary: CrawlSummary;
  generationContext: GenerationContext;
}

async function resolvePlatformAnalysis(
  url: string,
  platform: PlatformAnalysis,
): Promise<PlatformAnalysis> {
  const override = await getPlatformOverride(url);
  return override ? applyPlatformOverride(platform, override) : platform;
}

export async function runAudit(url: string): Promise<AuditRunResult> {
  await ensureDomainReachable(url);

  if (isCacheEnabled()) {
    const cached = await readCachedAudit(url);
    if (cached) {
      const platform = await resolvePlatformAnalysis(cached.url, cached.platform);
      const findings = finalizeFindings(cached.findings, platform);
      const generationContext =
        cached.generationContext ??
        buildGenerationContextFromFindings(
          cached.url,
          cached.crawledAt,
          platform,
          findings,
        );

      try {
        assertEcommerceEligible({
          findings,
          platform,
          generationPages: generationContext.pages,
        });
      } catch (error) {
        if (error instanceof EcommerceIneligibleError) {
          const hostname = new URL(cached.url).hostname;
          await deleteCachedAuditsForHostname(hostname);
        }
        throw error;
      }

      return {
        ...cached,
        platform,
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
  assertMinimumCrawlHealth(crawlData);
  const crawlSummary = buildCrawlSummary(crawlData);
  const checks = runChecks(crawlData);
  const platform = await resolvePlatformAnalysis(crawlData.entryUrl, checks.platform);
  const findings = checks.findings;
  const finalizedFindings = finalizeFindings(findings, platform);
  const grouped = groupFindings(finalizedFindings);

  assertEcommerceEligible({
    findings: finalizedFindings,
    platform,
    crawlData,
  });

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

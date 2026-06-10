import { normalizeDomainFromUrl } from "./domain-normalization";
import { getCacheKey, normalizeAuditUrl } from "./cache";
import { getRedis, isRedisConfigured } from "./redis";
import type { EnrichedAuditResponse } from "./enrich-audit-response";
import { buildReadinessReport } from "./readiness-score";
import { computeCrawlHash } from "./crawl-hash";

export const DOMAIN_SCAN_INDEX_PREFIX = "aco:domain-scan:";
export const DOMAIN_HISTORY_PREFIX = "aco:domain-history:";

export interface DomainScanIndexEntry {
  normalizedDomain: string;
  auditedUrl: string;
  reportId: string;
  auditId: string;
  scannedAt: string;
  score: number;
  grade: string;
  platform: string;
  crawlHash: string;
  accessKey?: string;
}

export interface DomainScanHistoryEntry {
  domain: string;
  normalizedDomain: string;
  scannedAt: string;
  score: number;
  grade: string;
  platform: string;
  dimensionScores: Record<string, number>;
  topGaps: string[];
  reportId: string;
  crawlHash: string;
}

/** Default page size when reading per-domain scan history — storage is not trimmed. */
export const DEFAULT_DOMAIN_SCAN_HISTORY_LIMIT = 50;

let memoryIndex = new Map<string, DomainScanIndexEntry>();
let memoryHistory = new Map<string, DomainScanHistoryEntry[]>();

function domainIndexKey(normalizedDomain: string): string {
  return `${DOMAIN_SCAN_INDEX_PREFIX}${normalizedDomain}`;
}

function domainHistoryKey(normalizedDomain: string): string {
  return `${DOMAIN_HISTORY_PREFIX}${normalizedDomain}`;
}

export function buildDomainScanHistoryEntry(input: {
  audit: EnrichedAuditResponse;
  reportId: string;
}): DomainScanHistoryEntry {
  const report = buildReadinessReport(input.audit, {
    merchantName: input.audit.auditMetadata?.merchantName,
  });
  const dimensionScores = Object.fromEntries(
    report.dimensions.map((dimension) => [dimension.id, dimension.score]),
  );
  const topGaps = [...report.opportunities, report.topGap].filter(
    (value, index, array) => array.indexOf(value) === index,
  );

  return {
    domain: new URL(input.audit.url).hostname,
    normalizedDomain: normalizeDomainFromUrl(input.audit.url),
    scannedAt: input.audit.crawledAt,
    score: report.score,
    grade: report.grade,
    platform: input.audit.platform.platform,
    dimensionScores,
    topGaps,
    reportId: input.reportId,
    crawlHash: computeCrawlHash({
      platform: input.audit.platform.platform,
      findings: input.audit.findings,
      dimensionScores,
    }),
  };
}

export async function getLatestDomainScanIndex(
  domainOrUrl: string,
): Promise<DomainScanIndexEntry | null> {
  const normalizedDomain = normalizeDomainFromUrl(
    domainOrUrl.includes("://") ? domainOrUrl : `https://${domainOrUrl}/`,
  );

  if (isRedisConfigured()) {
    try {
      const redis = getRedis();
      const raw = await redis.get<string>(domainIndexKey(normalizedDomain));
      if (!raw) {
        return null;
      }

      return typeof raw === "string" ? (JSON.parse(raw) as DomainScanIndexEntry) : raw;
    } catch (error) {
      console.error("[domain-scan-index] read failed:", error);
      return null;
    }
  }

  return memoryIndex.get(normalizedDomain) ?? null;
}

export async function updateDomainScanIndex(input: {
  audit: EnrichedAuditResponse;
  reportId: string;
  accessKey?: string;
}): Promise<DomainScanIndexEntry> {
  const normalizedUrl = normalizeAuditUrl(input.audit.url);
  const normalizedDomain = normalizeDomainFromUrl(normalizedUrl);
  const report = buildReadinessReport(input.audit, {
    merchantName: input.audit.auditMetadata?.merchantName,
  });
  const dimensionScores = Object.fromEntries(
    report.dimensions.map((dimension) => [dimension.id, dimension.score]),
  );
  const entry: DomainScanIndexEntry = {
    normalizedDomain,
    auditedUrl: normalizedUrl,
    reportId: input.reportId,
    auditId: getCacheKey(normalizedUrl),
    scannedAt: input.audit.crawledAt,
    score: report.score,
    grade: report.grade,
    platform: input.audit.platform.platform,
    crawlHash: computeCrawlHash({
      platform: input.audit.platform.platform,
      findings: input.audit.findings,
      dimensionScores,
    }),
    accessKey: input.accessKey,
  };

  const historyEntry = buildDomainScanHistoryEntry(input);

  if (isRedisConfigured()) {
    try {
      const redis = getRedis();
      await redis.set(domainIndexKey(normalizedDomain), JSON.stringify(entry));
      await redis.lpush(domainHistoryKey(normalizedDomain), JSON.stringify(historyEntry));
    } catch (error) {
      console.error("[domain-scan-index] write failed:", error);
    }
  } else {
    memoryIndex.set(normalizedDomain, entry);
    const existing = memoryHistory.get(normalizedDomain) ?? [];
    memoryHistory.set(normalizedDomain, [historyEntry, ...existing]);
  }

  return entry;
}

export async function getDomainScanHistory(
  domainOrUrl: string,
  limit = DEFAULT_DOMAIN_SCAN_HISTORY_LIMIT,
): Promise<DomainScanHistoryEntry[]> {
  const normalizedDomain = normalizeDomainFromUrl(
    domainOrUrl.includes("://") ? domainOrUrl : `https://${domainOrUrl}/`,
  );

  if (isRedisConfigured()) {
    try {
      const redis = getRedis();
      const raw = await redis.lrange(domainHistoryKey(normalizedDomain), 0, limit - 1);
      return (raw ?? [])
        .map((entry) => (typeof entry === "string" ? JSON.parse(entry) : entry))
        .filter(Boolean) as DomainScanHistoryEntry[];
    } catch (error) {
      console.error("[domain-scan-index] history read failed:", error);
      return [];
    }
  }

  return (memoryHistory.get(normalizedDomain) ?? []).slice(0, limit);
}

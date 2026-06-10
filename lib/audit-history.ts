import { computeCrawlHash } from "./crawl-hash";
import { normalizeDomainFromUrl } from "./domain-normalization";
import { resolveMerchantDisplayName } from "./merchant-name";
import { buildReadinessReport } from "./readiness-score";
import { getRedis, isRedisConfigured } from "./redis";
import type { AuditApiResponse } from "./types";

export interface AuditHistoryFindingsSummary {
  detected: number;
  missing: number;
  needsReview: number;
  detectedIds: string[];
  missingIds: string[];
  needsReviewIds: string[];
}

export interface AuditHistoryRecord {
  domain: string;
  normalizedDomain: string;
  merchantName: string;
  score: number;
  grade: string;
  platform: string;
  dimensionScores: Record<string, number>;
  findingsSummary: AuditHistoryFindingsSummary;
  confidenceScore: number;
  crawlHash: string;
  timestamp: string;
  topGaps: string[];
  reportId?: string;
}

const HISTORY_KEY = "aco:audit-history";
/** Default page size when reading audit history — storage is not trimmed. */
export const DEFAULT_AUDIT_HISTORY_READ_LIMIT = 500;

let memoryHistory: AuditHistoryRecord[] = [];

function buildFindingsSummary(audit: AuditApiResponse): AuditHistoryFindingsSummary {
  return {
    detected: audit.grouped.detected.length,
    missing: audit.grouped.missing.length,
    needsReview: audit.grouped.needsReview.length,
    detectedIds: audit.grouped.detected.map((finding) => finding.id),
    missingIds: audit.grouped.missing.map((finding) => finding.id),
    needsReviewIds: audit.grouped.needsReview.map((finding) => finding.id),
  };
}

export function createAuditHistoryRecord(input: {
  audit: AuditApiResponse;
  confidenceScore: number;
  merchantName?: string;
  reportId?: string;
}): AuditHistoryRecord {
  const report = buildReadinessReport(input.audit);
  const dimensionScores = Object.fromEntries(
    report.dimensions.map((dimension) => [dimension.id, dimension.score]),
  );
  const topGaps = [...report.opportunities, report.topGap].filter(
    (value, index, array) => array.indexOf(value) === index,
  );

  return {
    domain: new URL(input.audit.url).hostname,
    normalizedDomain: normalizeDomainFromUrl(input.audit.url),
    merchantName:
      input.merchantName ?? resolveMerchantDisplayName({ url: input.audit.url }),
    score: report.score,
    grade: report.grade,
    platform: input.audit.platform.platform,
    dimensionScores,
    findingsSummary: buildFindingsSummary(input.audit),
    confidenceScore: input.confidenceScore,
    crawlHash: computeCrawlHash({
      platform: input.audit.platform.platform,
      findings: input.audit.findings,
      dimensionScores,
    }),
    timestamp: input.audit.crawledAt,
    topGaps,
    reportId: input.reportId,
  };
}

function parseHistoryEntry(entry: unknown): AuditHistoryRecord | null {
  if (!entry) {
    return null;
  }

  if (typeof entry === "string") {
    return JSON.parse(entry) as AuditHistoryRecord;
  }

  if (typeof entry === "object") {
    return entry as AuditHistoryRecord;
  }

  return null;
}

function parseHistoryList(entries: unknown[]): AuditHistoryRecord[] {
  return entries
    .map(parseHistoryEntry)
    .filter((entry): entry is AuditHistoryRecord => Boolean(entry));
}

async function readHistoryRecords(
  limit = DEFAULT_AUDIT_HISTORY_READ_LIMIT,
): Promise<AuditHistoryRecord[]> {
  if (isRedisConfigured()) {
    const redis = getRedis();
    const raw = await redis.lrange(HISTORY_KEY, 0, limit - 1);
    return parseHistoryList(raw ?? []);
  }

  return memoryHistory.slice(0, limit);
}

export async function appendAuditHistory(record: AuditHistoryRecord): Promise<void> {
  try {
    if (isRedisConfigured()) {
      const redis = getRedis();
      await redis.lpush(HISTORY_KEY, JSON.stringify(record));
      return;
    }

    memoryHistory = [record, ...memoryHistory];
  } catch (error) {
    console.error("[audit-history] append failed:", error);
  }
}

export async function getAuditHistory(
  limit = DEFAULT_AUDIT_HISTORY_READ_LIMIT,
): Promise<AuditHistoryRecord[]> {
  try {
    return await readHistoryRecords(limit);
  } catch (error) {
    console.error("[audit-history] read failed:", error);
    return [];
  }
}

export async function getAuditHistoryForPlatform(
  platform: string,
  limit = DEFAULT_AUDIT_HISTORY_READ_LIMIT,
): Promise<AuditHistoryRecord[]> {
  const records = await getAuditHistory(limit);
  return records.filter((record) => record.platform === platform);
}

export async function updateAuditHistoryPlatform(
  domainInput: string,
  platform: string,
): Promise<number> {
  const normalizedDomain = normalizeDomainFromUrl(
    domainInput.includes("://") ? domainInput : `https://${domainInput}/`,
  );

  try {
    const records = await readHistoryRecords();
    let updated = 0;
    const next = records.map((record) => {
      if (record.normalizedDomain !== normalizedDomain) {
        return record;
      }

      updated += 1;
      return { ...record, platform };
    });

    if (updated === 0) {
      return 0;
    }

    if (isRedisConfigured()) {
      const redis = getRedis();
      await redis.del(HISTORY_KEY);
      if (next.length > 0) {
        await redis.lpush(
          HISTORY_KEY,
          ...next.toReversed().map((record) => JSON.stringify(record)),
        );
      }
    } else {
      memoryHistory = next;
    }

    return updated;
  } catch (error) {
    console.error("[audit-history] platform update failed:", error);
    return 0;
  }
}

export async function recordAuditHistory(input: {
  audit: AuditApiResponse;
  confidenceScore: number;
  merchantName?: string;
  reportId?: string;
}): Promise<AuditHistoryRecord | null> {
  const record = createAuditHistoryRecord(input);
  await appendAuditHistory(record);
  return record;
}

import { normalizeDomainFromUrl } from "./domain-normalization";
import { resolveMerchantDisplayName } from "./merchant-name";
import { normalizeAuditUrl } from "./audit-url";
import type { AuditReportMetadata } from "./audit-metadata";
import {
  computePlatformLeaderboard,
  type PlatformLeaderboardStat,
} from "./platform-leaderboard";
import { recordBenchmarkSample } from "./benchmark-samples";
import type { AuditApiResponse } from "./types";
import { buildReadinessReport } from "./readiness-score";
import { getRedis, isRedisConfigured } from "./redis";
import type { RecentScanRecord, ScanActivityResponse } from "./scan-activity-types";

export type { RecentScanRecord, ScanActivityResponse } from "./scan-activity-types";
export {
  RECENT_REPORT_LINK_LIMIT,
  buildRecentReportHomeUrl,
  getReportLinkableScanIds,
} from "./recent-scan-links";

const TOTAL_KEY = "aco:scan:total";
/** Legacy list key — migrated into DOMAINS_HASH_KEY + RECENT_INDEX_KEY. */
const LEGACY_RECENT_KEY = "aco:scan:recent";
const DOMAINS_HASH_KEY = "aco:scan:domains";
const RECENT_INDEX_KEY = "aco:scan:recent-index";
const REGISTRY_MIGRATED_KEY = "aco:scan:registry-v2";

/** Default number of scan rows returned for the /recent page. */
export const RECENT_SCANS_PAGE_LIMIT = 50;
/** Maximum rows returned by a single /api/recent-scans request. Redis storage is not capped. */
export const RECENT_SCANS_API_MAX_LIMIT = 500;

const HMGET_BATCH_SIZE = 100;

let memoryTotalScans = 0;
let memoryRecentScans: RecentScanRecord[] = [];

function normalizeHostname(hostname: string): string {
  return normalizeDomainFromUrl(`https://${hostname.replace(/^www\./, "")}/`);
}

function parseRecentScanEntry(entry: unknown): RecentScanRecord | null {
  if (!entry) {
    return null;
  }

  if (typeof entry === "string") {
    return JSON.parse(entry) as RecentScanRecord;
  }

  if (typeof entry === "object") {
    return entry as RecentScanRecord;
  }

  return null;
}

function parseRecentScanList(entries: unknown[]): RecentScanRecord[] {
  return entries
    .map(parseRecentScanEntry)
    .filter((entry): entry is RecentScanRecord => Boolean(entry));
}

function normalizeScanRecord(record: RecentScanRecord): RecentScanRecord {
  const readinessScore = record.readinessScore ?? 0;
  const grade = record.grade ?? "F";
  const topGap = record.topGap ?? "Structured Data";

  return {
    ...record,
    id: normalizeHostname(record.hostname),
    readinessScore,
    grade,
    topGap,
  };
}

/** Collapse duplicate rows for the same hostname, keeping the newest scan. */
export function dedupeRecentScans(records: RecentScanRecord[]): RecentScanRecord[] {
  const byHostname = new Map<string, RecentScanRecord>();

  for (const raw of records) {
    const record = normalizeScanRecord(raw);
    const hostKey = normalizeHostname(record.hostname);
    const existing = byHostname.get(hostKey);

    if (
      !existing ||
      Date.parse(record.scannedAt) >= Date.parse(existing.scannedAt)
    ) {
      byHostname.set(hostKey, record);
    }
  }

  return [...byHostname.values()].sort(
    (left, right) => Date.parse(right.scannedAt) - Date.parse(left.scannedAt),
  );
}

async function migrateLegacyRecentListIfNeeded(): Promise<void> {
  if (!isRedisConfigured()) {
    return;
  }

  const redis = getRedis();
  const migrated = await redis.get(REGISTRY_MIGRATED_KEY);

  if (migrated) {
    return;
  }

  const legacyRaw = await redis.lrange(LEGACY_RECENT_KEY, 0, -1);

  if (legacyRaw?.length) {
    const records = dedupeRecentScans(parseRecentScanList(legacyRaw));

    for (const record of records) {
      const hostKey = normalizeHostname(record.hostname);
      const normalized = normalizeScanRecord(record);
      await redis.hset(DOMAINS_HASH_KEY, { [hostKey]: JSON.stringify(normalized) });
      await redis.zadd(RECENT_INDEX_KEY, {
        score: Date.parse(normalized.scannedAt),
        member: hostKey,
      });
    }

    await redis.del(LEGACY_RECENT_KEY);
  }

  await redis.set(REGISTRY_MIGRATED_KEY, "1");
}

async function readScanRecordsFromHash(hostKeys: string[]): Promise<RecentScanRecord[]> {
  if (hostKeys.length === 0) {
    return [];
  }

  const redis = getRedis();
  const records: RecentScanRecord[] = [];

  for (let index = 0; index < hostKeys.length; index += HMGET_BATCH_SIZE) {
    const batch = hostKeys.slice(index, index + HMGET_BATCH_SIZE);
    const values = await redis.hmget(DOMAINS_HASH_KEY, ...batch);

    batch.forEach((_, batchIndex) => {
      const value = Array.isArray(values) ? values[batchIndex] : values?.[batch[batchIndex]];
      const parsed = parseRecentScanEntry(value);
      if (parsed) {
        records.push(normalizeScanRecord(parsed));
      }
    });
  }

  return records.sort(
    (left, right) => Date.parse(right.scannedAt) - Date.parse(left.scannedAt),
  );
}

async function readSortedScanHostKeys(redis: ReturnType<typeof getRedis>): Promise<string[]> {
  const hostKeys = await redis.zrange(RECENT_INDEX_KEY, 0, -1, { rev: true });
  return (hostKeys ?? []).map(String);
}

async function getAllStoredScanRecords(): Promise<RecentScanRecord[]> {
  if (isRedisConfigured()) {
    await migrateLegacyRecentListIfNeeded();
    const redis = getRedis();
    const hostKeys = await readSortedScanHostKeys(redis);
    return readScanRecordsFromHash(hostKeys);
  }

  return dedupeRecentScans(memoryRecentScans);
}

function hostnameExistsInRecent(
  hostname: string,
  existing: RecentScanRecord[],
): boolean {
  const hostKey = normalizeHostname(hostname);
  return existing.some((item) => normalizeHostname(item.hostname) === hostKey);
}

export function extractMerchantName(
  url: string,
  merchantName?: string,
): string {
  return merchantName ?? resolveMerchantDisplayName({ url });
}

export function buildAuditSummary(audit: AuditApiResponse): string {
  const { detected, missing, needsReview } = audit.grouped;

  return `${detected.length} detected · ${missing.length} missing · ${needsReview.length} needs review`;
}

export function createScanRecord(
  audit: AuditApiResponse,
  merchantName?: string,
  report?: { reportId?: string; shareUrl?: string },
): RecentScanRecord {
  const hostname = new URL(audit.url).hostname;
  const reportData = buildReadinessReport(audit);

  return {
    id: normalizeHostname(hostname),
    url: normalizeAuditUrl(audit.url),
    hostname,
    merchant: extractMerchantName(audit.url, merchantName),
    platform: audit.platform.platform,
    confidence: audit.platform.confidence,
    scannedAt: audit.crawledAt,
    cacheStatus: audit.cacheStatus,
    summary: buildAuditSummary(audit),
    readinessScore: reportData.score,
    grade: reportData.grade,
    topGap: reportData.topGap,
    reportId: report?.reportId,
    shareUrl: report?.shareUrl,
  };
}

function upsertRecentScanInMemory(record: RecentScanRecord): void {
  memoryRecentScans = dedupeRecentScans([
    record,
    ...memoryRecentScans.filter(
      (item) =>
        normalizeHostname(item.hostname) !== normalizeHostname(record.hostname),
    ),
  ]);
}

async function upsertRecentScanInRedis(record: RecentScanRecord): Promise<void> {
  const redis = getRedis();
  await migrateLegacyRecentListIfNeeded();

  const hostKey = normalizeHostname(record.hostname);
  const normalized = normalizeScanRecord(record);

  await redis.hset(DOMAINS_HASH_KEY, { [hostKey]: JSON.stringify(normalized) });
  await redis.zadd(RECENT_INDEX_KEY, {
    score: Date.parse(normalized.scannedAt),
    member: hostKey,
  });
}

export async function compactRecentScansInRedis(): Promise<void> {
  if (!isRedisConfigured()) {
    memoryRecentScans = dedupeRecentScans(memoryRecentScans);
    return;
  }

  await migrateLegacyRecentListIfNeeded();

  const redis = getRedis();
  const hostKeys = await readSortedScanHostKeys(redis);

  if (!hostKeys?.length) {
    return;
  }

  const staleMembers: string[] = [];

  for (let index = 0; index < hostKeys.length; index += HMGET_BATCH_SIZE) {
    const batch = hostKeys.slice(index, index + HMGET_BATCH_SIZE);
    const values = await redis.hmget(DOMAINS_HASH_KEY, ...batch);

    batch.forEach((member, batchIndex) => {
      const value = Array.isArray(values) ? values[batchIndex] : values?.[member];
      if (!value) {
        staleMembers.push(member);
      }
    });
  }

  if (staleMembers.length > 0) {
    await redis.zrem(RECENT_INDEX_KEY, ...staleMembers);
  }
}

export async function removeRecentAuditByHostname(
  hostname: string,
): Promise<boolean> {
  const hostKey = normalizeHostname(hostname);

  if (isRedisConfigured()) {
    await migrateLegacyRecentListIfNeeded();
    const redis = getRedis();
    const removedFromHash = await redis.hdel(DOMAINS_HASH_KEY, hostKey);
    await redis.zrem(RECENT_INDEX_KEY, hostKey);

    if (removedFromHash === 0) {
      return false;
    }

    await decrementUniqueMerchantCount();
    return true;
  }

  const existing = dedupeRecentScans(memoryRecentScans);
  const filtered = existing.filter(
    (item) => normalizeHostname(item.hostname) !== hostKey,
  );

  if (filtered.length === existing.length) {
    return false;
  }

  memoryRecentScans = filtered;
  await decrementUniqueMerchantCount();
  return true;
}

async function decrementUniqueMerchantCount(): Promise<void> {
  if (isRedisConfigured()) {
    const redis = getRedis();
    const current = Number((await redis.get<number>(TOTAL_KEY)) ?? 0);

    if (current > 0) {
      await redis.decr(TOTAL_KEY);
    }

    return;
  }

  if (memoryTotalScans > 0) {
    memoryTotalScans -= 1;
  }
}

export function shouldRecordCompletedScan(audit: AuditApiResponse): boolean {
  return audit.cacheStatus !== "HIT";
}

export async function updateRecentScanPlatform(
  domainInput: string,
  platform: string,
): Promise<boolean> {
  const hostKey = normalizeDomainFromUrl(
    domainInput.includes("://") ? domainInput : `https://${domainInput}/`,
  );

  try {
    if (isRedisConfigured()) {
      await migrateLegacyRecentListIfNeeded();
      const redis = getRedis();
      const raw = await redis.hget(DOMAINS_HASH_KEY, hostKey);

      if (!raw) {
        return false;
      }

      const record = parseRecentScanEntry(raw);

      if (!record) {
        return false;
      }

      await redis.hset(DOMAINS_HASH_KEY, {
        [hostKey]: JSON.stringify({ ...record, platform }),
      });
      return true;
    }

    const existing = dedupeRecentScans(memoryRecentScans);
    const index = existing.findIndex(
      (item) => normalizeHostname(item.hostname) === hostKey,
    );

    if (index === -1) {
      return false;
    }

    const next = [...existing];
    next[index] = { ...next[index], platform };
    memoryRecentScans = next;
    return true;
  } catch (error) {
    console.error("[scan-activity] platform update failed:", error);
    return false;
  }
}

export async function recordCompletedScan(
  audit: AuditApiResponse & {
    auditMetadata?: AuditReportMetadata;
    reportId?: string;
    shareUrl?: string;
  },
): Promise<RecentScanRecord | null> {
  if (!shouldRecordCompletedScan(audit)) {
    return null;
  }

  const record = createScanRecord(audit, audit.auditMetadata?.merchantName, {
    reportId: audit.reportId,
    shareUrl: audit.shareUrl,
  });

  try {
    const existing = await getAllStoredScanRecords();
    const isNewHostname = !hostnameExistsInRecent(record.hostname, existing);

    if (isRedisConfigured()) {
      const redis = getRedis();
      await upsertRecentScanInRedis(record);

      if (isNewHostname) {
        await redis.incr(TOTAL_KEY);
      }

      await recordBenchmarkSample(audit);

      return record;
    }

    upsertRecentScanInMemory(record);

    if (isNewHostname) {
      memoryTotalScans += 1;
    }

    await recordBenchmarkSample(audit);

    return record;
  } catch (error) {
    console.error("[scan-activity] record failed:", error);
    return null;
  }
}

function buildScanActivityResponse(
  totalScans: number,
  allRecent: RecentScanRecord[],
  limit: number,
): ScanActivityResponse {
  const deduped = dedupeRecentScans(allRecent);

  return {
    totalScans,
    recentScans: deduped.slice(0, limit),
    platformStats: computePlatformLeaderboard(deduped),
  };
}

export async function getScanActivity(
  limit = 5,
): Promise<ScanActivityResponse> {
  const safeLimit = Math.min(
    Math.max(limit, 1),
    RECENT_SCANS_API_MAX_LIMIT,
  );

  try {
    await compactRecentScansInRedis();
    const allRecent = await getAllStoredScanRecords();

    if (isRedisConfigured()) {
      const redis = getRedis();
      const totalRaw = await redis.get<number>(TOTAL_KEY);
      const indexedTotal = await redis.zcard(RECENT_INDEX_KEY);
      const totalScans = Math.max(
        Number(totalRaw ?? 0),
        indexedTotal ?? 0,
        allRecent.length,
      );

      return buildScanActivityResponse(totalScans, allRecent, safeLimit);
    }

    return buildScanActivityResponse(memoryTotalScans, allRecent, safeLimit);
  } catch (error) {
    console.error("[scan-activity] read failed:", error);
  }

  return buildScanActivityResponse(
    memoryTotalScans,
    dedupeRecentScans(memoryRecentScans),
    safeLimit,
  );
}

import type { AuditApiResponse } from "./types";
import { getRegistrableDomain } from "./domains";
import { getRedis, isRedisConfigured } from "./redis";

export interface RecentScanRecord {
  id: string;
  url: string;
  hostname: string;
  merchant: string;
  platform: string;
  confidence: string;
  scannedAt: string;
  cacheStatus: string;
  summary: string;
}

export interface ScanActivityResponse {
  totalScans: number;
  recentScans: RecentScanRecord[];
}

const TOTAL_KEY = "aco:scan:total";
const RECENT_KEY = "aco:scan:recent";
const MAX_RECENT = 100;

let memoryTotalScans = 0;
let memoryRecentScans: RecentScanRecord[] = [];

function normalizeHostname(hostname: string): string {
  return getRegistrableDomain(hostname);
}

async function getExistingRecentScans(): Promise<RecentScanRecord[]> {
  if (isRedisConfigured()) {
    const redis = getRedis();
    const recentRaw = await redis.lrange(RECENT_KEY, 0, MAX_RECENT - 1);
    return dedupeRecentScans(parseRecentScanList(recentRaw ?? []));
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
  return {
    ...record,
    id: normalizeHostname(record.hostname),
  };
}

/** Collapse legacy duplicate rows (same hostname or repeated timestamp ids). */
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

export function extractMerchantName(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    const label = hostname.split(".")[0] ?? hostname;

    if (!label) {
      return hostname;
    }

    return label.charAt(0).toUpperCase() + label.slice(1);
  } catch {
    return url;
  }
}

export function buildAuditSummary(audit: AuditApiResponse): string {
  const { detected, missing, needsReview } = audit.grouped;

  return `${detected.length} detected · ${missing.length} missing · ${needsReview.length} needs review`;
}

export function createScanRecord(audit: AuditApiResponse): RecentScanRecord {
  const hostname = new URL(audit.url).hostname;

  return {
    id: normalizeHostname(hostname),
    url: audit.url,
    hostname,
    merchant: extractMerchantName(audit.url),
    platform: audit.platform.platform,
    confidence: audit.platform.confidence,
    scannedAt: audit.crawledAt,
    cacheStatus: audit.cacheStatus,
    summary: buildAuditSummary(audit),
  };
}

function upsertRecentScanInMemory(record: RecentScanRecord): void {
  memoryRecentScans = dedupeRecentScans([
    record,
    ...memoryRecentScans.filter(
      (item) =>
        normalizeHostname(item.hostname) !== normalizeHostname(record.hostname),
    ),
  ]).slice(0, MAX_RECENT);
}

async function replaceRecentScanList(records: RecentScanRecord[]): Promise<void> {
  const redis = getRedis();
  await redis.del(RECENT_KEY);

  if (records.length === 0) {
    return;
  }

  await redis.lpush(
    RECENT_KEY,
    ...records.toReversed().map((record) => JSON.stringify(record)),
  );
}

export async function compactRecentScansInRedis(): Promise<void> {
  if (!isRedisConfigured()) {
    memoryRecentScans = dedupeRecentScans(memoryRecentScans).slice(0, MAX_RECENT);
    return;
  }

  const redis = getRedis();
  const recentRaw = await redis.lrange(RECENT_KEY, 0, MAX_RECENT - 1);
  const parsed = parseRecentScanList(recentRaw ?? []);
  const deduped = dedupeRecentScans(parsed);

  if (deduped.length !== parsed.length) {
    await replaceRecentScanList(deduped);
  }
}

export async function removeRecentAuditByHostname(
  hostname: string,
): Promise<boolean> {
  const hostKey = normalizeHostname(hostname);
  const existing = await getExistingRecentScans();
  const filtered = existing.filter(
    (item) => normalizeHostname(item.hostname) !== hostKey,
  );

  if (filtered.length === existing.length) {
    return false;
  }

  if (isRedisConfigured()) {
    await replaceRecentScanList(filtered);
  } else {
    memoryRecentScans = filtered;
  }

  return true;
}

async function upsertRecentScanInRedis(record: RecentScanRecord): Promise<void> {
  const redis = getRedis();
  const recentRaw = await redis.lrange(RECENT_KEY, 0, MAX_RECENT - 1);
  const existing = dedupeRecentScans(parseRecentScanList(recentRaw ?? []));
  const next = dedupeRecentScans([
    record,
    ...existing.filter(
      (item) =>
        normalizeHostname(item.hostname) !== normalizeHostname(record.hostname),
    ),
  ]).slice(0, MAX_RECENT);

  await replaceRecentScanList(next);
}

export function shouldRecordCompletedScan(audit: AuditApiResponse): boolean {
  return audit.cacheStatus !== "HIT";
}

export async function recordCompletedScan(
  audit: AuditApiResponse,
): Promise<RecentScanRecord | null> {
  if (!shouldRecordCompletedScan(audit)) {
    return null;
  }

  const record = createScanRecord(audit);

  try {
    const existing = await getExistingRecentScans();
    const isNewHostname = !hostnameExistsInRecent(record.hostname, existing);

    if (isRedisConfigured()) {
      const redis = getRedis();
      await upsertRecentScanInRedis(record);

      if (isNewHostname) {
        await redis.incr(TOTAL_KEY);
      }

      return record;
    }

    upsertRecentScanInMemory(record);

    if (isNewHostname) {
      memoryTotalScans += 1;
    }

    return record;
  } catch (error) {
    console.error("[scan-activity] record failed:", error);
    return null;
  }
}

export async function getScanActivity(
  limit = 5,
): Promise<ScanActivityResponse> {
  const safeLimit = Math.min(Math.max(limit, 1), MAX_RECENT);

  try {
    await compactRecentScansInRedis();

    if (isRedisConfigured()) {
      const redis = getRedis();
      const [totalRaw, recentRaw] = await Promise.all([
        redis.get<number>(TOTAL_KEY),
        redis.lrange(RECENT_KEY, 0, MAX_RECENT - 1),
      ]);

      return {
        totalScans: Number(totalRaw ?? 0),
        recentScans: dedupeRecentScans(parseRecentScanList(recentRaw ?? [])).slice(
          0,
          safeLimit,
        ),
      };
    }
  } catch (error) {
    console.error("[scan-activity] read failed:", error);
  }

  return {
    totalScans: memoryTotalScans,
    recentScans: dedupeRecentScans(memoryRecentScans).slice(0, safeLimit),
  };
}

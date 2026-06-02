import type { AuditApiResponse } from "./types";
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
    id: `${hostname}-${audit.crawledAt}`,
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

export async function recordCompletedScan(
  audit: AuditApiResponse,
): Promise<RecentScanRecord> {
  const record = createScanRecord(audit);

  if (isRedisConfigured()) {
    const redis = getRedis();
    await redis.incr(TOTAL_KEY);
    await redis.lpush(RECENT_KEY, JSON.stringify(record));
    await redis.ltrim(RECENT_KEY, 0, MAX_RECENT - 1);
    return record;
  }

  memoryTotalScans += 1;
  memoryRecentScans = [
    record,
    ...memoryRecentScans.filter((item) => item.id !== record.id),
  ].slice(0, MAX_RECENT);

  return record;
}

export async function getScanActivity(
  limit = 5,
): Promise<ScanActivityResponse> {
  const safeLimit = Math.min(Math.max(limit, 1), MAX_RECENT);

  if (isRedisConfigured()) {
    const redis = getRedis();
    const [totalRaw, recentRaw] = await Promise.all([
      redis.get<number>(TOTAL_KEY),
      redis.lrange(RECENT_KEY, 0, safeLimit - 1),
    ]);

    const recentScans = (recentRaw ?? [])
      .map((entry) => {
        if (typeof entry === "string") {
          return JSON.parse(entry) as RecentScanRecord;
        }

        if (entry && typeof entry === "object") {
          return entry as RecentScanRecord;
        }

        return null;
      })
      .filter((entry): entry is RecentScanRecord => Boolean(entry));

    return {
      totalScans: Number(totalRaw ?? 0),
      recentScans,
    };
  }

  return {
    totalScans: memoryTotalScans,
    recentScans: memoryRecentScans.slice(0, safeLimit),
  };
}

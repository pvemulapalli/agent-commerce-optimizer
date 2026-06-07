import { randomBytes } from "crypto";
import { getCacheKey, normalizeAuditUrl } from "./cache";
import { getRegistrableDomain } from "./domains";
import type { EnrichedAuditResponse } from "./enrich-audit-response";
import { getRedis, isRedisConfigured } from "./redis";
import type { GenerateFixesApiResponse } from "./types";

export const REDIS_REPORT_PREFIX = "aco:report:";

export interface ShareableReportRecord {
  reportId: string;
  domain: string;
  auditId: string;
  createdAt: string;
  auditedUrl: string;
  result: EnrichedAuditResponse;
  fixes: GenerateFixesApiResponse | null;
}

function getReportRedisKey(reportId: string): string {
  return `${REDIS_REPORT_PREFIX}${reportId}`;
}

function generateReportId(): string {
  return randomBytes(9).toString("base64url");
}

function parseReportRecord(raw: unknown): ShareableReportRecord | null {
  if (!raw) {
    return null;
  }

  let parsed: unknown = raw;

  if (typeof raw === "string") {
    parsed = JSON.parse(raw) as unknown;
  }

  if (!parsed || typeof parsed !== "object") {
    return null;
  }

  const record = parsed as ShareableReportRecord;

  if (
    typeof record.reportId !== "string" ||
    typeof record.domain !== "string" ||
    typeof record.auditId !== "string" ||
    typeof record.createdAt !== "string" ||
    typeof record.auditedUrl !== "string" ||
    !record.result
  ) {
    return null;
  }

  return record;
}

export async function getShareableReport(
  reportId: string,
): Promise<ShareableReportRecord | null> {
  if (!isRedisConfigured()) {
    return null;
  }

  try {
    const redis = getRedis();
    const raw = await redis.get(getReportRedisKey(reportId));
    return parseReportRecord(raw);
  } catch (error) {
    console.error("[shareable-reports] read failed:", error);
    return null;
  }
}

export async function ensureShareableReport(
  result: EnrichedAuditResponse,
): Promise<{ reportId: string; shareUrl: string } | null> {
  if (!isRedisConfigured()) {
    return null;
  }

  const normalizedUrl = normalizeAuditUrl(result.url);
  const auditId = getCacheKey(normalizedUrl);
  const domain = getRegistrableDomain(new URL(normalizedUrl).hostname);

  try {
    const redis = getRedis();
    const existingKeys = await redis.keys(`${REDIS_REPORT_PREFIX}*`);

    for (const key of existingKeys) {
      const raw = await redis.get(key);
      const record = parseReportRecord(raw);

      if (record?.auditId === auditId && record.auditedUrl === normalizedUrl) {
        return {
          reportId: record.reportId,
          shareUrl: `/report/${record.reportId}`,
        };
      }
    }

    const reportId = generateReportId();
    const record: ShareableReportRecord = {
      reportId,
      domain,
      auditId,
      createdAt: new Date().toISOString(),
      auditedUrl: normalizedUrl,
      result,
      fixes: null,
    };

    await redis.set(getReportRedisKey(reportId), JSON.stringify(record));

    return {
      reportId,
      shareUrl: `/report/${reportId}`,
    };
  } catch (error) {
    console.error("[shareable-reports] create failed:", error);
    return null;
  }
}

export async function updateShareableReportFixes(
  reportId: string,
  fixes: GenerateFixesApiResponse,
): Promise<void> {
  if (!isRedisConfigured()) {
    return;
  }

  try {
    const record = await getShareableReport(reportId);

    if (!record) {
      return;
    }

    const redis = getRedis();
    await redis.set(
      getReportRedisKey(reportId),
      JSON.stringify({
        ...record,
        fixes,
      }),
    );
  } catch (error) {
    console.error("[shareable-reports] update fixes failed:", error);
  }
}

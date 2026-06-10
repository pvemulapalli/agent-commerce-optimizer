import { randomBytes, timingSafeEqual } from "crypto";
import { getCacheKey, normalizeAuditUrl } from "./cache";
import { getRegistrableDomain } from "./domains";
import type { EnrichedAuditResponse } from "./enrich-audit-response";
import { buildShareReportPath } from "./share-report-url";
import { getRedis, isRedisConfigured } from "./redis";
import type { GenerateFixesApiResponse } from "./types";

export const REDIS_REPORT_PREFIX = "aco:report:";
export const REDIS_REPORT_AUDIT_PREFIX = "aco:report:audit:";

export interface ShareableReportRecord {
  reportId: string;
  domain: string;
  auditId: string;
  createdAt: string;
  auditedUrl: string;
  result: EnrichedAuditResponse;
  fixes: GenerateFixesApiResponse | null;
  accessKey?: string;
}

function getReportRedisKey(reportId: string): string {
  return `${REDIS_REPORT_PREFIX}${reportId}`;
}

function getAuditReportIndexKey(auditId: string): string {
  return `${REDIS_REPORT_AUDIT_PREFIX}${auditId}`;
}

function generateReportId(): string {
  return randomBytes(16).toString("base64url");
}

export function generateReportAccessKey(): string {
  return randomBytes(16).toString("base64url");
}

export function isValidReportId(reportId: string): boolean {
  return /^[A-Za-z0-9_-]{12,64}$/.test(reportId);
}

export function reportAccessKeysMatch(
  provided: string | null | undefined,
  expected: string | null | undefined,
): boolean {
  if (!provided || !expected) {
    return false;
  }

  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);

  if (providedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(providedBuffer, expectedBuffer);
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

export async function getShareableReportForDomainAccess(input: {
  domainOrUrl: string;
  accessKey: string | null;
}): Promise<ShareableReportRecord | null> {
  const { getLatestDomainScanIndex } = await import("./domain-scan-index");
  const index = await getLatestDomainScanIndex(input.domainOrUrl);

  if (!index?.reportId || !reportAccessKeysMatch(input.accessKey, index.accessKey)) {
    return null;
  }

  return getShareableReport(index.reportId);
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
    const existingReportId = await redis.get<string>(getAuditReportIndexKey(auditId));

    if (existingReportId) {
      const existing = await getShareableReport(existingReportId);
      if (existing?.auditedUrl === normalizedUrl) {
        return {
          reportId: existing.reportId,
          shareUrl: buildShareReportPath(existing.reportId),
        };
      }
    }

    const reportId = generateReportId();
    const accessKey = generateReportAccessKey();
    const record: ShareableReportRecord = {
      reportId,
      domain,
      auditId,
      createdAt: new Date().toISOString(),
      auditedUrl: normalizedUrl,
      result,
      fixes: null,
      accessKey,
    };

    await redis.set(getReportRedisKey(reportId), JSON.stringify(record));
    await redis.set(getAuditReportIndexKey(auditId), reportId);

    const { updateDomainScanIndex } = await import("./domain-scan-index");
    await updateDomainScanIndex({ audit: result, reportId, accessKey });

    return {
      reportId,
      shareUrl: buildShareReportPath(reportId),
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

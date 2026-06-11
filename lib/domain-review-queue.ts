import { normalizeHostname, parseBannedDomainsFromEnv } from "./banned-domains";
import { normalizeAuditUrl } from "./audit-url";
import {
  DOMAIN_REVIEW_BLOCKED_SCAN_STATUS,
  getDomainReviewBlockedTitle,
  getDomainReviewUserMessage,
} from "./domain-review-messages";
import type {
  DomainReviewRecord,
  DomainReviewSource,
  DomainReviewStatus,
  DomainReviewType,
} from "./domain-review-types";
import { shouldBlockDomainReviewScan } from "./domain-review-scan-block";
import { getRedis, isRedisConfigured } from "./redis";

export { shouldBlockDomainReviewScan } from "./domain-review-scan-block";

export const REDIS_DOMAIN_REVIEW_QUEUE_KEY = "aco:admin:domain-review-queue";
export const LEGACY_NON_ECOMMERCE_DOMAINS_KEY = "aco:admin:non-ecommerce-domains";
export const LEGACY_BANNED_DOMAINS_KEY = "aco:admin:banned-domains";

export type {
  DomainReviewRecord,
  DomainReviewSource,
  DomainReviewStatus,
  DomainReviewType,
} from "./domain-review-types";

export {
  DOMAIN_REVIEW_TYPES,
  DOMAIN_REVIEW_STATUSES,
} from "./domain-review-types";

function parseStoredRecords(raw: unknown): DomainReviewRecord[] | null {
  if (!raw) {
    return null;
  }

  let parsed: unknown = raw;

  if (typeof raw === "string") {
    parsed = JSON.parse(raw) as unknown;
  }

  if (!Array.isArray(parsed)) {
    return null;
  }

  return parsed
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }

      const record = entry as Record<string, unknown>;
      const domain = normalizeDomainReviewInput(String(record.domain ?? ""));

      if (!domain) {
        return null;
      }

      const type = String(record.type ?? "UNKNOWN") as DomainReviewType;
      const status = String(record.status ?? "PENDING") as DomainReviewStatus;

      return {
        domain,
        type,
        status,
        reason: String(record.reason ?? "unknown"),
        firstSeenAt: String(record.firstSeenAt ?? new Date().toISOString()),
        lastSeenAt: String(record.lastSeenAt ?? record.firstSeenAt ?? new Date().toISOString()),
        retryAfter:
          record.retryAfter === null || record.retryAfter === undefined
            ? null
            : String(record.retryAfter),
        notes:
          record.notes === null || record.notes === undefined
            ? null
            : String(record.notes),
        reviewedBy:
          record.reviewedBy === null || record.reviewedBy === undefined
            ? null
            : String(record.reviewedBy),
        source: (record.source ?? "auto_scan") as DomainReviewSource,
      } satisfies DomainReviewRecord;
    })
    .filter((entry): entry is DomainReviewRecord => Boolean(entry));
}

function dedupeRecords(records: DomainReviewRecord[]): DomainReviewRecord[] {
  const byDomain = new Map<string, DomainReviewRecord>();

  for (const record of records) {
    const existing = byDomain.get(record.domain);

    if (!existing) {
      byDomain.set(record.domain, record);
      continue;
    }

    byDomain.set(record.domain, {
      ...existing,
      ...record,
      firstSeenAt:
        Date.parse(existing.firstSeenAt) <= Date.parse(record.firstSeenAt)
          ? existing.firstSeenAt
          : record.firstSeenAt,
      lastSeenAt:
        Date.parse(existing.lastSeenAt) >= Date.parse(record.lastSeenAt)
          ? existing.lastSeenAt
          : record.lastSeenAt,
      notes: record.notes ?? existing.notes,
      reviewedBy: record.reviewedBy ?? existing.reviewedBy,
    });
  }

  return [...byDomain.values()];
}

function isLegacyReviewed(entry: Record<string, unknown>): boolean {
  const reviewed = entry.reviewed;

  if (typeof reviewed === "boolean") {
    return reviewed;
  }

  if (typeof reviewed === "string") {
    const normalized = reviewed.trim().toLowerCase();
    return normalized === "true" || normalized.startsWith("yes");
  }

  return false;
}

function parseLegacyNonEcommerceRecords(raw: unknown): Array<Record<string, unknown>> {
  if (!raw) {
    return [];
  }

  let parsed: unknown = raw;

  if (typeof raw === "string") {
    parsed = JSON.parse(raw) as unknown;
  }

  return Array.isArray(parsed) ? (parsed as Array<Record<string, unknown>>) : [];
}

async function mergeLegacyNonEcommerceRecords(
  existing: DomainReviewRecord[],
): Promise<DomainReviewRecord[]> {
  if (!isRedisConfigured()) {
    return existing;
  }

  const redis = getRedis();
  const legacyRaw = await redis.get(LEGACY_NON_ECOMMERCE_DOMAINS_KEY);
  const legacyParsed = parseLegacyNonEcommerceRecords(legacyRaw);

  if (legacyParsed.length === 0) {
    return existing;
  }

  const existingDomains = new Set(existing.map((record) => record.domain));
  const migratedRecords: DomainReviewRecord[] = [];

  for (const entry of legacyParsed) {
    const domain = normalizeDomainReviewInput(String(entry.domain ?? ""));

    if (!domain || existingDomains.has(domain)) {
      continue;
    }

    migratedRecords.push({
      domain,
      type: "NON_ECOMMERCE",
      status: isLegacyReviewed(entry) ? "APPROVED" : "PENDING",
      reason: String(entry.reason ?? "non_ecommerce"),
      firstSeenAt: String(entry.firstDetectedAt ?? new Date().toISOString()),
      lastSeenAt: String(entry.firstDetectedAt ?? new Date().toISOString()),
      retryAfter: null,
      notes:
        entry.notes === null || entry.notes === undefined ? null : String(entry.notes),
      reviewedBy:
        entry.reviewedBy === null || entry.reviewedBy === undefined
          ? null
          : String(entry.reviewedBy),
      source: "migration",
    });
    existingDomains.add(domain);
  }

  if (migratedRecords.length === 0) {
    return existing;
  }

  const merged = dedupeRecords([...existing, ...migratedRecords]);
  await redis.set(REDIS_DOMAIN_REVIEW_QUEUE_KEY, JSON.stringify(merged));
  return merged;
}

function parseLegacyBannedDomains(raw: unknown): string[] {
  if (!raw) {
    return [];
  }

  let parsed: unknown = raw;

  if (typeof raw === "string") {
    parsed = JSON.parse(raw) as unknown;
  }

  if (!Array.isArray(parsed)) {
    return [];
  }

  return [...new Set(parsed.map(String).map(normalizeDomainReviewInput).filter(Boolean))];
}

async function readLegacyBannedDomainList(): Promise<string[]> {
  const fromEnv = parseBannedDomainsFromEnv();

  if (!isRedisConfigured()) {
    return fromEnv;
  }

  try {
    const redis = getRedis();
    const raw = await redis.get(LEGACY_BANNED_DOMAINS_KEY);
    const fromRedis = parseLegacyBannedDomains(raw);
    return fromRedis.length > 0 ? fromRedis : fromEnv;
  } catch {
    return fromEnv;
  }
}

async function mergeBannedDomainsIntoQueue(
  existing: DomainReviewRecord[],
): Promise<DomainReviewRecord[]> {
  const bannedDomains = await readLegacyBannedDomainList();

  if (bannedDomains.length === 0) {
    return existing;
  }

  const existingDomains = new Set(existing.map((record) => record.domain));
  const migratedRecords: DomainReviewRecord[] = [];
  const now = new Date().toISOString();

  for (const domain of bannedDomains) {
    if (!domain || existingDomains.has(domain)) {
      continue;
    }

    migratedRecords.push({
      domain,
      type: "MANUAL_BLOCK",
      status: "APPROVED",
      reason: "manual_block",
      firstSeenAt: now,
      lastSeenAt: now,
      retryAfter: null,
      notes: null,
      reviewedBy: "admin",
      source: "migration",
    });
    existingDomains.add(domain);
  }

  if (migratedRecords.length === 0) {
    return existing;
  }

  if (!isRedisConfigured()) {
    return dedupeRecords([...existing, ...migratedRecords]);
  }

  const redis = getRedis();
  const merged = dedupeRecords([...existing, ...migratedRecords]);
  await redis.set(REDIS_DOMAIN_REVIEW_QUEUE_KEY, JSON.stringify(merged));

  const remainingBanned = bannedDomains.filter(
    (domain) => !migratedRecords.some((record) => record.domain === domain),
  );
  await redis.set(LEGACY_BANNED_DOMAINS_KEY, JSON.stringify(remainingBanned));

  return merged;
}

async function mergeLegacySources(existing: DomainReviewRecord[]): Promise<DomainReviewRecord[]> {
  const afterNonEcommerce = await mergeLegacyNonEcommerceRecords(existing);
  return mergeBannedDomainsIntoQueue(afterNonEcommerce);
}

async function readRecords(): Promise<DomainReviewRecord[]> {
  if (!isRedisConfigured()) {
    return [];
  }

  try {
    const redis = getRedis();
    const raw = await redis.get(REDIS_DOMAIN_REVIEW_QUEUE_KEY);
    const existing = dedupeRecords(parseStoredRecords(raw) ?? []);
    return mergeLegacySources(existing);
  } catch (error) {
    console.error("[domain-review-queue] read failed:", error);
    return [];
  }
}

async function writeRecords(records: DomainReviewRecord[]): Promise<void> {
  if (!isRedisConfigured()) {
    throw new Error("Redis is not configured. Domain Review Queue requires Redis.");
  }

  const redis = getRedis();
  await redis.set(REDIS_DOMAIN_REVIEW_QUEUE_KEY, JSON.stringify(records));
}

export function normalizeDomainReviewInput(input: string): string {
  const trimmed = input.trim();

  if (!trimmed) {
    return "";
  }

  try {
    if (trimmed.includes("://")) {
      return normalizeHostname(new URL(trimmed).hostname);
    }
  } catch {
    // fall through
  }

  return normalizeHostname(trimmed);
}

export async function getDomainReviewQueue(search?: string): Promise<DomainReviewRecord[]> {
  const records = await readRecords();

  const filtered = !search?.trim()
    ? records
    : records.filter((record) => {
        const query = search.trim().toLowerCase();
        return (
          record.domain.includes(query) ||
          record.type.toLowerCase().includes(query) ||
          record.status.toLowerCase().includes(query) ||
          record.reason.toLowerCase().includes(query) ||
          (record.notes?.toLowerCase().includes(query) ?? false)
        );
      });

  return filtered.sort(
    (left, right) => Date.parse(right.lastSeenAt) - Date.parse(left.lastSeenAt),
  );
}

export async function getDomainReviewRecord(
  domain: string,
): Promise<DomainReviewRecord | undefined> {
  const normalized = normalizeDomainReviewInput(domain);
  return (await readRecords()).find((record) => record.domain === normalized);
}

export async function getDomainReviewRecordForUrl(
  url: string,
): Promise<DomainReviewRecord | undefined> {
  try {
    const hostname = new URL(normalizeAuditUrl(url)).hostname;
    const normalized = normalizeDomainReviewInput(hostname);
    return (await readRecords()).find((record) => {
      return record.domain === normalized || normalized.endsWith(`.${record.domain}`);
    });
  } catch {
    return undefined;
  }
}

export async function evaluateDomainReviewBlock(
  url: string,
): Promise<DomainReviewRecord | null> {
  const record = await getDomainReviewRecordForUrl(url);

  if (!record) {
    return null;
  }

  return shouldBlockDomainReviewScan(record) ? record : null;
}

export async function upsertDomainReviewRecord(input: {
  domain: string;
  type: DomainReviewType;
  reason: string;
  source?: DomainReviewSource;
  status?: DomainReviewStatus;
  retryAfter?: string | null;
  notes?: string | null;
}): Promise<DomainReviewRecord> {
  const domain = normalizeDomainReviewInput(input.domain);
  const now = new Date().toISOString();
  const records = await readRecords();
  const existing = records.find((record) => record.domain === domain);
  const retryAfter = input.retryAfter ?? null;

  if (existing) {
    const updated: DomainReviewRecord = {
      ...existing,
      type: input.type,
      reason: input.reason.trim() || existing.reason,
      lastSeenAt: now,
      retryAfter,
      notes: input.notes ?? existing.notes,
      source: input.source ?? existing.source,
      status:
        existing.status === "WHITELISTED" && input.source !== "auto_scan"
          ? existing.status
          : input.source === "auto_scan"
            ? "APPROVED"
            : (input.status ?? existing.status),
    };

    await writeRecords(
      dedupeRecords(records.map((record) => (record.domain === domain ? updated : record))),
    );
    return updated;
  }

  const record: DomainReviewRecord = {
    domain,
    type: input.type,
    status: input.status ?? "APPROVED",
    reason: input.reason.trim() || input.type.toLowerCase(),
    firstSeenAt: now,
    lastSeenAt: now,
    retryAfter,
    notes: input.notes ?? null,
    reviewedBy: null,
    source: input.source ?? "auto_scan",
  };

  await writeRecords(dedupeRecords([record, ...records]));
  return record;
}

export async function recordDomainReviewFailure(input: {
  url: string;
  type: DomainReviewType;
  reason: string;
}): Promise<DomainReviewRecord | null> {
  if (!isRedisConfigured()) {
    return null;
  }

  try {
    return await upsertDomainReviewRecord({
      domain: input.url,
      type: input.type,
      reason: input.reason,
      source: "auto_scan",
    });
  } catch (error) {
    console.error("[domain-review-queue] record failure failed:", error);
    return null;
  }
}

export async function updateDomainReviewStatus(input: {
  domain: string;
  status: DomainReviewStatus;
  reviewedBy?: string;
  notes?: string | null;
}): Promise<DomainReviewRecord | null> {
  const normalized = normalizeDomainReviewInput(input.domain);
  const records = await readRecords();
  let updated: DomainReviewRecord | null = null;

  const next = records.map((record) => {
    if (record.domain !== normalized) {
      return record;
    }

    updated = {
      ...record,
      status: input.status,
      reviewedBy: input.reviewedBy?.trim() || record.reviewedBy,
      notes: input.notes !== undefined ? input.notes : record.notes,
      lastSeenAt: new Date().toISOString(),
    };
    return updated;
  });

  if (!updated) {
    return null;
  }

  await writeRecords(next);
  return updated;
}

export async function reclassifyDomainReview(input: {
  domain: string;
  type: DomainReviewType;
  reviewedBy?: string;
  retryAfter?: string | null;
}): Promise<DomainReviewRecord | null> {
  const normalized = normalizeDomainReviewInput(input.domain);
  const records = await readRecords();
  let updated: DomainReviewRecord | null = null;

  const next = records.map((record) => {
    if (record.domain !== normalized) {
      return record;
    }

    updated = {
      ...record,
      type: input.type,
      retryAfter: input.retryAfter ?? null,
      reviewedBy: input.reviewedBy?.trim() || record.reviewedBy,
      lastSeenAt: new Date().toISOString(),
    };
    return updated;
  });

  if (!updated) {
    return null;
  }

  await writeRecords(next);
  return updated;
}

export async function updateDomainReviewNotes(input: {
  domain: string;
  notes: string | null;
}): Promise<DomainReviewRecord | null> {
  const normalized = normalizeDomainReviewInput(input.domain);
  const records = await readRecords();
  let updated: DomainReviewRecord | null = null;

  const next = records.map((record) => {
    if (record.domain !== normalized) {
      return record;
    }

    updated = {
      ...record,
      notes: input.notes?.trim() || null,
      lastSeenAt: new Date().toISOString(),
    };
    return updated;
  });

  if (!updated) {
    return null;
  }

  await writeRecords(next);
  return updated;
}

export async function updateDomainReviewRetryAfter(input: {
  domain: string;
  retryAfter: string | null;
}): Promise<DomainReviewRecord | null> {
  const normalized = normalizeDomainReviewInput(input.domain);
  const records = await readRecords();
  let updated: DomainReviewRecord | null = null;

  const next = records.map((record) => {
    if (record.domain !== normalized) {
      return record;
    }

    updated = {
      ...record,
      retryAfter: input.retryAfter,
      lastSeenAt: new Date().toISOString(),
    };
    return updated;
  });

  if (!updated) {
    return null;
  }

  await writeRecords(next);
  return updated;
}

export async function retryDomainReviewNow(domain: string): Promise<DomainReviewRecord | null> {
  return updateDomainReviewStatus({
    domain,
    status: "WHITELISTED",
    reviewedBy: "admin",
  });
}

export async function removeDomainReviewRecord(domain: string): Promise<boolean> {
  const normalized = normalizeDomainReviewInput(domain);
  const records = await readRecords();
  const next = records.filter((record) => record.domain !== normalized);

  if (next.length === records.length) {
    return false;
  }

  await writeRecords(next);
  return true;
}

export function createDomainReviewBlockedResponse(record: DomainReviewRecord): Response {
  return new Response(
    JSON.stringify({
      scanStatus: DOMAIN_REVIEW_BLOCKED_SCAN_STATUS,
      title: getDomainReviewBlockedTitle(record),
      message: getDomainReviewUserMessage(record),
      reviewType: record.type,
      reviewStatus: record.status,
      retryAfter: record.retryAfter,
    }),
    {
      status: 422,
      headers: { "Content-Type": "application/json" },
    },
  );
}

export async function isQuarantinedNonEcommerceDomain(hostname: string): Promise<boolean> {
  const record = await getDomainReviewRecord(hostname);
  if (!record || record.type !== "NON_ECOMMERCE") {
    return false;
  }
  return shouldBlockDomainReviewScan(record);
}

export async function isQuarantinedNonEcommerceUrl(url: string): Promise<boolean> {
  const record = await evaluateDomainReviewBlock(url);
  return record?.type === "NON_ECOMMERCE";
}

export async function addNonEcommerceDomain(input: {
  domain: string;
  reason: string;
}): Promise<DomainReviewRecord> {
  return upsertDomainReviewRecord({
    domain: input.domain,
    type: "NON_ECOMMERCE",
    reason: input.reason,
    source: "auto_scan",
    status: "PENDING",
    retryAfter: null,
  });
}

export function createQuarantinedNonEcommerceResponse(): Response {
  return createDomainReviewBlockedResponse({
    domain: "",
    type: "NON_ECOMMERCE",
    status: "APPROVED",
    reason: "non_ecommerce",
    firstSeenAt: new Date().toISOString(),
    lastSeenAt: new Date().toISOString(),
    retryAfter: null,
    notes: null,
    reviewedBy: null,
    source: "migration",
  });
}

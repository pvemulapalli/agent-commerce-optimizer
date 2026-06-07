import { normalizeHostname } from "./banned-domains";
import { getRegistrableDomain } from "./domains";
import { normalizeAuditUrl } from "./audit-url";
import {
  QUARANTINED_NON_ECOMMERCE_MESSAGE,
  QUARANTINED_NON_ECOMMERCE_SCAN_STATUS,
} from "./non-ecommerce-quarantine-messages";
import { getRedis, isRedisConfigured } from "./redis";

export const REDIS_NON_ECOMMERCE_DOMAINS_KEY = "aco:admin:non-ecommerce-domains";

export interface NonEcommerceDomainRecord {
  domain: string;
  reason: string;
  firstDetectedAt: string;
  reviewed: boolean;
  reviewedBy: string | null;
  notes: string | null;
}

function parseStoredRecords(raw: unknown): NonEcommerceDomainRecord[] | null {
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
      const domain = normalizeHostname(String(record.domain ?? ""));

      if (!domain) {
        return null;
      }

      return {
        domain,
        reason: String(record.reason ?? "non_ecommerce"),
        firstDetectedAt: String(record.firstDetectedAt ?? new Date().toISOString()),
        reviewed: Boolean(record.reviewed),
        reviewedBy:
          record.reviewedBy === null || record.reviewedBy === undefined
            ? null
            : String(record.reviewedBy),
        notes:
          record.notes === null || record.notes === undefined
            ? null
            : String(record.notes),
      } satisfies NonEcommerceDomainRecord;
    })
    .filter((entry): entry is NonEcommerceDomainRecord => Boolean(entry));
}

async function readRecords(): Promise<NonEcommerceDomainRecord[]> {
  if (!isRedisConfigured()) {
    return [];
  }

  try {
    const redis = getRedis();
    const raw = await redis.get(REDIS_NON_ECOMMERCE_DOMAINS_KEY);
    return parseStoredRecords(raw) ?? [];
  } catch (error) {
    console.error("[non-ecommerce-domains] read failed:", error);
    return [];
  }
}

async function writeRecords(records: NonEcommerceDomainRecord[]): Promise<void> {
  if (!isRedisConfigured()) {
    throw new Error("Redis is not configured. Non-ecommerce domain quarantine requires Redis.");
  }

  const redis = getRedis();
  await redis.set(REDIS_NON_ECOMMERCE_DOMAINS_KEY, JSON.stringify(records));
}

export async function getNonEcommerceDomains(search?: string): Promise<NonEcommerceDomainRecord[]> {
  const records = await readRecords();

  if (!search?.trim()) {
    return records.sort(
      (left, right) =>
        new Date(right.firstDetectedAt).getTime() - new Date(left.firstDetectedAt).getTime(),
    );
  }

  const query = search.trim().toLowerCase();
  return records
    .filter(
      (record) =>
        record.domain.includes(query) ||
        record.reason.toLowerCase().includes(query) ||
        (record.notes?.toLowerCase().includes(query) ?? false),
    )
    .sort(
      (left, right) =>
        new Date(right.firstDetectedAt).getTime() - new Date(left.firstDetectedAt).getTime(),
    );
}

export async function getNonEcommerceDomain(
  domain: string,
): Promise<NonEcommerceDomainRecord | undefined> {
  const normalized = normalizeHostname(domain);
  return (await readRecords()).find((record) => record.domain === normalized);
}

export async function isQuarantinedNonEcommerceDomain(hostname: string): Promise<boolean> {
  const normalized = normalizeHostname(hostname);
  return (await readRecords()).some((record) => {
    return record.domain === normalized || normalized.endsWith(`.${record.domain}`);
  });
}

export async function isQuarantinedNonEcommerceUrl(url: string): Promise<boolean> {
  try {
    const hostname = new URL(normalizeAuditUrl(url)).hostname;
    return isQuarantinedNonEcommerceDomain(hostname);
  } catch {
    return false;
  }
}

export async function addNonEcommerceDomain(input: {
  domain: string;
  reason: string;
}): Promise<NonEcommerceDomainRecord> {
  const domain = normalizeHostname(input.domain);
  const records = await readRecords();
  const existing = records.find((record) => record.domain === domain);

  if (existing) {
    return existing;
  }

  const record: NonEcommerceDomainRecord = {
    domain,
    reason: input.reason.trim() || "non_ecommerce",
    firstDetectedAt: new Date().toISOString(),
    reviewed: false,
    reviewedBy: null,
    notes: null,
  };

  await writeRecords([record, ...records]);
  return record;
}

export async function removeNonEcommerceDomain(domain: string): Promise<boolean> {
  const normalized = normalizeHostname(domain);
  const records = await readRecords();
  const next = records.filter((record) => record.domain !== normalized);

  if (next.length === records.length) {
    return false;
  }

  await writeRecords(next);
  return true;
}

export async function approveNonEcommerceDomain(input: {
  domain: string;
  reviewedBy: string;
  notes?: string | null;
}): Promise<NonEcommerceDomainRecord | null> {
  const normalized = normalizeHostname(input.domain);
  const records = await readRecords();
  let updated: NonEcommerceDomainRecord | null = null;

  const next = records.map((record) => {
    if (record.domain !== normalized) {
      return record;
    }

    updated = {
      ...record,
      reviewed: true,
      reviewedBy: input.reviewedBy.trim() || "admin",
      notes: input.notes?.trim() || record.notes,
    };
    return updated;
  });

  if (!updated) {
    return null;
  }

  await writeRecords(next);
  return updated;
}

export async function updateNonEcommerceDomainNotes(input: {
  domain: string;
  notes: string | null;
}): Promise<NonEcommerceDomainRecord | null> {
  const normalized = normalizeHostname(input.domain);
  const records = await readRecords();
  let updated: NonEcommerceDomainRecord | null = null;

  const next = records.map((record) => {
    if (record.domain !== normalized) {
      return record;
    }

    updated = {
      ...record,
      notes: input.notes?.trim() || null,
    };
    return updated;
  });

  if (!updated) {
    return null;
  }

  await writeRecords(next);
  return updated;
}

export function createQuarantinedNonEcommerceResponse(): Response {
  return new Response(
    JSON.stringify({
      scanStatus: QUARANTINED_NON_ECOMMERCE_SCAN_STATUS,
      message: QUARANTINED_NON_ECOMMERCE_MESSAGE,
    }),
    {
      status: 422,
      headers: { "Content-Type": "application/json" },
    },
  );
}

export function normalizeNonEcommerceDomainInput(input: string): string {
  const trimmed = input.trim();

  if (!trimmed) {
    return "";
  }

  try {
    if (trimmed.includes("://")) {
      return getRegistrableDomain(new URL(trimmed).hostname.toLowerCase());
    }
  } catch {
    // fall through
  }

  return normalizeHostname(trimmed);
}

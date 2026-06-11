import { normalizeDomainFromUrl } from "./domain-normalization";
import { isValidSubscriberEmail } from "./email-subscribers";
import { getRedis, isRedisConfigured } from "./redis";
import type {
  StorefrontReviewRelationship,
  StorefrontReviewRequest,
  StorefrontReviewRequestStatus,
} from "./storefront-review-types";

export const REDIS_STOREFRONT_REVIEW_REQUESTS_KEY = "aco:storefront-review:requests";
export const REDIS_STOREFRONT_REVIEW_NOTIFICATION_INDEX_KEY =
  "aco:storefront-review:notification-index";

const MAX_REQUESTS = 5000;

let memoryRequests: StorefrontReviewRequest[] = [];
const memoryNotificationEmails = new Set<string>();

export type {
  StorefrontReviewRelationship,
  StorefrontReviewRequest,
  StorefrontReviewRequestStatus,
} from "./storefront-review-types";

export {
  STOREFRONT_REVIEW_RELATIONSHIPS,
  STOREFRONT_REVIEW_RELATIONSHIP_LABELS,
  STOREFRONT_REVIEW_STATUSES,
} from "./storefront-review-types";

function parseStoredRequests(raw: unknown): StorefrontReviewRequest[] | null {
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
      const id = String(record.id ?? "").trim();
      const normalizedDomain = String(record.normalizedDomain ?? "").trim();
      const email = String(record.email ?? "").trim().toLowerCase();

      if (!id || !normalizedDomain || !email) {
        return null;
      }

      return {
        id,
        domain: String(record.domain ?? normalizedDomain),
        normalizedDomain,
        email,
        companyName:
          record.companyName === null || record.companyName === undefined
            ? null
            : String(record.companyName),
        relationship: String(record.relationship ?? "OTHER") as StorefrontReviewRelationship,
        comments:
          record.comments === null || record.comments === undefined
            ? null
            : String(record.comments),
        failureType: String(record.failureType ?? "UNKNOWN"),
        requestDate: String(record.requestDate ?? new Date().toISOString()),
        status: String(record.status ?? "NEW") as StorefrontReviewRequestStatus,
        reviewNotes:
          record.reviewNotes === null || record.reviewNotes === undefined
            ? null
            : String(record.reviewNotes),
        reviewedBy:
          record.reviewedBy === null || record.reviewedBy === undefined
            ? null
            : String(record.reviewedBy),
        lastUpdated: String(record.lastUpdated ?? record.requestDate ?? new Date().toISOString()),
      } satisfies StorefrontReviewRequest;
    })
    .filter((entry): entry is StorefrontReviewRequest => Boolean(entry));
}

async function readRequests(): Promise<StorefrontReviewRequest[]> {
  try {
    if (isRedisConfigured()) {
      const redis = getRedis();
      const raw = await redis.get(REDIS_STOREFRONT_REVIEW_REQUESTS_KEY);
      return parseStoredRequests(raw) ?? [];
    }

    return [...memoryRequests];
  } catch (error) {
    console.error("[storefront-review-requests] read failed:", error);
    return [];
  }
}

async function writeRequests(requests: StorefrontReviewRequest[]): Promise<void> {
  if (isRedisConfigured()) {
    const redis = getRedis();
    await redis.set(REDIS_STOREFRONT_REVIEW_REQUESTS_KEY, JSON.stringify(requests.slice(0, MAX_REQUESTS)));
    return;
  }

  memoryRequests = requests.slice(0, MAX_REQUESTS);
}

async function registerNotificationEmail(email: string): Promise<void> {
  const normalized = email.trim().toLowerCase();

  if (!isValidSubscriberEmail(normalized)) {
    return;
  }

  try {
    if (isRedisConfigured()) {
      const redis = getRedis();
      await redis.sadd(REDIS_STOREFRONT_REVIEW_NOTIFICATION_INDEX_KEY, normalized);
      return;
    }

    memoryNotificationEmails.add(normalized);
  } catch (error) {
    console.error("[storefront-review-requests] notification index failed:", error);
  }
}

function createRequestId(): string {
  return `sr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function normalizeStorefrontReviewUrl(input: string): {
  domain: string;
  normalizedDomain: string;
} {
  const trimmed = input.trim();

  try {
    const url = trimmed.includes("://") ? trimmed : `https://${trimmed}`;
    const parsed = new URL(url);
    const normalizedDomain = normalizeDomainFromUrl(parsed.href);
    return {
      domain: parsed.href.replace(/\/$/, ""),
      normalizedDomain,
    };
  } catch {
    const normalizedDomain = normalizeDomainFromUrl(trimmed);
    return {
      domain: trimmed,
      normalizedDomain,
    };
  }
}

export async function listStorefrontReviewRequests(search?: string): Promise<StorefrontReviewRequest[]> {
  const requests = await readRequests();

  const filtered = !search?.trim()
    ? requests
    : requests.filter((request) => {
        const query = search.trim().toLowerCase();
        return (
          request.normalizedDomain.includes(query) ||
          request.domain.toLowerCase().includes(query) ||
          request.email.includes(query) ||
          request.status.toLowerCase().includes(query) ||
          request.relationship.toLowerCase().includes(query) ||
          request.failureType.toLowerCase().includes(query) ||
          (request.companyName?.toLowerCase().includes(query) ?? false) ||
          (request.reviewNotes?.toLowerCase().includes(query) ?? false)
        );
      });

  return filtered.sort(
    (left, right) => Date.parse(right.requestDate) - Date.parse(left.requestDate),
  );
}

export async function getStorefrontReviewRequest(
  id: string,
): Promise<StorefrontReviewRequest | undefined> {
  return (await readRequests()).find((request) => request.id === id);
}

export async function createStorefrontReviewRequest(input: {
  storefrontUrl: string;
  email: string;
  companyName?: string | null;
  relationship: StorefrontReviewRelationship;
  comments?: string | null;
  failureType: string;
}): Promise<StorefrontReviewRequest> {
  const email = input.email.trim().toLowerCase();

  if (!isValidSubscriberEmail(email)) {
    throw new Error("A valid email address is required.");
  }

  const { domain, normalizedDomain } = normalizeStorefrontReviewUrl(input.storefrontUrl);
  const now = new Date().toISOString();

  const record: StorefrontReviewRequest = {
    id: createRequestId(),
    domain,
    normalizedDomain,
    email,
    companyName: input.companyName?.trim() || null,
    relationship: input.relationship,
    comments: input.comments?.trim() || null,
    failureType: input.failureType,
    requestDate: now,
    status: "NEW",
    reviewNotes: null,
    reviewedBy: null,
    lastUpdated: now,
  };

  const requests = await readRequests();
  await writeRequests([record, ...requests]);
  await registerNotificationEmail(email);

  return record;
}

export async function updateStorefrontReviewRequestStatus(input: {
  id: string;
  status: StorefrontReviewRequestStatus;
  reviewedBy?: string;
}): Promise<StorefrontReviewRequest | null> {
  const requests = await readRequests();
  let updated: StorefrontReviewRequest | null = null;

  const next = requests.map((request) => {
    if (request.id !== input.id) {
      return request;
    }

    updated = {
      ...request,
      status: input.status,
      reviewedBy: input.reviewedBy?.trim() || request.reviewedBy,
      lastUpdated: new Date().toISOString(),
    };
    return updated;
  });

  if (!updated) {
    return null;
  }

  await writeRequests(next);
  return updated;
}

export async function updateStorefrontReviewRequestNotes(input: {
  id: string;
  reviewNotes: string | null;
  reviewedBy?: string;
}): Promise<StorefrontReviewRequest | null> {
  const requests = await readRequests();
  let updated: StorefrontReviewRequest | null = null;

  const next = requests.map((request) => {
    if (request.id !== input.id) {
      return request;
    }

    updated = {
      ...request,
      reviewNotes: input.reviewNotes?.trim() || null,
      reviewedBy: input.reviewedBy?.trim() || request.reviewedBy,
      lastUpdated: new Date().toISOString(),
    };
    return updated;
  });

  if (!updated) {
    return null;
  }

  await writeRequests(next);
  return updated;
}

export async function countStorefrontReviewNotificationEmails(): Promise<number> {
  try {
    if (isRedisConfigured()) {
      const redis = getRedis();
      return await redis.scard(REDIS_STOREFRONT_REVIEW_NOTIFICATION_INDEX_KEY);
    }

    return memoryNotificationEmails.size;
  } catch {
    return 0;
  }
}

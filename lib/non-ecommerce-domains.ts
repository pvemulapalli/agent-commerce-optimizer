export {
  addNonEcommerceDomain,
  createQuarantinedNonEcommerceResponse,
  createDomainReviewBlockedResponse,
  evaluateDomainReviewBlock,
  getDomainReviewQueue,
  getDomainReviewRecord,
  isQuarantinedNonEcommerceDomain,
  isQuarantinedNonEcommerceUrl,
  normalizeDomainReviewInput as normalizeNonEcommerceDomainInput,
  recordDomainReviewFailure,
  removeDomainReviewRecord as removeNonEcommerceDomain,
  upsertDomainReviewRecord,
  updateDomainReviewNotes as updateNonEcommerceDomainNotes,
  updateDomainReviewStatus,
  REDIS_DOMAIN_REVIEW_QUEUE_KEY as REDIS_NON_ECOMMERCE_DOMAINS_KEY,
} from "./domain-review-queue";

export type { DomainReviewRecord as NonEcommerceDomainRecord } from "./domain-review-queue";

import type { DomainReviewRecord } from "./domain-review-queue";
import {
  getDomainReviewQueue,
  normalizeDomainReviewInput,
  updateDomainReviewStatus,
} from "./domain-review-queue";

/** @deprecated Use getDomainReviewQueue */
export async function getNonEcommerceDomains(search?: string): Promise<
  Array<{
    domain: string;
    reason: string;
    firstDetectedAt: string;
    reviewed: boolean;
    reviewedBy: string | null;
    notes: string | null;
  }>
> {
  const records = await getDomainReviewQueue(search);
  return records
    .filter((record) => record.type === "NON_ECOMMERCE")
    .map(toLegacyNonEcommerceRecord);
}

/** @deprecated Use getDomainReviewRecord */
export async function getNonEcommerceDomain(domain: string) {
  const { getDomainReviewRecord } = await import("./domain-review-queue");
  const record = await getDomainReviewRecord(domain);
  return record?.type === "NON_ECOMMERCE" ? toLegacyNonEcommerceRecord(record) : undefined;
}

/** @deprecated Use updateDomainReviewStatus with APPROVED */
export async function approveNonEcommerceDomain(input: {
  domain: string;
  reviewedBy: string;
  notes?: string | null;
}) {
  const record = await updateDomainReviewStatus({
    domain: input.domain,
    status: "APPROVED",
    reviewedBy: input.reviewedBy,
    notes: input.notes ?? null,
  });
  return record?.type === "NON_ECOMMERCE" ? toLegacyNonEcommerceRecord(record) : null;
}

function toLegacyNonEcommerceRecord(record: DomainReviewRecord) {
  return {
    domain: record.domain,
    reason: record.reason,
    firstDetectedAt: record.firstSeenAt,
    reviewed: record.status === "APPROVED",
    reviewedBy: record.reviewedBy,
    notes: record.notes,
  };
}

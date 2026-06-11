import type { DomainReviewRecord } from "./domain-review-types";

export function shouldBlockDomainReviewScan(record: DomainReviewRecord): boolean {
  if (record.status === "WHITELISTED" || record.status === "REJECTED") {
    return false;
  }

  return true;
}

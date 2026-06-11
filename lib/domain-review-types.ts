export type DomainReviewType =
  | "NON_ECOMMERCE"
  | "BOT_BLOCKED"
  | "SERVER_ERROR"
  | "RATE_LIMITED"
  | "TIMEOUT"
  | "DNS_FAILURE"
  | "SSL_FAILURE"
  | "MANUAL_BLOCK"
  | "MANUAL_REVIEW"
  | "UNKNOWN";

export type DomainReviewStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "WHITELISTED";

export type DomainReviewSource = "auto_scan" | "admin" | "migration";

export interface DomainReviewRecord {
  domain: string;
  type: DomainReviewType;
  status: DomainReviewStatus;
  reason: string;
  firstSeenAt: string;
  lastSeenAt: string;
  retryAfter: string | null;
  notes: string | null;
  reviewedBy: string | null;
  source: DomainReviewSource;
}

export const DOMAIN_REVIEW_TYPES: DomainReviewType[] = [
  "MANUAL_BLOCK",
  "NON_ECOMMERCE",
  "BOT_BLOCKED",
  "SERVER_ERROR",
  "RATE_LIMITED",
  "TIMEOUT",
  "DNS_FAILURE",
  "SSL_FAILURE",
  "MANUAL_REVIEW",
  "UNKNOWN",
];

export const DOMAIN_REVIEW_STATUSES: DomainReviewStatus[] = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "WHITELISTED",
];

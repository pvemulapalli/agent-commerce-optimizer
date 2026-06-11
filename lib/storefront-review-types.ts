export type StorefrontReviewRequestStatus =
  | "NEW"
  | "UNDER_REVIEW"
  | "SUPPORTED"
  | "NOT_SUPPORTED"
  | "WAITING_FOR_FEEDBACK"
  | "CLOSED";

export type StorefrontReviewRelationship =
  | "STORE_OWNER"
  | "EMPLOYEE"
  | "AGENCY_PARTNER"
  | "CONSULTANT"
  | "TECHNOLOGY_PARTNER"
  | "OTHER";

export interface StorefrontReviewRequest {
  id: string;
  domain: string;
  normalizedDomain: string;
  email: string;
  companyName: string | null;
  relationship: StorefrontReviewRelationship;
  comments: string | null;
  failureType: string;
  requestDate: string;
  status: StorefrontReviewRequestStatus;
  reviewNotes: string | null;
  reviewedBy: string | null;
  lastUpdated: string;
}

export const STOREFRONT_REVIEW_STATUSES: StorefrontReviewRequestStatus[] = [
  "NEW",
  "UNDER_REVIEW",
  "SUPPORTED",
  "NOT_SUPPORTED",
  "WAITING_FOR_FEEDBACK",
  "CLOSED",
];

export const STOREFRONT_REVIEW_RELATIONSHIPS: StorefrontReviewRelationship[] = [
  "STORE_OWNER",
  "EMPLOYEE",
  "AGENCY_PARTNER",
  "CONSULTANT",
  "TECHNOLOGY_PARTNER",
  "OTHER",
];

export const STOREFRONT_REVIEW_RELATIONSHIP_LABELS: Record<
  StorefrontReviewRelationship,
  string
> = {
  STORE_OWNER: "Store Owner",
  EMPLOYEE: "Employee",
  AGENCY_PARTNER: "Agency Partner",
  CONSULTANT: "Consultant",
  TECHNOLOGY_PARTNER: "Technology Partner",
  OTHER: "Other",
};

"use client";

import type { RecentScanRecord } from "@/lib/scan-activity-types";
import { formatPlatformDisplay } from "@/lib/platform-labels";

export type RecentAuditSortField = "domain" | "score" | "grade" | "platform" | "scannedAt";
export type RecentAuditSortDirection = "asc" | "desc";

export const PLATFORM_FILTER_OPTIONS = [
  { value: "all", label: "All" },
  { value: "Shopify", label: "Shopify" },
  { value: "BigCommerce", label: "BigCommerce" },
  { value: "WooCommerce", label: "WooCommerce" },
  { value: "Salesforce Commerce Cloud", label: "Salesforce Commerce Cloud" },
  { value: "Magento", label: "Adobe Commerce" },
  { value: "VTEX", label: "VTEX" },
  { value: "Fenicio", label: "Fenicio" },
  { value: "Squarespace", label: "Squarespace" },
  { value: "Wix", label: "Wix" },
  { value: "Unknown", label: "Other Platforms" },
] as const;

const GRADE_ORDER: Record<string, number> = {
  A: 5,
  B: 4,
  C: 3,
  D: 2,
  F: 1,
};

export function filterRecentAudits(
  entries: RecentScanRecord[],
  query: string,
  platform: string,
): RecentScanRecord[] {
  const normalizedQuery = query.trim().toLowerCase();

  return entries.filter((entry) => {
    if (platform !== "all" && entry.platform !== platform) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    const haystack = [
      entry.merchant,
      entry.hostname,
      entry.url,
      formatPlatformDisplay(entry.platform),
      entry.platform,
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(normalizedQuery);
  });
}

export function sortRecentAudits(
  entries: RecentScanRecord[],
  sort: RecentAuditSortField,
  direction: RecentAuditSortDirection,
): RecentScanRecord[] {
  const sorted = [...entries].sort((left, right) => {
    let comparison = 0;

    switch (sort) {
      case "domain":
        comparison = left.merchant.localeCompare(right.merchant);
        break;
      case "score":
        comparison = (left.readinessScore ?? 0) - (right.readinessScore ?? 0);
        break;
      case "grade":
        comparison =
          (GRADE_ORDER[left.grade?.charAt(0).toUpperCase() ?? "F"] ?? 0) -
          (GRADE_ORDER[right.grade?.charAt(0).toUpperCase() ?? "F"] ?? 0);
        break;
      case "platform":
        comparison = formatPlatformDisplay(left.platform).localeCompare(
          formatPlatformDisplay(right.platform),
        );
        break;
      case "scannedAt":
        comparison = Date.parse(left.scannedAt) - Date.parse(right.scannedAt);
        break;
      default:
        comparison = 0;
    }

    return direction === "asc" ? comparison : -comparison;
  });

  return sorted;
}

export function parseRecentAuditSortField(value: string | null): RecentAuditSortField {
  if (
    value === "domain" ||
    value === "score" ||
    value === "grade" ||
    value === "platform" ||
    value === "scannedAt"
  ) {
    return value;
  }

  return "scannedAt";
}

export function parseRecentAuditSortDirection(
  value: string | null,
): RecentAuditSortDirection {
  return value === "asc" ? "asc" : "desc";
}

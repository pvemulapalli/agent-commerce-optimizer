import type { AuditApiResponse } from "./types";

export interface AuditHistoryEntry {
  id: string;
  url: string;
  merchant: string;
  platform: string;
  timestamp: string;
  summary: string;
}

const HISTORY_KEY = "aco-audit-history";
const TOTAL_COUNT_KEY = "aco-audit-total-count";
const MAX_HISTORY_ENTRIES = 100;

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function extractMerchantName(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    const label = hostname.split(".")[0] ?? hostname;

    if (!label) {
      return hostname;
    }

    return label.charAt(0).toUpperCase() + label.slice(1);
  } catch {
    return url;
  }
}

export function buildAuditSummary(audit: AuditApiResponse): string {
  const { detected, missing, needsReview } = audit.grouped;

  return `${detected.length} detected · ${missing.length} missing · ${needsReview.length} needs review`;
}

export function createAuditHistoryEntry(
  audit: AuditApiResponse,
): AuditHistoryEntry {
  return {
    id: `${audit.url}-${audit.crawledAt}`,
    url: audit.url,
    merchant: extractMerchantName(audit.url),
    platform: audit.platform.platform,
    timestamp: audit.crawledAt,
    summary: buildAuditSummary(audit),
  };
}

export function getAuditHistory(): AuditHistoryEntry[] {
  if (!isBrowser()) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as AuditHistoryEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function getTotalAuditCount(): number {
  if (!isBrowser()) {
    return 0;
  }

  try {
    const raw = window.localStorage.getItem(TOTAL_COUNT_KEY);
    if (!raw) {
      return 0;
    }

    const parsed = Number.parseInt(raw, 10);
    return Number.isNaN(parsed) ? 0 : parsed;
  } catch {
    return 0;
  }
}

export function getRecentAudits(limit = 5): AuditHistoryEntry[] {
  return getAuditHistory().slice(0, limit);
}

export function recordAuditFromResponse(audit: AuditApiResponse): AuditHistoryEntry {
  if (!isBrowser()) {
    return createAuditHistoryEntry(audit);
  }

  const entry = createAuditHistoryEntry(audit);
  const existing = getAuditHistory().filter((item) => item.id !== entry.id);
  const nextHistory = [entry, ...existing].slice(0, MAX_HISTORY_ENTRIES);
  const nextTotal = getTotalAuditCount() + 1;

  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(nextHistory));
  window.localStorage.setItem(TOTAL_COUNT_KEY, String(nextTotal));

  return entry;
}

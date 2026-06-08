export interface AnalyticsEventLogEntry {
  event: string;
  properties?: Record<string, unknown>;
  timestamp: string;
  delivered: boolean;
}

const STORAGE_KEY = "aco:analytics:event-log";
const MAX_EVENTS = 12;

export function appendAnalyticsEventLog(entry: AnalyticsEventLogEntry): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const existing = readAnalyticsEventLog();
    const next = [entry, ...existing].slice(0, MAX_EVENTS);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage failures in private browsing or restricted contexts.
  }
}

export function readAnalyticsEventLog(): AnalyticsEventLogEntry[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (entry): entry is AnalyticsEventLogEntry =>
        Boolean(entry) &&
        typeof entry === "object" &&
        typeof (entry as AnalyticsEventLogEntry).event === "string" &&
        typeof (entry as AnalyticsEventLogEntry).timestamp === "string",
    );
  } catch {
    return [];
  }
}

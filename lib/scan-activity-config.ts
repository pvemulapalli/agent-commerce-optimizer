const DEFAULT_POLL_SECONDS = 60;
const ACTIVITY_FEED_WINDOW_MS = 15 * 60 * 1000;
const ACTIVITY_FEED_MAX_EVENTS = 20;

/** Client-side flag — must use NEXT_PUBLIC_ prefix in .env.local / Vercel */
export function isActivityFeedEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_ACTIVITY_FEED === "true";
}

/** @deprecated Use isActivityFeedEnabled */
export function isScanActivityToastEnabled(): boolean {
  return isActivityFeedEnabled();
}

export function getScanActivityPollIntervalMs(): number {
  const raw = process.env.NEXT_PUBLIC_SCAN_ACTIVITY_POLL_SECONDS;

  if (!raw?.trim()) {
    return DEFAULT_POLL_SECONDS * 1000;
  }

  const parsed = Number.parseInt(raw, 10);

  if (Number.isNaN(parsed) || parsed < 1) {
    return DEFAULT_POLL_SECONDS * 1000;
  }

  return parsed * 1000;
}

export function getActivityFeedWindowMs(): number {
  return ACTIVITY_FEED_WINDOW_MS;
}

export function getActivityFeedMaxEvents(): number {
  return ACTIVITY_FEED_MAX_EVENTS;
}

export function isRecentActivityEvent(scannedAt: string, now = Date.now()): boolean {
  const scannedAtMs = Date.parse(scannedAt);
  if (Number.isNaN(scannedAtMs)) {
    return false;
  }

  return now - scannedAtMs <= ACTIVITY_FEED_WINDOW_MS;
}

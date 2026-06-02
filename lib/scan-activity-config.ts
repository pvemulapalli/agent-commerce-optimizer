const DEFAULT_POLL_SECONDS = 60;

export function isScanActivityToastEnabled(): boolean {
  return process.env.NEXT_PUBLIC_SCAN_ACTIVITY_TOAST_ENABLED === "true";
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

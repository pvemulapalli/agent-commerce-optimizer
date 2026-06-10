"use client";

import { useEffect, useState } from "react";

const PROGRESS_STEPS = [
  { label: "Crawling discovery files…", afterMs: 0 },
  { label: "Parsing sitemaps…", afterMs: 10_000 },
  { label: "Analyzing storefront signals…", afterMs: 20_000 },
  { label: "Scoring AI commerce readiness…", afterMs: 32_000 },
  { label: "Finishing up…", afterMs: 45_000 },
] as const;

function formatElapsed(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return remainder > 0 ? `${minutes}m ${remainder}s` : `${minutes}m`;
}

function getProgressStep(elapsedMs: number): string {
  let current: string = PROGRESS_STEPS[0].label;

  for (const step of PROGRESS_STEPS) {
    if (elapsedMs >= step.afterMs) {
      current = step.label;
    }
  }

  return current;
}

function getProgressHint(elapsedMs: number): string {
  const elapsedSeconds = Math.floor(elapsedMs / 1000);

  if (elapsedSeconds >= 45) {
    return "Taking longer than usual — please keep this tab open.";
  }

  if (elapsedSeconds >= 30) {
    return "Large storefronts often need 30–45 seconds.";
  }

  if (elapsedSeconds >= 15) {
    return "Still working — most scans finish within 15–45 seconds.";
  }

  return "Most scans take 15–45 seconds depending on site size.";
}

function getProgressPercent(elapsedMs: number): number {
  const elapsedSeconds = elapsedMs / 1000;
  return Math.min(92, 12 + elapsedSeconds * 1.75);
}

export function AuditProgressBar({
  label = "Running scan",
  startedAt,
}: {
  label?: string;
  startedAt?: number | null;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  const elapsedMs = startedAt ? Math.max(0, now - startedAt) : 0;
  const elapsedSeconds = Math.floor(elapsedMs / 1000);

  return (
    <div
      className="mt-5 overflow-hidden rounded-lg border border-card-border bg-card-muted px-4 py-3"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex items-center justify-between gap-3 text-sm">
        <p className="font-medium text-text-primary">{label}</p>
        {startedAt ? (
          <p className="text-xs tabular-nums text-text-secondary">
            {formatElapsed(elapsedSeconds)} elapsed
          </p>
        ) : (
          <p className="text-xs text-text-secondary">Starting scan…</p>
        )}
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
        {startedAt ? (
          <div
            className="h-full rounded-full bg-blue-900 transition-[width] duration-700 ease-out dark:bg-blue-400"
            style={{ width: `${getProgressPercent(elapsedMs)}%` }}
          />
        ) : (
          <div className="audit-progress-bar h-full w-1/3 rounded-full bg-blue-900 dark:bg-blue-400" />
        )}
      </div>

      <p className="mt-3 text-sm text-text-primary">{getProgressStep(elapsedMs)}</p>
      <p className="mt-1 text-xs text-text-secondary">{getProgressHint(elapsedMs)}</p>
    </div>
  );
}

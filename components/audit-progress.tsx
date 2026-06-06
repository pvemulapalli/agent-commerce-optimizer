"use client";

import { useEffect, useState } from "react";

const PROGRESS_STEPS = [
  "Crawling discovery files…",
  "Parsing sitemaps…",
  "Analyzing storefront signals…",
  "Scoring AI commerce readiness…",
];

export function AuditProgressBar({
  label = "Running scan",
}: {
  label?: string;
}) {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setStepIndex((current) => (current + 1) % PROGRESS_STEPS.length);
    }, 3200);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <div
      className="mt-5 overflow-hidden rounded-lg border border-card-border bg-card-muted px-4 py-3"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex items-center justify-between gap-3 text-sm">
        <p className="font-medium text-text-primary">{label}</p>
        <p className="text-xs text-text-secondary">Usually 5-15 seconds</p>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
        <div className="audit-progress-bar h-full w-1/3 rounded-full bg-blue-900 dark:bg-blue-400" />
      </div>

      <p className="mt-3 text-sm text-text-secondary">{PROGRESS_STEPS[stepIndex]}</p>
    </div>
  );
}

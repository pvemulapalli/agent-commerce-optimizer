"use client";

import { buildBusinessSummary } from "@/lib/business-summary";
import type { ReadinessReport } from "@/lib/readiness-score";

export function BusinessSummarySection({
  report,
  missingCount,
}: {
  report: ReadinessReport;
  missingCount: number;
}) {
  const summary = buildBusinessSummary(report, missingCount);

  return (
    <section className="rounded-2xl border border-blue-200 bg-blue-50/50 p-6 dark:border-blue-500/30 dark:bg-blue-950/20 sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-900 dark:text-blue-200">
        Business Summary
      </p>
      <p className="mt-3 text-sm font-semibold text-blue-950 dark:text-blue-100">
        {summary.readinessBand}
      </p>
      <div className="mt-4 space-y-3 text-sm leading-7 text-slate-800 dark:text-slate-100">
        {summary.paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
    </section>
  );
}

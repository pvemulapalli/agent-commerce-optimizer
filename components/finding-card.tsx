"use client";

import { getFindingGuidance } from "@/lib/finding-guidance";
import {
  getFindingImpactLevel,
  getFindingStatusLabel,
} from "@/lib/readiness-score";
import type { Finding } from "@/lib/types";

function formatFindingTitle(label: string): string {
  return label.toUpperCase();
}

function ImpactBadge({ impact }: { impact: "High" | "Medium" | "Low" }) {
  const classes = {
    High: "border-rose-200 bg-rose-100 text-rose-800 dark:border-rose-500/40 dark:bg-rose-950/70 dark:text-rose-100",
    Medium:
      "border-amber-200 bg-amber-100 text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/70 dark:text-amber-100",
    Low: "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-500 dark:bg-slate-800 dark:text-slate-100",
  }[impact];

  return (
    <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${classes}`}>
      {impact} Impact
    </span>
  );
}

function StatusBadge({ status }: { status: "Passed" | "Missing" | "Needs Review" }) {
  const classes = {
    Passed:
      "border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-950/70 dark:text-emerald-100",
    Missing:
      "border-rose-200 bg-rose-100 text-rose-800 dark:border-rose-500/40 dark:bg-rose-950/70 dark:text-rose-100",
    "Needs Review":
      "border-amber-200 bg-amber-100 text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/70 dark:text-amber-100",
  }[status];

  return (
    <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${classes}`}>
      {status}
    </span>
  );
}

export function FindingCard({ finding }: { finding: Finding }) {
  const guidance = getFindingGuidance(finding);
  const impact = getFindingImpactLevel(finding);
  const statusLabel = getFindingStatusLabel(finding.status);

  return (
    <article className="min-w-0 overflow-hidden rounded-xl border border-card-border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h3 className="min-w-0 text-xs font-semibold tracking-[0.14em] text-text-primary uppercase">
          {formatFindingTitle(finding.label)}
        </h3>
        <div className="flex flex-wrap items-center gap-2 md:shrink-0 md:justify-end">
          <ImpactBadge impact={impact} />
          <StatusBadge status={statusLabel} />
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-card-border bg-card-muted p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
            Business Impact
          </p>
          <p className="mt-2 text-sm leading-6 text-text-primary">{guidance.businessImpact}</p>
        </div>
        <div className="rounded-lg border border-card-border bg-card-muted p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
            Potential Result
          </p>
          <p className="mt-2 text-sm leading-6 text-text-primary">{guidance.potentialResult}</p>
        </div>
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-500/50 dark:bg-blue-950/70">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-900 dark:text-blue-100">
            Recommended Action
          </p>
          <p className="mt-2 text-sm leading-6 text-blue-950 dark:text-blue-50">
            {guidance.recommendedAction}
          </p>
        </div>
      </div>

      <details className="mt-5 rounded-lg border border-card-border bg-card-muted px-4 py-3">
        <summary className="cursor-pointer text-sm font-medium text-text-primary">
          Technical evidence
        </summary>
        <dl className="mt-4 space-y-3 text-sm">
          <div>
            <dt className="font-medium text-text-secondary">Evidence</dt>
            <dd className="mt-1 break-words text-text-primary">{finding.evidence}</dd>
          </div>
          {finding.evidenceUrls.length > 0 && (
            <div>
              <dt className="font-medium text-text-secondary">Evidence URLs</dt>
              <dd className="mt-1 space-y-1">
                {finding.evidenceUrls.map((evidenceUrl) => (
                  <div key={evidenceUrl} className="break-all">
                    <a
                      href={evidenceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-800 hover:underline dark:text-blue-300"
                    >
                      {evidenceUrl}
                    </a>
                  </div>
                ))}
              </dd>
            </div>
          )}
          <div>
            <dt className="font-medium text-text-secondary">Source URL</dt>
            <dd className="mt-1 break-all">
              <a
                href={finding.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-800 hover:underline dark:text-blue-300"
              >
                {finding.sourceUrl}
              </a>
            </dd>
          </div>
        </dl>
      </details>
    </article>
  );
}

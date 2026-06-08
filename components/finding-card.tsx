"use client";

import { buildFixPromptForFinding } from "@/lib/fix-prompts";
import { trackFixPromptCopied } from "@/lib/analytics-events";
import type { ScanAnalyticsProperties } from "@/lib/analytics-properties";
import { getFindingGuidance } from "@/lib/finding-guidance";
import {
  getFindingImpactLevel,
  getFindingStatusLabel,
} from "@/lib/readiness-score";
import type { CommercePlatform, Finding } from "@/lib/types";
import { CopyToast, useCopyToast } from "@/components/copy-toast";

function formatFindingTitle(label: string): string {
  return label.toUpperCase();
}

function CopyIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
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

function CopyFixPromptButton({
  finding,
  platform,
  scanContext,
}: {
  finding: Finding;
  platform?: CommercePlatform;
  scanContext?: ScanAnalyticsProperties;
}) {
  const { toastMessage, clearToast, copyWithToast } = useCopyToast();

  async function handleCopyFixPrompt() {
    trackFixPromptCopied({
      ...scanContext,
      platform: platform ?? scanContext?.platform,
      findingId: finding.id,
      findingTitle: finding.label,
    });
    const prompt = buildFixPromptForFinding(finding, platform);
    await copyWithToast(prompt, "Fix prompt copied.");
  }

  return (
    <>
      <div className="group relative">
        <button
          type="button"
          onClick={() => void handleCopyFixPrompt()}
          className="inline-flex items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-4 py-3 text-sm font-medium text-violet-900 transition hover:bg-violet-100 dark:border-violet-500/40 dark:bg-violet-950/40 dark:text-violet-100 dark:hover:bg-violet-950/60"
        >
          <CopyIcon />
          Copy Fix Prompt
        </button>
        <div
          role="tooltip"
          className="pointer-events-none absolute bottom-[calc(100%+0.65rem)] left-1/2 z-20 w-max max-w-xs -translate-x-1/2 rounded-lg border border-card-border bg-slate-900 px-3 py-2 text-center text-xs leading-5 text-slate-100 opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 dark:bg-slate-950 dark:text-slate-100"
        >
          Paste into your AI coding assistant to address this finding
          <span className="absolute left-1/2 top-full -translate-x-1/2 border-8 border-transparent border-t-slate-900 dark:border-t-slate-950" />
        </div>
      </div>
      {toastMessage ? <CopyToast message={toastMessage} onDone={clearToast} /> : null}
    </>
  );
}

export function FindingCard({
  finding,
  platform,
  scanContext,
}: {
  finding: Finding;
  platform?: CommercePlatform;
  scanContext?: ScanAnalyticsProperties;
}) {
  const guidance = getFindingGuidance(finding);
  const impact = getFindingImpactLevel(finding);
  const statusLabel = getFindingStatusLabel(finding.status);
  const showFixPrompt = finding.status !== "detected";

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

      <div className="mt-5 flex flex-wrap gap-3">
        <details className="min-w-[12rem] flex-1 rounded-lg border border-card-border bg-card-muted px-4 py-3">
          <summary className="cursor-pointer text-sm font-medium text-text-primary">
            View Evidence
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

        {showFixPrompt ? (
          <CopyFixPromptButton finding={finding} platform={platform} scanContext={scanContext} />
        ) : null}
      </div>
    </article>
  );
}

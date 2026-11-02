"use client";

import { BusinessSummarySection } from "@/components/business-summary-section";
import { RecommendedStartingPointSection } from "@/components/recommended-starting-point-section";
import { DimensionScoreCards } from "@/components/dimension-score-cards";
import { buildRecommendedStartingPoint } from "@/lib/recommended-starting-point";
import type { GroupedFindings } from "@/lib/types";
import { AuditNextStepsInline } from "@/components/audit-next-steps";
import { LowScoreScopeNote } from "@/components/low-score-scope-note";
import { ShareReportButton } from "@/components/share-report-button";
import type { ScanAnalyticsProperties } from "@/lib/analytics-properties";
import { AUDIT_SECTION_SCROLL_CLASS } from "@/lib/scroll-utils";
import { FUTURE_AUTOMATION_NOTE } from "@/lib/scan-messaging";
import { SCORE_EVIDENCE_NOTE, type ReadinessReport } from "@/lib/readiness-score";
import { scoringModelLabel } from "@/lib/scoring-model";
import type { CrawlSummary } from "@/lib/crawl-quality";
import type { CommercePlatform, Finding } from "@/lib/types";

function ScoreGauge({ score, grade }: { score: number; grade: string }) {
  const circumference = 2 * Math.PI * 54;
  const progress = (score / 100) * circumference;

  return (
    <div className="relative h-36 w-36 shrink-0">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r="54" fill="none" className="stroke-slate-200 dark:stroke-slate-700" strokeWidth="10" />
        <circle
          cx="60"
          cy="60"
          r="54"
          fill="none"
          stroke="#2563eb"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${progress} ${circumference}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-semibold tabular-nums text-text-primary">{score}</span>
        <span className="text-xs font-medium uppercase tracking-wide text-text-secondary">
          Grade {grade}
        </span>
      </div>
    </div>
  );
}

function Scorecard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone: "blue" | "emerald" | "rose" | "amber";
}) {
  const tones = {
    blue: "border-blue-200 bg-blue-50/60 text-blue-900 dark:border-blue-500/30 dark:bg-blue-950/40 dark:text-blue-100",
    emerald: "border-emerald-200 bg-emerald-50/60 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-100",
    rose: "border-rose-200 bg-rose-50/60 text-rose-900 dark:border-rose-500/30 dark:bg-rose-950/40 dark:text-rose-100",
    amber: "border-amber-200 bg-amber-50/60 text-amber-900 dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-100",
  }[tone];

  return (
    <div className={`rounded-xl border p-4 ${tones}`}>
      <p className="text-xs font-medium uppercase tracking-wide">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function ScoreEvidenceNote({ scoringModelVersion }: { scoringModelVersion?: string }) {
  return (
    <div className="space-y-1 text-sm text-text-secondary">
      <p className="flex items-start gap-2">
        <span
          className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-card-muted text-xs font-semibold text-text-primary"
          title={SCORE_EVIDENCE_NOTE}
          aria-label={SCORE_EVIDENCE_NOTE}
        >
          i
        </span>
        <span>{SCORE_EVIDENCE_NOTE}</span>
      </p>
      {scoringModelVersion ? (
        <p className="pl-7 text-xs text-text-secondary">
          {scoringModelLabel(scoringModelVersion)}. Historical reports may use a different model.
        </p>
      ) : null}
    </div>
  );
}

function AssessmentCoverageStrip({ crawlSummary }: { crawlSummary?: CrawlSummary }) {
  const coverage = crawlSummary?.coverage;
  if (!coverage) return null;

  const accessLabel =
    coverage.storefrontAccess === "unlocked"
      ? "Authenticated storefront access"
      : coverage.storefrontAccess === "required_unmet"
        ? "Password gate blocked access"
        : "Public crawl";

  return (
    <div className="rounded-xl border border-card-border bg-card-muted/60 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
        Assessment coverage
      </p>
      <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-text-secondary">Pages inspected</dt>
          <dd className="font-semibold tabular-nums text-text-primary">
            {coverage.urlsSucceeded}/{coverage.urlsFetched}
          </dd>
        </div>
        <div>
          <dt className="text-text-secondary">Products / collections</dt>
          <dd className="font-semibold tabular-nums text-text-primary">
            {coverage.pageClassCounts.product} / {coverage.pageClassCounts.collection}
          </dd>
        </div>
        <div>
          <dt className="text-text-secondary">Policies</dt>
          <dd className="font-semibold tabular-nums text-text-primary">
            {coverage.pageClassCounts.policy}
          </dd>
        </div>
        <div>
          <dt className="text-text-secondary">Access</dt>
          <dd className="font-semibold text-text-primary">{accessLabel}</dd>
        </div>
      </dl>
      {coverage.skippedByBudget > 0 || coverage.blockedByPasswordGate > 0 ? (
        <p className="mt-3 text-xs text-text-secondary">
          {coverage.skippedByBudget > 0
            ? `${coverage.skippedByBudget} discovered URL(s) were not fetched due to crawl budget. `
            : null}
          {coverage.blockedByPasswordGate > 0
            ? `${coverage.blockedByPasswordGate} response(s) were password-gated and excluded from evidence.`
            : null}
        </p>
      ) : null}
    </div>
  );
}

export function ReadinessDashboard({
  report,
  merchantName,
  normalizedDomain,
  auditedUrl,
  detectedCount,
  missingCount,
  needsReviewCount,
  needsVerificationCount = 0,
  isSharedReport = false,
  reportId,
  shareUrl,
  actionableFindings = [],
  platform,
  assetCount = 0,
  scanContext,
  grouped,
  crawlSummary,
}: {
  report: ReadinessReport;
  merchantName?: string;
  normalizedDomain?: string;
  auditedUrl?: string;
  detectedCount: number;
  missingCount: number;
  needsReviewCount: number;
  needsVerificationCount?: number;
  isSharedReport?: boolean;
  reportId?: string;
  shareUrl?: string;
  actionableFindings?: Finding[];
  platform?: CommercePlatform;
  assetCount?: number;
  scanContext?: ScanAnalyticsProperties;
  grouped: GroupedFindings;
  crawlSummary?: CrawlSummary;
}) {
  const startingPoint = buildRecommendedStartingPoint({
    grouped,
    topGap: report.topGap,
  });

  return (
    <section
      id="overview"
      className={`${AUDIT_SECTION_SCROLL_CLASS} overflow-hidden rounded-2xl border border-card-border bg-card shadow-sm`}
    >
      <div className="relative border-b border-card-border bg-card-muted px-6 py-5 sm:px-8">
        {reportId || shareUrl ? (
          <div className="absolute right-6 top-5 z-10 sm:right-8">
            <ShareReportButton
              reportId={reportId}
              shareUrl={shareUrl}
              scanContext={scanContext}
            />
          </div>
        ) : null}
        <div className={reportId || shareUrl ? "pr-28 sm:pr-32" : undefined}>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">
          AI Commerce Readiness
        </p>
        {isSharedReport ? (
          <span className="mt-2 inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-900 dark:border-indigo-500/40 dark:bg-indigo-950/50 dark:text-indigo-100">
            Shared Report
          </span>
        ) : null}
        {(merchantName || normalizedDomain) && (
          <div className="mt-2 min-w-0">
            {merchantName ? (
              <h2 className="text-xl font-semibold text-text-primary sm:text-2xl">
                {merchantName}
              </h2>
            ) : normalizedDomain ? (
              <h2 className="truncate text-xl font-semibold text-text-primary sm:text-2xl">
                {normalizedDomain}
              </h2>
            ) : null}
            {normalizedDomain && merchantName ? (
              <p className="mt-1 truncate text-sm text-text-secondary">
                {auditedUrl ? (
                  <a
                    href={auditedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-text-primary hover:underline"
                  >
                    {normalizedDomain}
                  </a>
                ) : (
                  normalizedDomain
                )}
              </p>
            ) : null}
          </div>
        )}
        <div className="mt-4 grid gap-6 lg:grid-cols-[3fr_2fr] lg:items-center">
          <div className="min-w-0">
            <div className="flex items-end gap-3">
              <p className="text-5xl font-semibold tabular-nums tracking-tight text-text-primary sm:text-6xl">
                {report.score}
              </p>
              <p className="pb-2 text-2xl font-medium text-text-secondary">/ 100</p>
            </div>
            <p className="mt-2 text-lg font-semibold text-text-primary">Grade {report.grade}</p>
            <p className="mt-1 text-base text-text-secondary">{report.summaryLabel}</p>
            {report.score < 50 ? <LowScoreScopeNote /> : null}
          </div>
          <div className="flex justify-center lg:justify-end">
            <ScoreGauge score={report.score} grade={report.grade} />
          </div>
        </div>
        <div className="mt-5">
          <ScoreEvidenceNote scoringModelVersion={report.scoringModelVersion} />
        </div>
        </div>
      </div>

      <div className="space-y-8 px-6 py-8 sm:px-8">
        <AssessmentCoverageStrip crawlSummary={crawlSummary} />
        <BusinessSummarySection report={report} missingCount={missingCount} />
        <RecommendedStartingPointSection startingPoint={startingPoint} />

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">
            Dimension scores
          </h3>
          <p className="mt-1 text-sm text-text-secondary">
            Evidence-backed scores across each AI discoverability dimension.
          </p>
          <div className="mt-5">
            <DimensionScoreCards dimensions={report.dimensions} />
          </div>
          <div className="mt-6">
            <AuditNextStepsInline
              actionableFindings={actionableFindings}
              platform={platform}
              assetCount={assetCount}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <Scorecard label="Verified strengths" value={detectedCount} tone="emerald" />
          <Scorecard label="Confirmed gaps" value={missingCount} tone="rose" />
          <Scorecard
            label="Needs verification"
            value={needsVerificationCount}
            tone="blue"
          />
          <Scorecard label="Needs review" value={needsReviewCount} tone="amber" />
          <Scorecard label="Readiness score" value={report.score} tone="blue" />
        </div>
      </div>
    </section>
  );
}

export function ExecutiveSummaryPanel({ report }: { report: ReadinessReport }) {
  return (
    <section className="rounded-2xl border border-card-border bg-card p-6 shadow-sm sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">
        Scan Summary
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-5 dark:border-emerald-500/30 dark:bg-emerald-950/30">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-emerald-900 dark:text-emerald-200">
            Strengths
          </h3>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-emerald-950 dark:text-emerald-100">
            {report.strengths.map((item) => (
              <li key={item} className="flex gap-2">
                <span aria-hidden className="text-emerald-600">
                  ✓
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-5 dark:border-amber-500/30 dark:bg-amber-950/30">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-amber-900 dark:text-amber-200">
            Opportunities
          </h3>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-amber-950 dark:text-amber-100">
            {report.opportunities.map((item) => (
              <li key={item} className="flex gap-2">
                <span aria-hidden className="text-amber-600">
                  →
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className="mt-6 text-base leading-7 text-text-secondary">{report.executiveSummary}</p>
    </section>
  );
}

export function RecommendationsSection({ report }: { report: ReadinessReport }) {
  return (
    <section
      id="recommendations"
      className={`${AUDIT_SECTION_SCROLL_CLASS} rounded-2xl border border-card-border bg-card p-6 shadow-sm sm:p-8`}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">
        What to fix first
      </p>
      <h2 className="mt-2 text-2xl font-semibold text-text-primary">Recommendations</h2>
      <p className="mt-2 text-sm text-text-secondary">
        Prioritized actions based on your weakest evidence-backed dimensions and missing
        signals.
      </p>
      <p className="mt-6 rounded-xl border border-card-border bg-card-muted px-4 py-3 text-sm leading-6 text-text-secondary">
        {FUTURE_AUTOMATION_NOTE}
      </p>

      <ol className="mt-6 space-y-4">
        {report.recommendations.map((item, index) => (
          <li
            key={item}
            className="flex gap-4 rounded-xl border border-card-border bg-card-muted px-4 py-4"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-900 text-sm font-semibold text-white dark:bg-blue-700">
              {index + 1}
            </span>
            <p className="text-sm leading-6 text-text-primary">{item}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

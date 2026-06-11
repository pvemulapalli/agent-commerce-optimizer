"use client";

import {
  OtherPlatformDetectionDetails,
  PlatformValue,
} from "@/components/other-platform-detection";
import { ShareReportButton } from "@/components/share-report-button";
import { StorefrontReviewRequestPanel } from "@/components/storefront-review-request-panel";
import { PlatformDetectionIntro } from "@/components/platform-evidence-section";
import { useTelemetrySuppression } from "@/components/telemetry-context-provider";
import { isPlatformNotIdentified } from "@/lib/platform-labels";
import { normalizeDomainFromUrl } from "@/lib/domain-normalization";
import type { PartialReportResponse } from "@/lib/types";
import type { ScanAnalyticsProperties } from "@/lib/analytics-properties";
import { AUDIT_SECTION_SCROLL_CLASS } from "@/lib/scroll-utils";
import type { ConfidenceLevel } from "@/lib/types";

function ConfidenceBadge({ confidence }: { confidence: ConfidenceLevel }) {
  const classes = {
    high: "border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-950/70 dark:text-emerald-100",
    medium:
      "border-amber-200 bg-amber-100 text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/70 dark:text-amber-100",
    low: "border-rose-200 bg-rose-100 text-rose-800 dark:border-rose-500/40 dark:bg-rose-950/70 dark:text-rose-100",
  }[confidence];

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${classes}`}>
      {confidence}
    </span>
  );
}

export function PartialReportSection({
  report,
  reportId,
  shareUrl,
  scanContext,
  showInternalEvidence = false,
  isSharedReport = false,
}: {
  report: PartialReportResponse;
  reportId?: string;
  shareUrl?: string;
  scanContext: ScanAnalyticsProperties;
  showInternalEvidence?: boolean;
  isSharedReport?: boolean;
}) {
  const { suppressed: founderModeActive } = useTelemetrySuppression();
  const showInternal = showInternalEvidence || founderModeActive;
  const platform = report.technologyDetection.detectedPlatform;
  const failure = report.fullAuditFailure;

  return (
    <div className="min-w-0 space-y-8 [overflow-anchor:none]">
      <section
        className={`${AUDIT_SECTION_SCROLL_CLASS} rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm dark:border-amber-500/40 dark:bg-amber-950/40 sm:p-8`}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-800 dark:text-amber-200">
              Partial Report
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-amber-950 dark:text-amber-50">
              Technology detected · No readiness score
            </h2>
            <p className="mt-2 max-w-3xl text-sm text-amber-900 dark:text-amber-100/90">
              We were able to identify storefront technology signals, but the full readiness audit
              could not be completed because the storefront blocked or interrupted deeper crawling.
            </p>
          </div>
          {shareUrl && reportId ? (
            <ShareReportButton
              reportId={reportId}
              shareUrl={shareUrl}
              scanContext={scanContext}
            />
          ) : null}
        </div>

        <div className="mt-6 rounded-xl border border-amber-200/80 bg-white/70 p-4 dark:border-amber-500/30 dark:bg-slate-950/40">
          <p className="text-sm font-medium text-text-primary">{failure.title}</p>
          <p className="mt-2 text-sm text-text-secondary">{failure.message}</p>
        </div>

        {failure.suggestedNextSteps.length > 0 ? (
          <div className="mt-6">
            <h3 className="text-sm font-medium text-text-primary">Suggested next steps</h3>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-text-secondary">
              {failure.suggestedNextSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <StorefrontReviewRequestPanel
          storefrontUrl={report.url}
          failureType={failure.reason}
        />
      </section>

      <section
        id="platform-detection"
        className={`${AUDIT_SECTION_SCROLL_CLASS} min-w-0 overflow-hidden rounded-2xl border border-card-border bg-card p-6 shadow-sm sm:p-8`}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">
          Platform Detection
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-text-primary">Commerce Platform</h2>
        <PlatformDetectionIntro showInternalEvidence={showInternal} />

        <dl className="mt-6 grid gap-6 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-text-secondary">Platform</dt>
            <dd className="mt-1 text-lg font-semibold text-text-primary">
              <PlatformValue platform={platform.platform} />
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-text-secondary">Confidence</dt>
            <dd className="mt-2">
              <ConfidenceBadge confidence={platform.confidence} />
            </dd>
          </div>
        </dl>

        <p className="mt-6 text-sm text-text-secondary">
          {report.technologyDetection.publicDetectionSummary}
        </p>

        {isPlatformNotIdentified(platform.platform) ? (
          <OtherPlatformDetectionDetails
            auditUrl={report.url}
            scanContext={scanContext}
          />
        ) : null}

        {showInternal ? (
          <div className="mt-6 rounded-xl border border-card-border bg-card-muted p-4">
            <h3 className="text-sm font-medium text-text-secondary">Internal detection evidence</h3>
            <dl className="mt-3 grid gap-3 text-xs text-text-secondary sm:grid-cols-2">
              <div>
                <dt>Matched signal categories</dt>
                <dd className="mt-1 text-text-primary">
                  {report.technologyDetection.internalDetectionEvidence.matchedSignalCategories.join(", ") ||
                    "None"}
                </dd>
              </div>
              <div>
                <dt>Detection notes</dt>
                <dd className="mt-1 text-text-primary">
                  {report.technologyDetection.internalDetectionEvidence.detectionNotes.slice(0, 3).join(" · ") ||
                    "None"}
                </dd>
              </div>
            </dl>
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-card-border bg-card p-6 text-sm text-text-secondary">
        <p>
          Audited URL:{" "}
          <a
            href={report.url}
            target="_blank"
            rel="noopener noreferrer"
            className="break-all text-blue-900 hover:underline dark:text-blue-300"
          >
            {normalizeDomainFromUrl(report.url)}
          </a>
        </p>
        <p className="mt-2">
          Partial reports are excluded from readiness benchmarks and average score calculations.
        </p>
      </section>
    </div>
  );
}

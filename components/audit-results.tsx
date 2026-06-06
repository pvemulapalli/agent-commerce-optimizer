"use client";

import { AuditNextSteps } from "@/components/audit-next-steps";
import { AuditConfidenceSection } from "@/components/audit-confidence-section";
import { AuditMetadataCard } from "@/components/audit-metadata-card";
import { AuditStickyNav } from "@/components/audit-sticky-nav";
import { BenchmarkCard } from "@/components/benchmark-card";
import {
  OtherPlatformDetectionDetails,
  PlatformValue,
} from "@/components/other-platform-detection";
import { PlatformFeedbackModal } from "@/components/platform-feedback-modal";
import { isPlatformNotIdentified, shouldShowPlatformFeedback } from "@/lib/platform-labels";
import { normalizeDomainFromUrl } from "@/lib/domain-normalization";
import { FindingCard } from "@/components/finding-card";
import { GeneratedFixesSection } from "@/components/generated-fixes-section";
import {
  ExecutiveSummaryPanel,
  ReadinessDashboard,
  RecommendationsSection,
} from "@/components/readiness-dashboard";
import type { EnrichedAuditResponse } from "@/lib/enrich-audit-response";
import { buildReadinessReport } from "@/lib/readiness-score";
import { AUDIT_SECTION_SCROLL_CLASS } from "@/lib/scroll-utils";
import type { ConfidenceLevel, Finding, GenerateFixesApiResponse, PlatformAnalysis } from "@/lib/types";

type FixesResponse = GenerateFixesApiResponse;

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

function PlatformAnalysisSection({
  platform,
  auditUrl,
}: {
  platform: PlatformAnalysis;
  auditUrl: string;
}) {
  return (
    <section
      id="platform-detection"
      className={`${AUDIT_SECTION_SCROLL_CLASS} min-w-0 overflow-hidden rounded-2xl border border-card-border bg-card p-6 shadow-sm sm:p-8`}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">
        Platform Detection
      </p>
      <h2 className="mt-2 text-2xl font-semibold text-text-primary">Commerce Platform</h2>
      <p className="mt-2 text-sm text-text-secondary">
        Platform signals detected from storefront assets, URL structures, and crawled pages.
      </p>

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

      {isPlatformNotIdentified(platform.platform) ? (
        <OtherPlatformDetectionDetails auditUrl={auditUrl} />
      ) : shouldShowPlatformFeedback(platform) ? (
        <div className="mt-6 rounded-xl border border-card-border bg-card-muted p-4">
          <p className="text-sm text-text-secondary">
            Platform confidence is low. If this detection looks wrong, help us improve coverage.
          </p>
          <div className="mt-3">
            <PlatformFeedbackModal
              domain={normalizeDomainFromUrl(auditUrl)}
              defaultPlatform={platform.platform}
            />
          </div>
        </div>
      ) : null}

      <div className="mt-6">
        <h3 className="text-sm font-medium text-text-secondary">Evidence</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-text-primary">
          {platform.evidence.map((item) => (
            <li key={item} className="break-words">
              {item}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function FindingSection({
  sectionId,
  title,
  description,
  findings,
  accent,
}: {
  sectionId: string;
  title: string;
  description: string;
  findings: Finding[];
  accent: "emerald" | "rose" | "amber";
}) {
  if (findings.length === 0) return null;

  const accentClasses = {
    emerald:
      "border-emerald-200 bg-emerald-50 dark:border-emerald-500/40 dark:bg-emerald-950/50",
    rose: "border-rose-200 bg-rose-50 dark:border-rose-500/40 dark:bg-rose-950/50",
    amber: "border-amber-200 bg-amber-50 dark:border-amber-500/40 dark:bg-amber-950/50",
  }[accent];

  const titleColor = {
    emerald: "text-emerald-950 dark:text-emerald-100",
    rose: "text-rose-950 dark:text-rose-100",
    amber: "text-amber-950 dark:text-amber-100",
  }[accent];

  const descriptionColor = {
    emerald: "text-emerald-900 dark:text-emerald-100/90",
    rose: "text-rose-900 dark:text-rose-100/90",
    amber: "text-amber-900 dark:text-amber-100/90",
  }[accent];

  return (
    <section id={sectionId} className={`${AUDIT_SECTION_SCROLL_CLASS} min-w-0 space-y-4`}>
      <div className={`rounded-2xl border p-5 ${accentClasses}`}>
        <h2 className={`text-xl font-semibold ${titleColor}`}>{title}</h2>
        <p className={`mt-1 text-sm ${descriptionColor}`}>{description}</p>
        <p className={`mt-2 text-sm font-semibold ${titleColor}`}>
          {findings.length} Finding{findings.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="grid min-w-0 gap-4">
        {findings.map((finding) => (
          <FindingCard key={finding.id} finding={finding} />
        ))}
      </div>
    </section>
  );
}

export function AuditResultsSection({
  result,
  fixes,
  fixesLoading,
  fixesError,
  onRegenerateFixes,
}: {
  result: EnrichedAuditResponse;
  fixes: FixesResponse | null;
  fixesLoading: boolean;
  fixesError: string | null;
  onRegenerateFixes: () => void;
}) {
  const report = buildReadinessReport(result);
  const detectedCount = result.grouped.detected.length;
  const missingCount = result.grouped.missing.length;
  const needsReviewCount = result.grouped.needsReview.length;

  const visibleSections = [
    "overview",
    "next-steps",
    "platform-detection",
    detectedCount > 0 ? "findings-detected" : null,
    missingCount > 0 ? "findings-missing" : null,
    needsReviewCount > 0 ? "findings-needs-review" : null,
    "generated-assets",
    "recommendations",
  ].filter((section): section is string => Boolean(section));

  return (
    <div className="min-w-0 space-y-8 [overflow-anchor:none]">
      <AuditStickyNav
        visibleSections={visibleSections}
        resetKey={`${result.url}-${result.crawledAt}`}
      />

      <ReadinessDashboard
        report={report}
        merchantName={result.auditMetadata.merchantName}
        normalizedDomain={result.auditMetadata.normalizedDomain}
        auditedUrl={result.url}
        detectedCount={detectedCount}
        missingCount={missingCount}
        needsReviewCount={needsReviewCount}
      />

      <AuditMetadataCard metadata={result.auditMetadata} />
      <AuditConfidenceSection confidence={result.auditConfidence} />
      <BenchmarkCard benchmark={result.benchmark} />

      <ExecutiveSummaryPanel report={report} />

      <section className="rounded-2xl border border-card-border bg-card p-6 shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">
          Report Details
        </p>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="min-w-0">
            <dt className="text-sm font-medium text-text-secondary">Scanned URL</dt>
            <dd className="mt-1 break-all text-text-primary">{result.url}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-text-secondary">Cache Status</dt>
            <dd className="mt-1 font-medium text-text-primary">{result.cacheStatus}</dd>
          </div>
          {result.expiresAt && (
            <div>
              <dt className="text-sm font-medium text-text-secondary">Cache Expires At</dt>
              <dd className="mt-1 text-text-primary">
                {new Date(result.expiresAt).toLocaleString()}
              </dd>
            </div>
          )}
        </dl>
      </section>

      <AuditNextSteps sectionId="next-steps" />

      <PlatformAnalysisSection platform={result.platform} auditUrl={result.url} />

      <FindingSection
        sectionId="findings-detected"
        title="Detected"
        description="Signals found with direct evidence from crawled pages or discovery files."
        findings={result.grouped.detected}
        accent="emerald"
      />

      <FindingSection
        sectionId="findings-missing"
        title="Missing Findings"
        description="Expected signals that were not found during the crawl."
        findings={result.grouped.missing}
        accent="rose"
      />

      <FindingSection
        sectionId="findings-needs-review"
        title="Needs Review"
        description="Partial or ambiguous signals that may require manual verification."
        findings={result.grouped.needsReview}
        accent="amber"
      />

      <div id="generated-assets" className={AUDIT_SECTION_SCROLL_CLASS}>
        <GeneratedFixesSection
          fixes={fixes}
          loading={fixesLoading}
          error={fixesError}
          onRegenerate={onRegenerateFixes}
        />
      </div>

      <RecommendationsSection report={report} />

      <AuditNextSteps sectionId="next-steps-bottom" showIntro={false} />
    </div>
  );
}

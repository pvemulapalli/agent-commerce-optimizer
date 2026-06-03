"use client";

import { AuditStickyNav } from "@/components/audit-sticky-nav";
import { FindingCard } from "@/components/finding-card";
import { GeneratedFixesSection } from "@/components/generated-fixes-section";
import {
  ExecutiveSummaryPanel,
  ReadinessDashboard,
  RecommendationsSection,
} from "@/components/readiness-dashboard";
import { buildReadinessReport } from "@/lib/readiness-score";
import type {
  AuditApiResponse,
  Finding,
  GenerateFixesApiResponse,
  PlatformAnalysis,
} from "@/lib/types";

type AuditResponse = AuditApiResponse;
type FixesResponse = GenerateFixesApiResponse;

function PlatformAnalysisSection({ platform }: { platform: PlatformAnalysis }) {
  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        Platform Detection
      </p>
      <h2 className="mt-2 text-2xl font-semibold text-slate-900">Commerce Platform</h2>
      <p className="mt-2 text-sm text-slate-600">
        Platform signals detected from storefront assets, URL structures, and crawled pages.
      </p>

      <dl className="mt-6 grid gap-6 sm:grid-cols-2">
        <div>
          <dt className="text-sm font-medium text-slate-500">Detected Platform</dt>
          <dd className="mt-1 text-lg font-semibold text-slate-900">{platform.platform}</dd>
        </div>
        <div>
          <dt className="text-sm font-medium text-slate-500">Detection Confidence</dt>
          <dd className="mt-1 text-lg font-semibold capitalize text-slate-900">
            {platform.confidence}
          </dd>
        </div>
      </dl>

      <div className="mt-6">
        <h3 className="text-sm font-medium text-slate-500">Evidence</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-800">
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
    emerald: "border-emerald-200 bg-emerald-50/60",
    rose: "border-rose-200 bg-rose-50/60",
    amber: "border-amber-200 bg-amber-50/60",
  }[accent];

  return (
    <section id={sectionId} className="scroll-mt-28 min-w-0 space-y-4">
      <div className={`rounded-2xl border p-5 ${accentClasses}`}>
        <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
        <p className="mt-1 text-sm text-slate-600">{description}</p>
        <p className="mt-2 text-sm font-medium text-slate-700">
          {findings.length} finding{findings.length === 1 ? "" : "s"}
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
  result: AuditResponse;
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
    detectedCount > 0 ? "findings-detected" : null,
    missingCount > 0 ? "findings-missing" : null,
    needsReviewCount > 0 ? "findings-needs-review" : null,
    "generated-assets",
    "recommendations",
  ].filter((section): section is string => Boolean(section));

  return (
    <div className="min-w-0 space-y-8">
      <AuditStickyNav visibleSections={visibleSections} />

      <ReadinessDashboard
        report={report}
        detectedCount={detectedCount}
        missingCount={missingCount}
        needsReviewCount={needsReviewCount}
      />

      <ExecutiveSummaryPanel report={report} />

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Audit Metadata
        </p>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="min-w-0">
            <dt className="text-sm font-medium text-slate-500">Audited URL</dt>
            <dd className="mt-1 break-all text-slate-900">{result.url}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-slate-500">Cache Status</dt>
            <dd className="mt-1 font-medium text-slate-900">{result.cacheStatus}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-slate-500">Crawled At</dt>
            <dd className="mt-1 text-slate-900">
              {new Date(result.crawledAt).toLocaleString()}
            </dd>
          </div>
          {result.expiresAt && (
            <div>
              <dt className="text-sm font-medium text-slate-500">Cache Expires At</dt>
              <dd className="mt-1 text-slate-900">
                {new Date(result.expiresAt).toLocaleString()}
              </dd>
            </div>
          )}
        </dl>
      </section>

      <PlatformAnalysisSection platform={result.platform} />

      <FindingSection
        sectionId="findings-detected"
        title="Detected"
        description="Signals found with direct evidence from crawled pages or discovery files."
        findings={result.grouped.detected}
        accent="emerald"
      />

      <FindingSection
        sectionId="findings-missing"
        title="Missing"
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

      <div id="generated-assets" className="scroll-mt-28">
        <GeneratedFixesSection
          fixes={fixes}
          loading={fixesLoading}
          error={fixesError}
          onRegenerate={onRegenerateFixes}
        />
      </div>

      <RecommendationsSection report={report} />
    </div>
  );
}

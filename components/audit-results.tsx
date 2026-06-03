"use client";

import { GeneratedFixesSection } from "@/components/generated-fixes-section";
import {
  computeDiscoverabilityScore,
  getDiscoverabilityScoreLabel,
} from "@/lib/discoverability-score";
import type {
  AuditApiResponse,
  ConfidenceLevel,
  Finding,
  FindingStatus,
  GenerateFixesApiResponse,
  PlatformAnalysis,
} from "@/lib/types";

type AuditResponse = AuditApiResponse;
type FixesResponse = GenerateFixesApiResponse;

function formatStatusLabel(status: FindingStatus): string {
  if (status === "needs_review") {
    return "Needs Review";
  }

  return status.charAt(0).toUpperCase() + status.slice(1);
}

function ConfidenceBadge({ confidence }: { confidence: ConfidenceLevel }) {
  const classes = {
    high: "bg-emerald-100 text-emerald-800",
    medium: "bg-sky-100 text-sky-800",
    low: "bg-zinc-100 text-zinc-700",
  }[confidence];

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${classes}`}
    >
      Confidence: {confidence}
    </span>
  );
}

function StatusBadge({ status }: { status: FindingStatus }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
        status === "detected"
          ? "bg-emerald-50 text-emerald-700"
          : status === "missing"
            ? "bg-rose-50 text-rose-700"
            : "bg-amber-50 text-amber-700"
      }`}
    >
      Status: {formatStatusLabel(status)}
    </span>
  );
}

function FindingCard({ finding }: { finding: Finding }) {
  return (
    <article className="min-w-0 overflow-hidden rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="text-base font-semibold text-zinc-900">{finding.label}</h3>
        <div className="flex flex-wrap gap-2">
          <ConfidenceBadge confidence={finding.confidence} />
          <StatusBadge status={finding.status} />
        </div>
      </div>

      <dl className="mt-4 space-y-3 text-sm">
        <div>
          <dt className="font-medium text-zinc-500">Evidence</dt>
          <dd className="mt-1 break-words text-zinc-800">{finding.evidence}</dd>
        </div>

        {finding.evidenceUrls.length > 0 && (
          <div>
            <dt className="font-medium text-zinc-500">Evidence URLs</dt>
            <dd className="mt-1 space-y-1">
              {finding.evidenceUrls.map((evidenceUrl) => (
                <div key={evidenceUrl} className="break-all">
                  <a
                    href={evidenceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:text-indigo-700 hover:underline"
                  >
                    {evidenceUrl}
                  </a>
                </div>
              ))}
            </dd>
          </div>
        )}

        {finding.discoveredFromUrl && (
          <div>
            <dt className="font-medium text-zinc-500">Discovered From URL</dt>
            <dd className="mt-1 break-all">
              <a
                href={finding.discoveredFromUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 hover:text-indigo-700 hover:underline"
              >
                {finding.discoveredFromUrl}
              </a>
            </dd>
          </div>
        )}

        <div>
          <dt className="font-medium text-zinc-500">Source URL</dt>
          <dd className="mt-1 break-all">
            <a
              href={finding.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 hover:text-indigo-700 hover:underline"
            >
              {finding.sourceUrl}
            </a>
          </dd>
        </div>
      </dl>
    </article>
  );
}

function ExecutiveSummary({ result }: { result: AuditResponse }) {
  const detectedCount = result.grouped.detected.length;
  const missingCount = result.grouped.missing.length;
  const needsReviewCount = result.grouped.needsReview.length;
  const score = computeDiscoverabilityScore(result.grouped);
  const scoreLabel = getDiscoverabilityScoreLabel(score);

  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-blue-200 bg-blue-50/40 p-6 shadow-sm sm:p-8">
      <p className="text-sm font-semibold uppercase tracking-[0.15em] text-blue-900">
        Executive Summary
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-blue-200 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            AI Discoverability Score
          </p>
          <p className="mt-2 text-4xl font-semibold tabular-nums text-slate-900">
            {score}
            <span className="text-lg font-medium text-slate-500">/100</span>
          </p>
          <p className="mt-1 text-sm text-slate-600">{scoreLabel}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Detected Count
          </p>
          <p className="mt-2 text-4xl font-semibold tabular-nums text-emerald-700">
            {detectedCount}
          </p>
        </div>
        <div className="rounded-xl border border-rose-200 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Missing Count
          </p>
          <p className="mt-2 text-4xl font-semibold tabular-nums text-rose-700">
            {missingCount}
          </p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Needs Review Count
          </p>
          <p className="mt-2 text-4xl font-semibold tabular-nums text-amber-700">
            {needsReviewCount}
          </p>
        </div>
      </div>
    </section>
  );
}

function FindingsJumpNav({
  detectedCount,
  missingCount,
  needsReviewCount,
}: {
  detectedCount: number;
  missingCount: number;
  needsReviewCount: number;
}) {
  const links = [
    { id: "findings-detected", label: "Detected", count: detectedCount },
    { id: "findings-missing", label: "Missing", count: missingCount },
    {
      id: "findings-needs-review",
      label: "Needs Review",
      count: needsReviewCount,
    },
  ].filter((link) => link.count > 0);

  if (links.length === 0) {
    return null;
  }

  function scrollToSection(sectionId: string) {
    document.getElementById(sectionId)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  return (
    <nav
      aria-label="Jump to findings"
      className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-4"
    >
      {links.map((link) => (
        <button
          key={link.id}
          type="button"
          onClick={() => scrollToSection(link.id)}
          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          [{link.label}]
        </button>
      ))}
    </nav>
  );
}

function PlatformAnalysisSection({ platform }: { platform: PlatformAnalysis }) {
  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-indigo-200 bg-indigo-50/50 p-6 shadow-sm sm:p-8">
      <h2 className="text-2xl font-semibold text-zinc-900">Platform Analysis</h2>
      <p className="mt-1 text-sm text-zinc-600">
        Commerce platform signals detected from storefront assets, URL structures,
        and crawled pages.
      </p>

      <dl className="mt-6 grid gap-6 sm:grid-cols-2">
        <div>
          <dt className="text-sm font-medium text-zinc-500">Detected Platform</dt>
          <dd className="mt-1 text-lg font-semibold text-zinc-900">
            {platform.platform}
          </dd>
        </div>
        <div>
          <dt className="text-sm font-medium text-zinc-500">Confidence</dt>
          <dd className="mt-2">
            <ConfidenceBadge confidence={platform.confidence} />
          </dd>
        </div>
      </dl>

      <div className="mt-6">
        <h3 className="text-sm font-medium text-zinc-500">Evidence</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-800">
          {platform.evidence.map((item) => (
            <li key={item} className="break-words">
              {item}
            </li>
          ))}
        </ul>
      </div>

      {platform.sourceUrls.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-medium text-zinc-500">Source URLs</h3>
          <ul className="mt-2 space-y-1 text-sm">
            {platform.sourceUrls.map((sourceUrl) => (
              <li key={sourceUrl} className="break-all">
                <a
                  href={sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 hover:text-indigo-700 hover:underline"
                >
                  {sourceUrl}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
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
    <section id={sectionId} className="scroll-mt-24 min-w-0 space-y-4">
      <div className={`rounded-2xl border p-5 ${accentClasses}`}>
        <h2 className="text-xl font-semibold text-zinc-900">{title}</h2>
        <p className="mt-1 text-sm text-zinc-600">{description}</p>
        <p className="mt-2 text-sm font-medium text-zinc-700">
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
  const detectedCount = result.grouped.detected.length;
  const missingCount = result.grouped.missing.length;
  const needsReviewCount = result.grouped.needsReview.length;

  return (
    <div className="min-w-0 space-y-10">
      <ExecutiveSummary result={result} />

      <section className="min-w-0 overflow-hidden rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.15em] text-indigo-600">
          Audit Results
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-zinc-900">Summary</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="min-w-0">
            <dt className="text-sm font-medium text-zinc-500">Audited URL</dt>
            <dd className="mt-1 break-all text-zinc-900">{result.url}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-zinc-500">Cache Status</dt>
            <dd className="mt-1 font-medium text-zinc-900">{result.cacheStatus}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-zinc-500">Crawled At</dt>
            <dd className="mt-1 text-zinc-900">
              {new Date(result.crawledAt).toLocaleString()}
            </dd>
          </div>
          {result.expiresAt && (
            <div>
              <dt className="text-sm font-medium text-zinc-500">Cache Expires At</dt>
              <dd className="mt-1 text-zinc-900">
                {new Date(result.expiresAt).toLocaleString()}
              </dd>
            </div>
          )}
        </dl>
      </section>

      <FindingsJumpNav
        detectedCount={detectedCount}
        missingCount={missingCount}
        needsReviewCount={needsReviewCount}
      />

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

      <GeneratedFixesSection
        fixes={fixes}
        loading={fixesLoading}
        error={fixesError}
        onRegenerate={onRegenerateFixes}
      />
    </div>
  );
}

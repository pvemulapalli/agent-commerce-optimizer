"use client";

import { GradeBadge } from "@/components/grade-badge";
import { PlatformLabel } from "@/components/platform-label";
import { PlatformReadinessCards } from "@/components/platform-readiness-cards";
import {
  trackExampleReportClicked,
  trackRecentScanClickedFromEntry,
} from "@/lib/analytics-events";
import { scanContextFromRecentScan } from "@/lib/analytics-properties";
import type { PlatformLeaderboardStat } from "@/lib/platform-leaderboard";
import type { RecentAuditSortDirection, RecentAuditSortField } from "@/lib/recent-audits-query";
import { buildRecentReportUrl } from "@/lib/recent-scan-links";
import type { RecentScanRecord } from "@/lib/scan-activity-types";
import Link from "next/link";

function formatTimestamp(timestamp: string): string {
  return new Date(timestamp).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function RecentAuditSiteLink({
  entry,
  className = "",
}: {
  entry: RecentScanRecord;
  className?: string;
}) {
  return (
    <a
      href={entry.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`break-all text-xs text-blue-900 hover:underline dark:text-blue-300 ${className}`}
    >
      {entry.hostname}
    </a>
  );
}

function handleRecentScanLinkClick(entry: RecentScanRecord) {
  trackRecentScanClickedFromEntry(entry);
}

function RecentAuditSummaryCard({
  entry,
  linkable = false,
}: {
  entry: RecentScanRecord;
  linkable?: boolean;
}) {
  const isPartial = entry.reportType === "partial";
  const cardBody = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-slate-900 dark:text-slate-100">{entry.merchant}</p>
          {isPartial ? (
            <p className="mt-1 text-xs font-medium uppercase tracking-wide text-amber-700 dark:text-amber-300">
              Partial Report · No Score
            </p>
          ) : null}
          {linkable ? (
            <span className="mt-1 block break-all text-xs text-slate-500 dark:text-slate-400">
              {entry.hostname}
            </span>
          ) : (
            <RecentAuditSiteLink
              entry={entry}
              className="mt-1 text-slate-500 hover:text-blue-900 dark:text-slate-400 dark:hover:text-blue-300"
            />
          )}
        </div>
        <GradeBadge grade={isPartial ? "—" : entry.grade || "-"} />
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Score
          </dt>
          <dd className="mt-1 font-semibold tabular-nums text-slate-900 dark:text-slate-100">
            {isPartial ? "Partial" : (entry.readinessScore ?? "-")}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Platform
          </dt>
          <dd className="mt-1 font-medium text-slate-800 dark:text-slate-200">
            <PlatformLabel platform={entry.platform} />
          </dd>
        </div>
        <div className="col-span-2">
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Top Gap
          </dt>
          <dd className="mt-1 text-slate-700 dark:text-slate-300">{entry.topGap || "-"}</dd>
        </div>
      </dl>

      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
        {formatTimestamp(entry.scannedAt)}
      </p>
      {linkable ? (
        <p className="mt-3 text-xs font-medium text-blue-900 dark:text-blue-300">View full report →</p>
      ) : (
        <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">Summary only</p>
      )}
    </>
  );

  if (linkable) {
    return (
      <Link
        href={buildRecentReportUrl(entry)}
        onClick={() => handleRecentScanLinkClick(entry)}
        className="block rounded-xl border border-blue-200 bg-blue-50/40 p-4 transition hover:border-blue-300 hover:bg-blue-50 hover:shadow-sm dark:border-blue-800/60 dark:bg-blue-950/20 dark:hover:border-blue-700 dark:hover:bg-blue-950/40"
      >
        {cardBody}
      </Link>
    );
  }

  return (
    <div className="rounded-xl border border-card-border bg-card p-4 opacity-95">{cardBody}</div>
  );
}

export function RecentAuditsList({
  entries,
  emptyMessage = "No scans recorded yet. Run the first scan from the homepage.",
  sort,
  direction,
  onSortChange,
  linkableEntryIds,
}: {
  entries: RecentScanRecord[];
  emptyMessage?: string;
  sort?: RecentAuditSortField;
  direction?: RecentAuditSortDirection;
  onSortChange?: (field: RecentAuditSortField) => void;
  /** Scan IDs (typically the 6 most recent) that open the full homepage report. */
  linkableEntryIds?: Set<string>;
}) {
  function isLinkable(entry: RecentScanRecord): boolean {
    return linkableEntryIds?.has(entry.id) ?? false;
  }
  function renderSortHeader(field: RecentAuditSortField, label: string) {
    if (!onSortChange) {
      return label;
    }

    const isActive = sort === field;

    return (
      <button
        type="button"
        onClick={() => onSortChange(field)}
        className="inline-flex items-center gap-1 font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
      >
        {label}
        {isActive ? (direction === "asc" ? "↑" : "↓") : null}
      </button>
    );
  }
  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-card-border bg-card px-6 py-10 text-center">
        <p className="text-sm text-text-secondary">
          {emptyMessage}
        </p>
        <Link
          href="/"
          className="mt-4 inline-block text-sm font-medium text-blue-900 hover:underline dark:text-blue-300"
        >
          Run a scan
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3 md:hidden">
        {entries.map((entry, index) => (
          <RecentAuditSummaryCard
            key={`${entry.id}-${entry.scannedAt}-${index}-mobile`}
            entry={entry}
            linkable={isLinkable(entry)}
          />
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-xl border border-card-border bg-card md:block">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm dark:divide-slate-700">
            <thead className="bg-card-muted">
              <tr>
                <th className="px-4 py-3">{renderSortHeader("domain", "Domain")}</th>
                <th className="px-4 py-3">{renderSortHeader("grade", "Grade")}</th>
                <th className="px-4 py-3">{renderSortHeader("score", "Score")}</th>
                <th className="px-4 py-3">{renderSortHeader("platform", "Platform")}</th>
                <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Top Gap</th>
                <th className="px-4 py-3">{renderSortHeader("scannedAt", "Scanned")}</th>
                {linkableEntryIds ? (
                  <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Report</th>
                ) : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {entries.map((entry, index) => {
                const linkable = isLinkable(entry);
                const rowClass = linkable
                  ? "align-top bg-blue-50/30 transition hover:bg-blue-50/70 dark:bg-blue-950/10 dark:hover:bg-blue-950/25"
                  : "align-top text-slate-600 dark:text-slate-400";

                return (
                  <tr key={`${entry.id}-${entry.scannedAt}-${index}`} className={rowClass}>
                    <td className="px-4 py-4">
                      {linkable ? (
                        <Link
                          href={buildRecentReportUrl(entry)}
                          onClick={() => handleRecentScanLinkClick(entry)}
                          className="group block min-w-0 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                        >
                          <div className="font-medium text-slate-900 group-hover:text-blue-900 dark:text-slate-100 dark:group-hover:text-blue-300">
                            {entry.merchant}
                          </div>
                          <span className="mt-1 block max-w-xs text-xs text-slate-500 group-hover:text-blue-800 dark:text-slate-400 dark:group-hover:text-blue-300">
                            {entry.hostname}
                          </span>
                        </Link>
                      ) : (
                        <>
                          <div className="font-medium text-slate-800 dark:text-slate-300">{entry.merchant}</div>
                          <RecentAuditSiteLink
                            entry={entry}
                            className="mt-1 block max-w-xs text-slate-500 dark:text-slate-500"
                          />
                        </>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <GradeBadge grade={entry.grade || "-"} />
                    </td>
                    <td className="px-4 py-4 font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                      {entry.readinessScore ?? "-"}
                    </td>
                    <td className="px-4 py-4 text-slate-800 dark:text-slate-200">
                      <PlatformLabel platform={entry.platform} />
                    </td>
                    <td className="px-4 py-4 text-slate-700 dark:text-slate-300">{entry.topGap || "-"}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-slate-700 dark:text-slate-300">
                      {formatTimestamp(entry.scannedAt)}
                    </td>
                    {linkableEntryIds ? (
                      <td className="px-4 py-4 whitespace-nowrap">
                        {linkable ? (
                          <Link
                            href={buildRecentReportUrl(entry)}
                            onClick={() => handleRecentScanLinkClick(entry)}
                            className="inline-flex items-center rounded-full border border-blue-200 bg-white px-3 py-1 text-xs font-semibold text-blue-900 transition hover:border-blue-300 hover:bg-blue-50 dark:border-blue-700 dark:bg-slate-900 dark:text-blue-200 dark:hover:bg-blue-950/50"
                          >
                            View report
                          </Link>
                        ) : (
                          <span className="text-xs text-slate-400 dark:text-slate-500">Summary only</span>
                        )}
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function handleExampleReportClick(entry: RecentScanRecord) {
  trackExampleReportClicked({
    ...scanContextFromRecentScan(entry),
    reportId: entry.reportId ?? null,
  });
}

function ExampleReportCard({ entry }: { entry: RecentScanRecord }) {
  const isPartial = entry.reportType === "partial";

  return (
    <Link
      href={buildRecentReportUrl(entry)}
      onClick={() => handleExampleReportClick(entry)}
      className="group flex min-h-[168px] w-full min-w-0 flex-col rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-left transition hover:-translate-y-0.5 hover:border-blue-300 hover:bg-white hover:shadow-md dark:border-slate-700 dark:bg-slate-900/70 dark:hover:border-blue-600 dark:hover:bg-slate-900"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="line-clamp-1 min-w-0 flex-1 font-semibold text-slate-900 group-hover:text-blue-900 dark:text-slate-100 dark:group-hover:text-blue-200">
          {entry.merchant}
        </p>
        <GradeBadge grade={isPartial ? "—" : entry.grade || "-"} />
      </div>

      <p className="mt-1 line-clamp-1 text-xs text-slate-500 dark:text-slate-400">{entry.hostname}</p>

      {isPartial ? (
        <p className="mt-2 text-xs font-medium uppercase tracking-wide text-amber-700 dark:text-amber-300">
          Partial report
        </p>
      ) : null}

      <div className="mt-auto grid min-w-0 grid-cols-3 gap-3 pt-4 text-sm">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Score</p>
          <p className="mt-0.5 truncate font-semibold tabular-nums text-slate-900 dark:text-slate-100">
            {isPartial ? "Partial" : (entry.readinessScore ?? "-")}
          </p>
        </div>
        <div className="min-w-0 overflow-hidden">
          <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Platform</p>
          <div className="mt-0.5 min-w-0 font-medium text-slate-800 dark:text-slate-200">
            <PlatformLabel platform={entry.platform} truncate />
          </div>
        </div>
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Top gap</p>
          <p className="mt-0.5 truncate font-medium text-slate-800 dark:text-slate-200">
            {entry.topGap || "-"}
          </p>
        </div>
      </div>

      <p className="mt-4 text-sm font-semibold text-blue-900 group-hover:underline dark:text-blue-300">
        View Report →
      </p>
    </Link>
  );
}

export function RecentAuditsPreview({
  entries,
  totalCount,
  loading,
  platformStats = [],
  variant = "full",
}: {
  entries: RecentScanRecord[];
  totalCount: number;
  loading: boolean;
  platformStats?: PlatformLeaderboardStat[];
  variant?: "homepage" | "full";
}) {
  const isHomepage = variant === "homepage";

  return (
    <div className="space-y-8">
      {!isHomepage && platformStats.length > 0 ? (
        <PlatformReadinessCards stats={platformStats} />
      ) : null}

    <section className="rounded-2xl border border-card-border bg-card p-6 shadow-sm sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          {isHomepage ? (
            <>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
                Example reports
              </p>
              <h2 className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-100">
                Example Reports
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
                See real storefront assessments and readiness reports.
              </p>
            </>
          ) : (
            <>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
                Global activity
              </p>
              <h2 className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-100">Recent scans</h2>
            </>
          )}
        </div>
        <Link
          href="/recent"
          className="text-sm font-medium text-blue-900 hover:underline dark:text-blue-300"
        >
          {isHomepage ? "View all example reports" : "View all recent scans"}
        </Link>
      </div>

      {!isHomepage ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-card-border bg-card-muted px-4 py-5">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Unique Merchant Domains Scanned
            </p>
            <p className="mt-2 text-3xl font-semibold tabular-nums text-slate-900 dark:text-slate-100">
              {loading ? "-" : totalCount.toLocaleString()}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-5 sm:col-span-2 dark:border-slate-700 dark:bg-slate-800/50">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Latest scan
            </p>
            {!loading && entries[0] ? (
              <div className="mt-2 min-w-0">
                <p className="font-medium text-slate-900 dark:text-slate-100">{entries[0].merchant}</p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  Grade {entries[0].grade} · Score {entries[0].readinessScore} ·{" "}
                  <PlatformLabel platform={entries[0].platform} />
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Top gap: {entries[0].topGap} · {formatTimestamp(entries[0].scannedAt)}
                </p>
              </div>
            ) : (
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                {loading
                  ? "Loading scan activity…"
                  : "No scans yet. Run the first scan above."}
              </p>
            )}
          </div>
        </div>
      ) : null}

      {loading && isHomepage ? (
        <p className="mt-6 text-sm text-text-secondary">Loading example reports…</p>
      ) : null}

      {!loading && entries.length > 0 && (
        <div className="mt-6 grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {entries.slice(0, 6).map((entry, index) => (
            <ExampleReportCard key={`${entry.id}-${entry.scannedAt}-${index}`} entry={entry} />
          ))}
        </div>
      )}

      {!loading && entries.length === 0 && isHomepage ? (
        <p className="mt-6 text-sm text-text-secondary">
          No example reports yet. Run the first readiness assessment above.
        </p>
      ) : null}
    </section>
    </div>
  );
}

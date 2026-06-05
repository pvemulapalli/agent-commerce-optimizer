"use client";

import { GradeBadge } from "@/components/grade-badge";
import { PlatformLabel } from "@/components/platform-label";
import { PlatformReadinessCards } from "@/components/platform-readiness-cards";
import type { PlatformReadinessStat } from "@/lib/platform-readiness-stats";
import type { RecentAuditSortDirection, RecentAuditSortField } from "@/lib/recent-audits-query";
import type { RecentScanRecord } from "@/lib/scan-activity";
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

function RecentAuditSummaryCard({ entry }: { entry: RecentScanRecord }) {
  return (
    <div className="rounded-xl border border-card-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-slate-900 dark:text-slate-100">{entry.merchant}</p>
          <RecentAuditSiteLink
            entry={entry}
            className="mt-1 text-slate-500 hover:text-blue-900 dark:text-slate-400 dark:hover:text-blue-300"
          />
        </div>
        <GradeBadge grade={entry.grade || "—"} />
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Score
          </dt>
          <dd className="mt-1 font-semibold tabular-nums text-slate-900 dark:text-slate-100">
            {entry.readinessScore ?? "—"}
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
          <dd className="mt-1 text-slate-700 dark:text-slate-300">{entry.topGap || "—"}</dd>
        </div>
      </dl>

      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
        {formatTimestamp(entry.scannedAt)}
      </p>
    </div>
  );
}

export function RecentAuditsList({
  entries,
  emptyMessage = "No scans recorded yet. Run the first audit from the homepage.",
  sort,
  direction,
  onSortChange,
}: {
  entries: RecentScanRecord[];
  emptyMessage?: string;
  sort?: RecentAuditSortField;
  direction?: RecentAuditSortDirection;
  onSortChange?: (field: RecentAuditSortField) => void;
}) {
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
          Run an audit
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
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {entries.map((entry, index) => (
                <tr key={`${entry.id}-${entry.scannedAt}-${index}`} className="align-top">
                  <td className="px-4 py-4">
                    <div className="font-medium text-slate-900 dark:text-slate-100">{entry.merchant}</div>
                    <RecentAuditSiteLink
                      entry={entry}
                      className="mt-1 block max-w-xs text-slate-500 hover:text-blue-900 dark:text-slate-400 dark:hover:text-blue-300"
                    />
                  </td>
                  <td className="px-4 py-4">
                    <GradeBadge grade={entry.grade || "—"} />
                  </td>
                  <td className="px-4 py-4 font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                    {entry.readinessScore ?? "—"}
                  </td>
                  <td className="px-4 py-4 text-slate-800 dark:text-slate-200">
                    <PlatformLabel platform={entry.platform} />
                  </td>
                  <td className="px-4 py-4 text-slate-700 dark:text-slate-300">{entry.topGap || "—"}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-slate-700 dark:text-slate-300">
                    {formatTimestamp(entry.scannedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function RecentAuditCard({
  entry,
  onSelectEntry,
  compact = false,
  loading = false,
}: {
  entry: RecentScanRecord;
  onSelectEntry?: (entry: RecentScanRecord) => void;
  compact?: boolean;
  loading?: boolean;
}) {
  const isClickable = Boolean(onSelectEntry) && !loading;

  return (
    <button
      type="button"
      disabled={!isClickable}
      onClick={isClickable ? () => onSelectEntry?.(entry) : undefined}
      aria-busy={loading}
      className={`relative flex w-full min-w-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-slate-50/80 p-3 text-left transition dark:border-slate-700 dark:bg-slate-900/70 ${
        compact ? "min-h-[7.5rem]" : "min-h-[168px] p-4"
      } ${
        onSelectEntry
          ? "cursor-pointer hover:border-blue-200 hover:bg-white hover:shadow-sm disabled:cursor-wait dark:hover:border-blue-700 dark:hover:bg-slate-900"
          : ""
      } ${loading ? "border-blue-200 ring-2 ring-blue-200/60 dark:border-blue-700 dark:ring-blue-700/40" : ""}`}
    >
      {loading ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/75 dark:bg-slate-900/80">
          <span className="inline-flex items-center gap-2 text-sm font-medium text-blue-900 dark:text-blue-200">
            <span
              className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-blue-900 border-t-transparent dark:border-blue-300 dark:border-t-transparent"
              aria-hidden
            />
            Loading audit…
          </span>
        </div>
      ) : null}
      <div className="flex items-start justify-between gap-2">
        <p className="line-clamp-1 min-w-0 flex-1 font-semibold text-slate-900 dark:text-slate-100">
          {entry.merchant}
        </p>
        <GradeBadge grade={entry.grade || "—"} />
      </div>

      {!compact ? (
        <p className="mt-1 line-clamp-1 text-xs text-slate-500 dark:text-slate-400">
          {entry.hostname}
        </p>
      ) : null}

      <div
        className={`grid min-w-0 grid-cols-3 gap-x-3 gap-y-2 text-sm ${
          compact ? "mt-3" : "mt-auto gap-3 pt-4"
        }`}
      >
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Score</p>
          <p className="mt-0.5 truncate font-semibold tabular-nums text-slate-900 dark:text-slate-100">
            {entry.readinessScore ?? "—"}
          </p>
        </div>
        <div className="min-w-0 overflow-hidden">
          <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Platform</p>
          <div className="mt-0.5 min-w-0 font-medium text-slate-800 dark:text-slate-200">
            <PlatformLabel platform={entry.platform} truncate={compact} />
          </div>
        </div>
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Top Gap</p>
          <p className="mt-0.5 truncate font-medium text-slate-800 dark:text-slate-200">
            {entry.topGap || "—"}
          </p>
        </div>
      </div>
    </button>
  );
}

export function RecentAuditsPreview({
  entries,
  totalCount,
  loading,
  platformStats = [],
  variant = "full",
  onSelectEntry,
  loadingEntryId = null,
  auditLoading = false,
}: {
  entries: RecentScanRecord[];
  totalCount: number;
  loading: boolean;
  platformStats?: PlatformReadinessStat[];
  variant?: "homepage" | "full";
  onSelectEntry?: (entry: RecentScanRecord) => void;
  loadingEntryId?: string | null;
  auditLoading?: boolean;
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
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
            Global activity
          </p>
          <h2 className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-100">Recent audits</h2>
        </div>
        <Link
          href="/recent"
          className="text-sm font-medium text-blue-900 hover:underline dark:text-blue-300"
        >
          View all recent audits
        </Link>
      </div>

      {!isHomepage ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-card-border bg-card-muted px-4 py-5">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Unique Merchant Domains Audited
            </p>
            <p className="mt-2 text-3xl font-semibold tabular-nums text-slate-900 dark:text-slate-100">
              {loading ? "—" : totalCount.toLocaleString()}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-5 sm:col-span-2 dark:border-slate-700 dark:bg-slate-800/50">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Latest audit
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
                  : "No scans yet. Run the first audit above."}
              </p>
            )}
          </div>
        </div>
      ) : null}

      {loading && isHomepage ? (
        <p className="mt-6 text-sm text-text-secondary">Loading recent audits…</p>
      ) : null}

      {!loading && entries.length > 0 && (
        <div className={`grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2 lg:grid-cols-3 ${isHomepage ? "mt-6" : "mt-6"}`}>
          {entries.slice(0, isHomepage ? 6 : 6).map((entry, index) => (
            <RecentAuditCard
              key={`${entry.id}-${entry.scannedAt}-${index}`}
              entry={entry}
              onSelectEntry={auditLoading ? undefined : onSelectEntry}
              compact={isHomepage}
              loading={loadingEntryId === entry.id}
            />
          ))}
        </div>
      )}

      {!loading && entries.length === 0 && isHomepage ? (
        <p className="mt-6 text-sm text-text-secondary">
          No scans yet. Run the first audit above.
        </p>
      ) : null}
    </section>
    </div>
  );
}

"use client";

import type { RecentScanRecord } from "@/lib/scan-activity";
import Link from "next/link";

function formatTimestamp(timestamp: string): string {
  return new Date(timestamp).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function GradeBadge({ grade }: { grade: string }) {
  return (
    <span className="inline-flex rounded-full bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white">
      Grade {grade}
    </span>
  );
}

export function RecentAuditsList({
  entries,
  emptyMessage = "No scans recorded yet. Run the first audit from the homepage.",
}: {
  entries: RecentScanRecord[];
  emptyMessage?: string;
}) {
  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
        <p className="text-sm text-slate-600">{emptyMessage}</p>
        <Link
          href="/"
          className="mt-4 inline-block text-sm font-medium text-blue-900 hover:underline"
        >
          Run an audit
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 font-medium text-slate-600">Domain</th>
              <th className="px-4 py-3 font-medium text-slate-600">Grade</th>
              <th className="px-4 py-3 font-medium text-slate-600">Score</th>
              <th className="px-4 py-3 font-medium text-slate-600">Platform</th>
              <th className="px-4 py-3 font-medium text-slate-600">Top Gap</th>
              <th className="px-4 py-3 font-medium text-slate-600">Scanned</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {entries.map((entry, index) => (
              <tr key={`${entry.id}-${entry.scannedAt}-${index}`} className="align-top">
                <td className="px-4 py-4">
                  <div className="font-medium text-slate-900">{entry.merchant}</div>
                  <div className="mt-1 max-w-xs break-all text-xs text-slate-500">
                    {entry.hostname}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <GradeBadge grade={entry.grade || "—"} />
                </td>
                <td className="px-4 py-4 font-semibold tabular-nums text-slate-900">
                  {entry.readinessScore ?? "—"}
                </td>
                <td className="px-4 py-4 text-slate-800">{entry.platform}</td>
                <td className="px-4 py-4 text-slate-700">{entry.topGap || "—"}</td>
                <td className="px-4 py-4 whitespace-nowrap text-slate-700">
                  {formatTimestamp(entry.scannedAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RecentAuditCard({
  entry,
  onSelectEntry,
}: {
  entry: RecentScanRecord;
  onSelectEntry?: (entry: RecentScanRecord) => void;
}) {
  const isClickable = Boolean(onSelectEntry);
  const CardTag = isClickable ? "button" : "div";

  return (
    <CardTag
      type={isClickable ? "button" : undefined}
      onClick={isClickable ? () => onSelectEntry?.(entry) : undefined}
      className={`w-full rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-left transition ${
        isClickable ? "hover:border-blue-200 hover:bg-white hover:shadow-sm" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-slate-900">{entry.merchant}</p>
          <p className="mt-1 truncate text-xs text-slate-500">{entry.hostname}</p>
        </div>
        <GradeBadge grade={entry.grade || "—"} />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Score</p>
          <p className="mt-1 font-semibold tabular-nums text-slate-900">
            {entry.readinessScore ?? "—"}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Platform</p>
          <p className="mt-1 font-medium text-slate-800">{entry.platform}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Top Gap</p>
          <p className="mt-1 font-medium text-slate-800">{entry.topGap || "—"}</p>
        </div>
      </div>
    </CardTag>
  );
}

export function RecentAuditsPreview({
  entries,
  totalCount,
  loading,
  onSelectEntry,
}: {
  entries: RecentScanRecord[];
  totalCount: number;
  loading: boolean;
  onSelectEntry?: (entry: RecentScanRecord) => void;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
            Global activity
          </p>
          <h2 className="mt-2 text-xl font-semibold text-slate-900">Recent audits</h2>
        </div>
        <Link
          href="/recent"
          className="text-sm font-medium text-blue-900 hover:underline"
        >
          View all recent audits
        </Link>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Unique Merchant Domains Audited
          </p>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-slate-900">
            {loading ? "—" : totalCount.toLocaleString()}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-5 sm:col-span-2">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Latest audit
          </p>
          {!loading && entries[0] ? (
            <div className="mt-2 min-w-0">
              <p className="font-medium text-slate-900">{entries[0].merchant}</p>
              <p className="mt-1 text-sm text-slate-600">
                Grade {entries[0].grade} · Score {entries[0].readinessScore} ·{" "}
                {entries[0].platform}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Top gap: {entries[0].topGap} · {formatTimestamp(entries[0].scannedAt)}
              </p>
            </div>
          ) : (
            <p className="mt-2 text-sm text-slate-600">
              {loading
                ? "Loading scan activity…"
                : "No scans yet. Run the first audit above."}
            </p>
          )}
        </div>
      </div>

      {!loading && entries.length > 0 && (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {entries.slice(0, 6).map((entry, index) => (
            <RecentAuditCard
              key={`${entry.id}-${entry.scannedAt}-${index}`}
              entry={entry}
              onSelectEntry={onSelectEntry}
            />
          ))}
        </div>
      )}
    </section>
  );
}

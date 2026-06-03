import type { RecentScanRecord } from "@/lib/scan-activity";
import Link from "next/link";

function formatTimestamp(timestamp: string): string {
  return new Date(timestamp).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function RecentAuditsList({
  entries,
  emptyMessage = "No scans recorded yet. Run the first audit from the homepage.",
  selectedEntryId,
  onSelectEntry,
}: {
  entries: RecentScanRecord[];
  emptyMessage?: string;
  selectedEntryId?: string | null;
  onSelectEntry?: (entry: RecentScanRecord) => void;
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
              <th className="px-4 py-3 font-medium text-slate-600">Merchant</th>
              <th className="px-4 py-3 font-medium text-slate-600">Platform</th>
              <th className="px-4 py-3 font-medium text-slate-600">
                Scan timestamp
              </th>
              <th className="px-4 py-3 font-medium text-slate-600">Summary</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {entries.map((entry, index) => {
              const isSelected = selectedEntryId === entry.id;
              const isClickable = Boolean(onSelectEntry);

              return (
                <tr
                  key={`${entry.id}-${entry.scannedAt}-${index}`}
                  className={`align-top ${
                    isClickable
                      ? "cursor-pointer hover:bg-slate-50"
                      : ""
                  } ${isSelected ? "bg-blue-50/80" : ""}`}
                  onClick={
                    isClickable ? () => onSelectEntry?.(entry) : undefined
                  }
                  onKeyDown={
                    isClickable
                      ? (event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            onSelectEntry?.(entry);
                          }
                        }
                      : undefined
                  }
                  tabIndex={isClickable ? 0 : undefined}
                  aria-selected={isClickable ? isSelected : undefined}
                >
                <td className="px-4 py-4">
                  <div className="font-medium text-slate-900">{entry.merchant}</div>
                  <div className="mt-1 max-w-xs break-all text-xs text-slate-500">
                    {entry.url}
                  </div>
                </td>
                <td className="px-4 py-4 text-slate-800">
                  <div>{entry.platform}</div>
                  <div className="mt-1 text-xs capitalize text-slate-500">
                    {entry.confidence} confidence · {entry.cacheStatus}
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-slate-700">
                  {formatTimestamp(entry.scannedAt)}
                </td>
                <td className="px-4 py-4 text-slate-700">{entry.summary}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
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
          <h2 className="mt-2 text-xl font-semibold text-slate-900">
            Recent scans
          </h2>
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
            Latest scan
          </p>
          {!loading && entries[0] ? (
            <div className="mt-2 min-w-0">
              <p className="font-medium text-slate-900">{entries[0].merchant}</p>
              <p className="mt-1 text-sm text-slate-600">
                {entries[0].platform} · {entries[0].summary}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {formatTimestamp(entries[0].scannedAt)}
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
        <ul className="mt-6 divide-y divide-slate-100 rounded-xl border border-slate-200">
          {entries.slice(0, 5).map((entry, index) => {
            const isClickable = Boolean(onSelectEntry);

            return (
            <li
              key={`${entry.id}-${entry.scannedAt}-${index}`}
              className={`flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between ${
                isClickable
                  ? "cursor-pointer transition hover:bg-slate-50 focus-within:bg-slate-50"
                  : ""
              }`}
              onClick={isClickable ? () => onSelectEntry?.(entry) : undefined}
              onKeyDown={
                isClickable
                  ? (event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onSelectEntry?.(entry);
                      }
                    }
                  : undefined
              }
              tabIndex={isClickable ? 0 : undefined}
              role={isClickable ? "button" : undefined}
            >
              <div className="min-w-0">
                <p className="font-medium text-slate-900">{entry.merchant}</p>
                <p className="mt-1 break-all text-xs text-slate-500">{entry.url}</p>
              </div>
              <div className="shrink-0 text-sm text-slate-600 sm:text-right">
                <p>{entry.platform}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {formatTimestamp(entry.scannedAt)}
                </p>
              </div>
              <p className="text-sm text-slate-700 sm:max-w-xs sm:text-right">
                {entry.summary}
              </p>
            </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

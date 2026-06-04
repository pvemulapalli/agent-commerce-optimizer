"use client";

import {
  PLATFORM_FILTER_OPTIONS,
  type RecentAuditSortDirection,
  type RecentAuditSortField,
} from "@/lib/recent-audits-query";

type RecentAuditsControlsProps = {
  query: string;
  platform: string;
  sort: RecentAuditSortField;
  direction: RecentAuditSortDirection;
  onQueryChange: (value: string) => void;
  onPlatformChange: (value: string) => void;
  onSortChange: (field: RecentAuditSortField) => void;
};

export function RecentAuditsControls({
  query,
  platform,
  sort,
  direction,
  onQueryChange,
  onPlatformChange,
  onSortChange,
}: RecentAuditsControlsProps) {
  return (
    <div className="mb-6 space-y-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <div>
        <label htmlFor="recent-audits-search" className="sr-only">
          Search domain or merchant
        </label>
        <input
          id="recent-audits-search"
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search domain or merchant"
          className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-900 focus:ring-2 focus:ring-blue-900/10 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="recent-audits-platform" className="text-sm font-medium text-slate-700 dark:text-slate-300">
          Platform
        </label>
        <select
          id="recent-audits-platform"
          value={platform}
          onChange={(event) => onPlatformChange(event.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
        >
          {PLATFORM_FILTER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <p className="text-xs text-slate-500 dark:text-slate-400">
          Sorted by {sort} ({direction})
        </p>
      </div>

      <div className="hidden flex-wrap gap-2 md:flex">
        {(
          [
            ["domain", "Domain"],
            ["score", "Score"],
            ["grade", "Grade"],
            ["platform", "Platform"],
            ["scannedAt", "Audit Date"],
          ] as const
        ).map(([field, label]) => {
          const isActive = sort === field;
          const nextDirection =
            isActive && direction === "desc" ? "asc" : "desc";

          return (
            <button
              key={field}
              type="button"
              onClick={() => onSortChange(field)}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                isActive
                  ? "bg-blue-900 text-white dark:bg-blue-700"
                  : "border border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              }`}
              aria-label={`Sort by ${label}${isActive ? ` (${nextDirection})` : ""}`}
            >
              {label}
              {isActive ? (direction === "asc" ? " ↑" : " ↓") : ""}
            </button>
          );
        })}
      </div>
    </div>
  );
}

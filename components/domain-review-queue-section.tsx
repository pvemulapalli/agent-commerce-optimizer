"use client";

import {
  adminBodyClass,
  adminHeadingClass,
  adminInputClass,
  adminSectionClass,
  adminTableCellClass,
  adminTableHeadClass,
  adminTableHeaderCellClass,
  adminTableRowClass,
  adminTableWrapClass,
} from "@/lib/admin-theme-classes";
import type { DomainReviewRecord, DomainReviewType } from "@/lib/domain-review-types";
import { DOMAIN_REVIEW_TYPES } from "@/lib/domain-review-types";
import { shouldBlockDomainReviewScan } from "@/lib/domain-review-scan-block";
import { useMemo, useState } from "react";

const DISPLAY_LIMIT = 20;

type SortColumn = "domain" | "firstSeenAt" | "lastSeenAt";

function formatTimestamp(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function scanSuppressionLabel(record: DomainReviewRecord): string {
  return shouldBlockDomainReviewScan(record) ? "Blocking scans" : "Allowing scans";
}

function compareDomainReviewRecords(
  left: DomainReviewRecord,
  right: DomainReviewRecord,
  column: SortColumn,
  direction: "asc" | "desc",
): number {
  let result = 0;

  switch (column) {
    case "domain":
      result = left.domain.localeCompare(right.domain);
      break;
    case "firstSeenAt":
      result = Date.parse(left.firstSeenAt) - Date.parse(right.firstSeenAt);
      break;
    case "lastSeenAt":
      result = Date.parse(left.lastSeenAt) - Date.parse(right.lastSeenAt);
      break;
  }

  return direction === "asc" ? result : -result;
}

function SortableHeader({
  label,
  column,
  activeColumn,
  direction,
  onSort,
}: {
  label: string;
  column: SortColumn;
  activeColumn: SortColumn;
  direction: "asc" | "desc";
  onSort: (column: SortColumn) => void;
}) {
  const active = activeColumn === column;

  return (
    <th className={adminTableHeaderCellClass}>
      <button
        type="button"
        onClick={() => onSort(column)}
        className={`inline-flex items-center gap-1 font-semibold hover:text-text-primary ${
          active ? "text-text-primary" : "text-text-secondary"
        }`}
      >
        {label}
        <span aria-hidden className="text-[10px]">
          {active ? (direction === "asc" ? "▲" : "▼") : "↕"}
        </span>
      </button>
    </th>
  );
}

export function DomainReviewQueueSection({
  token,
  domains,
  search,
  addDomain,
  loading,
  busy,
  onSearchChange,
  onAddDomainChange,
  onLoad,
  onAction,
}: {
  token: string;
  domains: DomainReviewRecord[];
  search: string;
  addDomain: string;
  loading: boolean;
  busy: string | null;
  onSearchChange: (value: string) => void;
  onAddDomainChange: (value: string) => void;
  onLoad: () => void;
  onAction: (
    action: "add" | "remove" | "block_scans" | "allow_scans" | "notes" | "reclassify",
    domain: string,
    extra?: { notes?: string | null; type?: DomainReviewType },
  ) => void;
}) {
  const [sortColumn, setSortColumn] = useState<SortColumn>("lastSeenAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [typeFilter, setTypeFilter] = useState<DomainReviewType | "">("");
  const [reasonFilter, setReasonFilter] = useState("");

  function handleSort(column: SortColumn) {
    if (sortColumn === column) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortColumn(column);
    setSortDirection(column === "domain" ? "asc" : "desc");
  }

  const filteredDomains = useMemo(() => {
    const reasonQuery = reasonFilter.trim().toLowerCase();

    return domains.filter((record) => {
      if (typeFilter && record.type !== typeFilter) {
        return false;
      }

      if (reasonQuery && !record.reason.toLowerCase().includes(reasonQuery)) {
        return false;
      }

      return true;
    });
  }, [domains, reasonFilter, typeFilter]);

  const sortedDomains = useMemo(
    () =>
      [...filteredDomains].sort((left, right) =>
        compareDomainReviewRecords(left, right, sortColumn, sortDirection),
      ),
    [filteredDomains, sortColumn, sortDirection],
  );

  const isSearchActive = search.trim().length > 0;
  const visibleDomains = isSearchActive
    ? sortedDomains
    : sortedDomains.slice(0, DISPLAY_LIMIT);
  const hiddenCount = isSearchActive ? 0 : Math.max(sortedDomains.length - DISPLAY_LIMIT, 0);

  return (
    <section className={adminSectionClass}>
      <h2 className={adminHeadingClass}>Domain Review Queue</h2>
      <p className={adminBodyClass}>
        Unified scan suppression list for manually blocked domains, non-commerce sites, bot blocks,
        server errors, and other scan failures. Domains on this list are not scanned unless marked
        as allowing scans.
      </p>

      <div className="mt-4 flex flex-col gap-3 lg:flex-row">
        <input
          type="text"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search domain, status, or notes"
          className={`min-w-0 flex-1 ${adminInputClass}`}
        />
        <button
          type="button"
          disabled={loading || !token}
          onClick={onLoad}
          className="rounded-lg border border-card-border px-4 py-2 text-sm font-medium text-text-primary hover:bg-card-muted disabled:opacity-60"
        >
          {loading ? "Loading…" : "Search"}
        </button>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="block text-sm">
          <span className="font-medium text-text-secondary">Filter by type</span>
          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value as DomainReviewType | "")}
            className={`mt-1 w-full ${adminInputClass}`}
          >
            <option value="">All types</option>
            {DOMAIN_REVIEW_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm sm:col-span-2 lg:col-span-1">
          <span className="font-medium text-text-secondary">Filter by reason</span>
          <input
            type="text"
            value={reasonFilter}
            onChange={(event) => setReasonFilter(event.target.value)}
            placeholder="Contains text…"
            className={`mt-1 w-full ${adminInputClass}`}
          />
        </label>
      </div>

      <div className="mt-4 flex flex-col gap-3 lg:flex-row">
        <input
          type="text"
          value={addDomain}
          onChange={(event) => onAddDomainChange(event.target.value)}
          placeholder="Add domain manually (example.com)"
          className={`min-w-0 flex-1 ${adminInputClass}`}
        />
        <button
          type="button"
          disabled={busy !== null || !addDomain.trim()}
          onClick={() => onAction("add", addDomain.trim())}
          className="rounded-lg bg-blue-900 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-60 dark:bg-blue-700 dark:hover:bg-blue-600"
        >
          Add Manual Block
        </button>
      </div>

      <p className="mt-4 text-sm text-text-secondary">
        Showing {visibleDomains.length} of {sortedDomains.length} matching{" "}
        {sortedDomains.length === 1 ? "entry" : "entries"}
        {hiddenCount > 0
          ? ` (${hiddenCount} hidden — use Search to find a specific domain)`
          : null}
        .
      </p>

      <div className={adminTableWrapClass}>
        <table className="min-w-full text-left text-sm">
          <thead className={adminTableHeadClass}>
            <tr>
              <SortableHeader
                label="Domain"
                column="domain"
                activeColumn={sortColumn}
                direction={sortDirection}
                onSort={handleSort}
              />
              <th className={adminTableHeaderCellClass}>Type</th>
              <th className={adminTableHeaderCellClass}>Scan Access</th>
              <th className={adminTableHeaderCellClass}>Reason</th>
              <SortableHeader
                label="First Seen"
                column="firstSeenAt"
                activeColumn={sortColumn}
                direction={sortDirection}
                onSort={handleSort}
              />
              <SortableHeader
                label="Last Seen"
                column="lastSeenAt"
                activeColumn={sortColumn}
                direction={sortDirection}
                onSort={handleSort}
              />
              <th className={adminTableHeaderCellClass}>Notes</th>
              <th className={adminTableHeaderCellClass}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleDomains.length === 0 ? (
              <tr>
                <td colSpan={8} className={`${adminTableCellClass} text-text-secondary`}>
                  {domains.length === 0
                    ? "No domains in the review queue yet."
                    : "No entries match the current filters."}
                </td>
              </tr>
            ) : (
              visibleDomains.map((entry) => {
                const rowBusy = busy?.startsWith(`review-${entry.domain}-`) ?? false;
                const blocking = shouldBlockDomainReviewScan(entry);

                return (
                  <tr key={entry.domain} className={adminTableRowClass}>
                    <td className={`${adminTableCellClass} font-medium text-text-primary`}>
                      {entry.domain}
                    </td>
                    <td className={adminTableCellClass}>
                      <select
                        defaultValue={entry.type}
                        className="rounded border border-card-border bg-card px-2 py-1 text-xs text-text-primary"
                        onChange={(event) =>
                          onAction("reclassify", entry.domain, {
                            type: event.target.value as DomainReviewType,
                          })
                        }
                      >
                        {DOMAIN_REVIEW_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className={adminTableCellClass}>
                      <span
                        className={
                          blocking
                            ? "font-medium text-amber-800 dark:text-amber-200"
                            : "font-medium text-emerald-700 dark:text-emerald-300"
                        }
                      >
                        {scanSuppressionLabel(entry)}
                      </span>
                    </td>
                    <td className={`${adminTableCellClass} max-w-[12rem] truncate`}>
                      {entry.reason}
                    </td>
                    <td className={`${adminTableCellClass} whitespace-nowrap`}>
                      {formatTimestamp(entry.firstSeenAt)}
                    </td>
                    <td className={`${adminTableCellClass} whitespace-nowrap`}>
                      {formatTimestamp(entry.lastSeenAt)}
                    </td>
                    <td className={`${adminTableCellClass} min-w-[12rem]`}>
                      <textarea
                        defaultValue={entry.notes ?? ""}
                        rows={2}
                        className="w-full rounded border border-card-border bg-card px-2 py-1 text-xs text-text-primary"
                        onBlur={(event) => {
                          const nextNotes = event.target.value.trim();
                          if (nextNotes === (entry.notes ?? "")) {
                            return;
                          }
                          onAction("notes", entry.domain, { notes: nextNotes || null });
                        }}
                      />
                    </td>
                    <td className={`${adminTableCellClass} min-w-[8rem] whitespace-nowrap`}>
                      <div className="flex flex-col gap-2 text-sm">
                        {blocking ? (
                          <button
                            type="button"
                            disabled={rowBusy}
                            onClick={() => onAction("allow_scans", entry.domain)}
                            className="font-medium text-emerald-700 hover:underline disabled:opacity-50 dark:text-emerald-300"
                          >
                            Allow Scans
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={rowBusy}
                            onClick={() => onAction("block_scans", entry.domain)}
                            className="font-medium text-amber-800 hover:underline disabled:opacity-50 dark:text-amber-200"
                          >
                            Block Scans
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={rowBusy}
                          onClick={() => {
                            if (
                              window.confirm(
                                `Remove ${entry.domain} from the Domain Review Queue?`,
                              )
                            ) {
                              onAction("remove", entry.domain);
                            }
                          }}
                          className="font-medium text-rose-700 hover:underline disabled:opacity-50 dark:text-rose-300"
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-text-secondary">
        Click Domain, First Seen, or Last Seen to sort. By default, only the first{" "}
        {DISPLAY_LIMIT} matching rows are shown unless you run a search. Use{" "}
        <strong className="font-medium text-text-primary">Allow Scans</strong> to temporarily
        permit scanning again, or <strong className="font-medium text-text-primary">Remove</strong>{" "}
        to delete the entry.
      </p>
    </section>
  );
}

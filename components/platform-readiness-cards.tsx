"use client";

import { PlatformTableMark, PlatformWordmark } from "@/components/platform-logos";
import type { PlatformLeaderboardStat } from "@/lib/platform-leaderboard";
import { useMemo, useState } from "react";

type SortField = "domainsScanned" | "averageScore" | "topScore";
type SortDirection = "asc" | "desc";

function formatCell(value: string | number | null): string {
  if (value === null || value === undefined) {
    return "-";
  }

  return String(value);
}

function compareNullableNumbers(
  left: number | null,
  right: number | null,
  direction: SortDirection,
): number {
  const leftValue = left ?? -1;
  const rightValue = right ?? -1;
  return direction === "asc" ? leftValue - rightValue : rightValue - leftValue;
}

function SortButton({
  label,
  active,
  direction,
  onClick,
}: {
  label: string;
  active: boolean;
  direction: SortDirection;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 font-semibold hover:text-text-primary ${
        active ? "text-text-primary" : "text-text-secondary"
      }`}
    >
      {label}
      {active ? <span aria-hidden>{direction === "asc" ? "↑" : "↓"}</span> : null}
    </button>
  );
}

const PLATFORM_WORDMARK_KEYS = new Set([
  "Shopify",
  "BigCommerce",
  "Salesforce Commerce Cloud",
  "WooCommerce",
  "Wix",
  "Squarespace",
  "CommerceTools",
  "Magento",
  "VTEX",
  "Fenicio",
  "Shopware",
  "Unknown",
]);

function PlatformLeaderboardLabel({ row }: { row: PlatformLeaderboardStat }) {
  return <PlatformTableMark platformKey={row.key} label={row.label} />;
}

function PlatformFeaturedLabel({ row }: { row: PlatformLeaderboardStat }) {
  if (PLATFORM_WORDMARK_KEYS.has(row.key)) {
    return <PlatformWordmark platformKey={row.key} variant="card" />;
  }

  return <span className="text-sm font-semibold text-text-primary">{row.label}</span>;
}

export function PlatformLeaderboard({ stats }: { stats: PlatformLeaderboardStat[] }) {
  const [sortField, setSortField] = useState<SortField>("domainsScanned");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const sortedStats = useMemo(() => {
    return [...stats].sort((left, right) => {
      if (sortField === "domainsScanned") {
        return sortDirection === "asc"
          ? left.domainsScanned - right.domainsScanned
          : right.domainsScanned - left.domainsScanned;
      }

      if (sortField === "averageScore") {
        return compareNullableNumbers(left.averageScore, right.averageScore, sortDirection);
      }

      return compareNullableNumbers(left.topScore, right.topScore, sortDirection);
    });
  }, [stats, sortDirection, sortField]);

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortField(field);
    setSortDirection("desc");
  }

  if (stats.length === 0) {
    return null;
  }

  const hasScroll = sortedStats.length > 6;

  return (
    <section className="rounded-2xl border border-card-border bg-card p-6 shadow-sm sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-text-secondary">
        From scanned stores
      </p>
      <h2 className="mt-2 text-xl font-semibold text-text-primary sm:text-2xl">
        Platform Leaderboard
      </h2>
      <p className="mt-2 text-sm text-text-secondary">
        Aggregated from recent scans on this deployment, not industry benchmarks.
      </p>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-text-secondary">
        <p>Sort by Domains Scanned, Average Score, or Top Score.</p>
        {hasScroll ? <p className="font-medium text-blue-900 dark:text-blue-300">Scroll for more ↓</p> : null}
      </div>

      <div className="mt-3 hidden gap-2 sm:grid sm:grid-cols-2 lg:grid-cols-4">
        {sortedStats.slice(0, 4).map((row) => (
          <article
            key={`featured-${row.key}`}
            className="rounded-xl border border-card-border bg-card-muted px-3 py-3"
          >
            <div className="flex min-h-[2rem] items-center pb-2">
              <PlatformFeaturedLabel row={row} />
            </div>
            {row.domainsScanned === 0 ? (
              <p className="text-xs text-text-secondary">No scans yet</p>
            ) : (
              <dl className="grid grid-cols-3 gap-x-2 gap-y-1 text-xs">
                <div>
                  <dt className="uppercase tracking-wide text-text-secondary">Scans</dt>
                  <dd className="mt-0.5 font-semibold tabular-nums text-text-primary">
                    {row.domainsScanned}
                  </dd>
                </div>
                <div>
                  <dt className="uppercase tracking-wide text-text-secondary">Avg</dt>
                  <dd className="mt-0.5 font-semibold tabular-nums text-text-primary">
                    {formatCell(row.averageScore)}
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="uppercase tracking-wide text-text-secondary">Top</dt>
                  <dd className="mt-0.5 font-semibold tabular-nums text-text-primary">
                    {formatCell(row.topScore)}
                  </dd>
                </div>
              </dl>
            )}
          </article>
        ))}
      </div>

      <div className="relative mt-4">
        <div
          className={`max-h-80 overflow-y-auto rounded-xl border border-card-border bg-card-muted/40 pr-1 [scrollbar-color:rgb(148_163_184)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-slate-600 ${hasScroll ? "ring-1 ring-inset ring-slate-200 dark:ring-slate-700" : ""}`}
        >
          <table className="min-w-full text-left text-sm">
            <thead className="sticky top-0 z-10 bg-card">
              <tr className="border-b border-card-border text-xs uppercase tracking-wide text-text-secondary">
                <th scope="col" className="min-w-[11rem] px-3 py-2 font-semibold">
                  Platform
                </th>
                <th scope="col" className="px-3 py-2">
                  <SortButton
                    label="Domains Scanned"
                    active={sortField === "domainsScanned"}
                    direction={sortDirection}
                    onClick={() => toggleSort("domainsScanned")}
                  />
                </th>
                <th scope="col" className="px-3 py-2">
                  <SortButton
                    label="Average Score"
                    active={sortField === "averageScore"}
                    direction={sortDirection}
                    onClick={() => toggleSort("averageScore")}
                  />
                </th>
                <th scope="col" className="hidden px-3 py-2 font-semibold sm:table-cell">
                  Top Gap
                </th>
                <th scope="col" className="px-3 py-2">
                  <SortButton
                    label="Top Score"
                    active={sortField === "topScore"}
                    direction={sortDirection}
                    onClick={() => toggleSort("topScore")}
                  />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border/70">
              {sortedStats.map((row) => (
                <tr key={row.key} className="bg-card/80">
                  <td className="px-3 py-2">
                    <PlatformLeaderboardLabel row={row} />
                  </td>
                  <td className="px-3 py-2.5 tabular-nums text-text-primary">
                    {row.domainsScanned}
                  </td>
                  <td className="px-3 py-2.5 tabular-nums text-text-primary">
                    {formatCell(row.averageScore)}
                  </td>
                  <td className="hidden max-w-[8rem] px-3 py-2.5 text-text-primary sm:table-cell">
                    <span className="line-clamp-1">{formatCell(row.topGap)}</span>
                  </td>
                  <td className="px-3 py-2.5 tabular-nums text-text-primary">
                    {formatCell(row.topScore)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {hasScroll ? (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-8 rounded-b-xl bg-gradient-to-t from-card to-transparent"
          />
        ) : null}
      </div>
    </section>
  );
}

/** @deprecated Use PlatformLeaderboard */
export const PlatformReadinessCards = PlatformLeaderboard;

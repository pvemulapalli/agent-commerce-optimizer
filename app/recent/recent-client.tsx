"use client";

import { PageHeader } from "@/components/page-header";
import { RecentAuditsControls } from "@/components/recent-audits-controls";
import { PlatformReadinessCards } from "@/components/platform-readiness-cards";
import { RecentAuditsList } from "@/components/recent-audits";
import { useRecentScans } from "@/hooks/use-recent-scans";
import {
  filterRecentAudits,
  parseRecentAuditSortDirection,
  parseRecentAuditSortField,
  sortRecentAudits,
  type RecentAuditSortDirection,
  type RecentAuditSortField,
} from "@/lib/recent-audits-query";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";

export default function RecentAuditsPage() {
  const { activity, loading, error } = useRecentScans({ limit: 100, poll: false });
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const query = searchParams.get("q") ?? "";
  const platform = searchParams.get("platform") ?? "all";
  const sort = parseRecentAuditSortField(searchParams.get("sort"));
  const direction = parseRecentAuditSortDirection(searchParams.get("dir"));

  const filteredEntries = useMemo(() => {
    const filtered = filterRecentAudits(activity.recentScans, query, platform);
    return sortRecentAudits(filtered, sort, direction);
  }, [activity.recentScans, query, platform, sort, direction]);

  function updateParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());

    for (const [key, value] of Object.entries(updates)) {
      if (!value) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }

    const next = params.toString();
    router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
  }

  function handleSortChange(field: RecentAuditSortField) {
    const nextDirection: RecentAuditSortDirection =
      sort === field && direction === "desc" ? "asc" : "desc";

    updateParams({
      sort: field,
      dir: nextDirection,
    });
  }

  return (
    <main className="mx-auto w-full min-w-0 max-w-6xl overflow-x-hidden px-6 py-10 lg:px-8 lg:py-14">
      <PageHeader
        eyebrow="Global scan history"
        title="Recent Scans"
        description="Shared scan summaries across all users, stored in Redis. Recent scans show public summaries only. Full reports are available only from the original scan flow."
      />

      {activity.platformStats.length > 0 ? (
        <div className="mt-10">
          <PlatformReadinessCards stats={activity.platformStats} />
        </div>
      ) : null}

      <div className="mt-10">
        {!loading && !error ? (
          <RecentAuditsControls
            query={query}
            platform={platform}
            sort={sort}
            direction={direction}
            onQueryChange={(value) => updateParams({ q: value || null })}
            onPlatformChange={(value) =>
              updateParams({ platform: value === "all" ? null : value })
            }
            onSortChange={handleSortChange}
          />
        ) : null}

        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            Loading recent scans…
          </div>
        ) : error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-6 py-10 text-center text-sm text-rose-800 dark:border-rose-500/40 dark:bg-rose-950/50 dark:text-rose-200">
            {error}
          </div>
        ) : (
          <RecentAuditsList
            entries={filteredEntries}
            sort={sort}
            direction={direction}
            onSortChange={handleSortChange}
            emptyMessage={
              activity.recentScans.length > 0
                ? "No scans match your search or filters."
                : "No scans recorded yet. Run the first scan from the homepage."
            }
          />
        )}
      </div>

      <p className="mt-8">
        <Link
          href="/"
          className="text-sm font-medium text-blue-900 hover:underline dark:text-blue-300"
        >
          ← Back to scan
        </Link>
      </p>
    </main>
  );
}

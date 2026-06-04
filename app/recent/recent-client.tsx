"use client";

import { PageHeader } from "@/components/page-header";
import { RecentAuditsList } from "@/components/recent-audits";
import { useRecentScans } from "@/hooks/use-recent-scans";
import Link from "next/link";

export default function RecentAuditsPage() {
  const { activity, loading, error } = useRecentScans({ limit: 100, poll: false });

  return (
    <main className="mx-auto w-full min-w-0 max-w-6xl overflow-x-hidden px-6 py-10 lg:px-8 lg:py-14">
      <PageHeader
        eyebrow="Global scan history"
        title="Recent Audits"
        description="Shared scan summaries across all users, stored in Redis. Recent audits show public scan summaries only. Full reports are available only from the original scan flow."
      />

      <div className="mt-10">
        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            Loading recent scans…
          </div>
        ) : error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-6 py-10 text-center text-sm text-rose-800 dark:border-rose-500/40 dark:bg-rose-950/50 dark:text-rose-200">
            {error}
          </div>
        ) : (
          <RecentAuditsList entries={activity.recentScans} />
        )}
      </div>

      <p className="mt-8">
        <Link
          href="/"
          className="text-sm font-medium text-blue-900 hover:underline dark:text-blue-300"
        >
          ← Back to audit
        </Link>
      </p>
    </main>
  );
}

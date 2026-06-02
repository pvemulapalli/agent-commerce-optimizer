"use client";

import { RecentAuditsList } from "@/components/recent-audits";
import { useRecentScans } from "@/hooks/use-recent-scans";
import Link from "next/link";

export default function RecentAuditsPage() {
  const { activity, loading, error } = useRecentScans({ limit: 100, poll: false });

  return (
    <main className="mx-auto w-full min-w-0 max-w-6xl overflow-x-hidden px-6 py-10 lg:px-8 lg:py-14">
      <div className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
          Global scan history
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          Recent Audits
        </h1>
        <p className="mt-4 text-base leading-7 text-slate-600">
          Shared scan activity across all users, stored in Redis. Generated fix
          files are not saved — only URL, platform, timestamp, and summary.
        </p>
      </div>

      <div className="mt-10">
        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-600">
            Loading recent scans…
          </div>
        ) : error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-6 py-10 text-center text-sm text-rose-800">
            {error}
          </div>
        ) : (
          <RecentAuditsList entries={activity.recentScans} />
        )}
      </div>

      <p className="mt-8">
        <Link
          href="/"
          className="text-sm font-medium text-blue-900 hover:underline"
        >
          ← Back to audit
        </Link>
      </p>
    </main>
  );
}

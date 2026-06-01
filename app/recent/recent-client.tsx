"use client";

import { RecentAuditsList } from "@/components/recent-audits";
import { useAuditHistory } from "@/hooks/use-audit-history";
import Link from "next/link";

export default function RecentAuditsPage() {
  const { history, hydrated } = useAuditHistory();

  return (
    <main className="mx-auto w-full min-w-0 max-w-6xl overflow-x-hidden px-6 py-10 lg:px-8 lg:py-14">
      <div className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
          Audit history
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          Recent Audits
        </h1>
        <p className="mt-4 text-base leading-7 text-slate-600">
          Audits stored locally in your browser. Generated fix files are not
          saved — only URL, platform, timestamp, and summary.
        </p>
      </div>

      <div className="mt-10">
        {hydrated ? (
          <RecentAuditsList entries={history} />
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-600">
            Loading audit history…
          </div>
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

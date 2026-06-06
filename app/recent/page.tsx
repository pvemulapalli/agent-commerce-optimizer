import type { Metadata } from "next";
import { Suspense } from "react";
import RecentAuditsPage from "./recent-client";

export const metadata: Metadata = {
  title: "Recent Scans",
  description:
    "Public scan summaries for recently scanned merchant domains.",
};

export default function RecentAuditsRoute() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full min-w-0 max-w-6xl px-6 py-10 lg:px-8 lg:py-14">
          <div className="rounded-xl border border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            Loading recent scans…
          </div>
        </main>
      }
    >
      <RecentAuditsPage />
    </Suspense>
  );
}

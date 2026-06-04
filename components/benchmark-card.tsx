import type { PlatformBenchmark } from "@/lib/benchmarking";
import { formatPlatformDisplay } from "@/lib/platform-labels";

export function BenchmarkCard({ benchmark }: { benchmark: PlatformBenchmark | null }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 dark:border-slate-700 dark:bg-slate-900">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
        Benchmarking
      </p>
      <h2 className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-100">
        {benchmark
          ? `Compared to Similar ${formatPlatformDisplay(benchmark.platform)} Stores`
          : "Platform Benchmark"}
      </h2>

      {!benchmark ? (
        <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
          Benchmark data unavailable
        </p>
      ) : (
        <dl className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4 dark:border-blue-500/30 dark:bg-blue-950/30">
            <dt className="text-xs font-semibold uppercase tracking-wide text-blue-900 dark:text-blue-200">
              Your Score
            </dt>
            <dd className="mt-2 text-3xl font-semibold tabular-nums text-blue-950 dark:text-blue-100">
              {benchmark.yourScore}
            </dd>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-800/50">
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Average
            </dt>
            <dd className="mt-2 text-3xl font-semibold tabular-nums text-slate-900 dark:text-slate-100">
              {benchmark.average}
            </dd>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-500/30 dark:bg-emerald-950/30">
            <dt className="text-xs font-semibold uppercase tracking-wide text-emerald-900 dark:text-emerald-200">
              Top 10%
            </dt>
            <dd className="mt-2 text-3xl font-semibold tabular-nums text-emerald-950 dark:text-emerald-100">
              {benchmark.top10Percent}
            </dd>
          </div>
        </dl>
      )}

      {benchmark ? (
        <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
          Based on {benchmark.sampleSize} scanned {formatPlatformDisplay(benchmark.platform)} stores.
        </p>
      ) : null}
    </section>
  );
}

import type { PlatformBenchmark } from "@/lib/benchmarking";
import { formatPlatformDisplay } from "@/lib/platform-labels";

export function BenchmarkCard({ benchmark }: { benchmark: PlatformBenchmark | null }) {
  return (
    <section className="rounded-2xl border border-card-border bg-card p-6 shadow-sm sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">
        Benchmarking
      </p>
      <h2 className="mt-2 text-xl font-semibold text-text-primary">
        {benchmark
          ? `Compared to Similar ${formatPlatformDisplay(benchmark.platform)} Stores`
          : "Platform Benchmark"}
      </h2>

      {!benchmark ? (
        <p className="mt-4 text-sm text-text-secondary">
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
          <div className="rounded-xl border border-card-border bg-card-muted p-4">
            <dt className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
              Average
            </dt>
            <dd className="mt-2 text-3xl font-semibold tabular-nums text-text-primary">
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
        <p className="mt-4 text-xs text-text-secondary">
          Based on {benchmark.sampleSize} scanned {formatPlatformDisplay(benchmark.platform)} stores.
        </p>
      ) : null}
    </section>
  );
}

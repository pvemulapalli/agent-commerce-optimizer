import { PlatformIcon } from "@/components/platform-icons";
import type { PlatformReadinessStat } from "@/lib/platform-readiness-stats";

export function PlatformReadinessCards({ stats }: { stats: PlatformReadinessStat[] }) {
  return (
    <section className="rounded-2xl border border-card-border bg-card p-6 shadow-sm sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-text-secondary">
        From scanned stores
      </p>
      <h2 className="mt-2 text-xl font-semibold text-text-primary sm:text-2xl">
        AI Commerce Readiness by Platform
      </h2>
      <p className="mt-2 text-sm text-text-secondary">
        Aggregated from recent audits on this deployment — not industry benchmarks.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
        {stats.map((stat) => (
          <article
            key={stat.key}
            className="flex min-h-[148px] flex-col rounded-xl border border-card-border bg-card-muted p-4"
          >
            <div className="flex items-start gap-3">
              <PlatformIcon platformKey={stat.key} />
              <h3 className="min-w-0 pt-1 text-sm font-semibold leading-snug text-text-primary">
                {stat.label}
              </h3>
            </div>
            {stat.insufficientData ? (
              <p className="mt-3 text-sm text-text-secondary">Need more scans</p>
            ) : (
              <dl className="mt-3 space-y-2 text-sm">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-text-secondary">Scanned</dt>
                  <dd className="mt-0.5 font-semibold tabular-nums text-text-primary">
                    {stat.scanCount}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-text-secondary">
                    Avg score
                  </dt>
                  <dd className="mt-0.5 font-semibold tabular-nums text-text-primary">
                    {stat.averageScore}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-text-secondary">Top gap</dt>
                  <dd className="mt-0.5 line-clamp-2 font-medium text-text-primary">
                    {stat.topGap ?? "—"}
                  </dd>
                </div>
              </dl>
            )}
            {!stat.insufficientData ? (
              <p className="mt-auto pt-3 text-xs text-text-secondary">
                {stat.scanCount} domain{stat.scanCount === 1 ? "" : "s"}
              </p>
            ) : stat.scanCount > 0 ? (
              <p className="mt-auto pt-3 text-xs text-text-secondary">
                {stat.scanCount} scan{stat.scanCount === 1 ? "" : "s"} so far
              </p>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}

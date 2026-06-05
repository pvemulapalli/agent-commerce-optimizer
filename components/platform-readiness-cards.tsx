import { PlatformWordmark } from "@/components/platform-logos";
import type { PlatformReadinessStat } from "@/lib/platform-readiness-stats";

const FEATURED_PLATFORM_KEYS = new Set([
  "Shopify",
  "BigCommerce",
  "Salesforce Commerce Cloud",
  "WooCommerce",
  "Wix",
  "Squarespace",
  "CommerceTools",
  "Magento",
]);

export function PlatformReadinessCards({ stats }: { stats: PlatformReadinessStat[] }) {
  const featured = stats.filter((stat) => FEATURED_PLATFORM_KEYS.has(stat.key));

  if (featured.length === 0) {
    return null;
  }

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

      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {featured.map((stat) => (
          <article
            key={stat.key}
            className="rounded-xl border border-card-border bg-card-muted px-3 py-2"
          >
            <div className="flex min-h-[2.25rem] items-center pb-1.5">
              <PlatformWordmark platformKey={stat.key} variant="card" />
            </div>
            {stat.insufficientData ? (
              <p className="text-xs text-text-secondary">Need more scans</p>
            ) : (
              <dl className="grid grid-cols-3 gap-x-2 gap-y-1 text-xs">
                <div>
                  <dt className="uppercase tracking-wide text-text-secondary">Scans</dt>
                  <dd className="mt-0.5 font-semibold tabular-nums text-text-primary">
                    {stat.scanCount}
                  </dd>
                </div>
                <div>
                  <dt className="uppercase tracking-wide text-text-secondary">Avg</dt>
                  <dd className="mt-0.5 font-semibold tabular-nums text-text-primary">
                    {stat.averageScore}
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="uppercase tracking-wide text-text-secondary">Top gap</dt>
                  <dd className="mt-0.5 line-clamp-1 font-medium text-text-primary">
                    {stat.topGap ?? "—"}
                  </dd>
                </div>
              </dl>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

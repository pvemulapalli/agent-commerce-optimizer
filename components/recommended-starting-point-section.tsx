import type { RecommendedStartingPoint } from "@/lib/recommended-starting-point";

export function RecommendedStartingPointSection({
  startingPoint,
}: {
  startingPoint: RecommendedStartingPoint;
}) {
  return (
    <section className="rounded-2xl border border-blue-200 bg-blue-50/50 p-6 dark:border-blue-500/30 dark:bg-blue-950/30">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-900 dark:text-blue-200">
        Recommended Starting Point
      </p>

      <div className="mt-4 space-y-4">
        <div>
          <p className="text-sm font-semibold text-blue-950 dark:text-blue-100">
            Priority #{startingPoint.priority}
          </p>
          <p className="mt-2 text-lg font-semibold text-text-primary">{startingPoint.issue}</p>
        </div>

        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
              Why it matters
            </dt>
            <dd className="mt-2 text-sm leading-6 text-text-primary">
              {startingPoint.whyItMatters}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
              Estimated impact
            </dt>
            <dd className="mt-2 text-sm font-semibold text-text-primary">
              {startingPoint.estimatedImpact}
            </dd>
          </div>
        </dl>

        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
            Recommended action
          </dt>
          <dd className="mt-2 text-sm leading-6 text-text-primary">
            {startingPoint.recommendedAction}
          </dd>
        </div>
      </div>
    </section>
  );
}

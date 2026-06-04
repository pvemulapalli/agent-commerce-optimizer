import type { AuditConfidenceReport } from "@/lib/audit-confidence";

export function AuditConfidenceSection({
  confidence,
}: {
  confidence: AuditConfidenceReport;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 dark:border-slate-700 dark:bg-slate-900">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
        Audit Confidence
      </p>
      <div className="mt-4 flex flex-wrap items-end gap-4">
        <div>
          <p className="text-4xl font-semibold tabular-nums text-slate-900 dark:text-slate-50">
            {confidence.score}%
          </p>
          <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-300">
            {confidence.label}
          </p>
        </div>
      </div>

      <ul className="mt-6 space-y-2 text-sm text-slate-700 dark:text-slate-300">
        {confidence.signals.map((signal) => (
          <li key={signal}>{signal}</li>
        ))}
      </ul>
    </section>
  );
}

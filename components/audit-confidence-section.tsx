import type { AuditConfidenceReport } from "@/lib/audit-confidence";

export function AuditConfidenceSection({
  confidence,
}: {
  confidence: AuditConfidenceReport;
}) {
  return (
    <section className="rounded-2xl border border-card-border bg-card p-6 shadow-sm sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">
        Scan Confidence
      </p>
      <div className="mt-4 flex flex-wrap items-end gap-4">
        <div>
          <p className="text-4xl font-semibold tabular-nums text-text-primary">
            {confidence.score}%
          </p>
          <p className="mt-1 text-sm font-medium text-text-secondary">
            {confidence.label}
          </p>
        </div>
      </div>

      <ul className="mt-6 space-y-2 text-sm text-text-secondary">
        {confidence.signals.map((signal) => (
          <li key={signal}>{signal}</li>
        ))}
      </ul>
    </section>
  );
}

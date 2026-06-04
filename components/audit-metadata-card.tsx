import type { AuditReportMetadata } from "@/lib/audit-metadata";

function formatUtcTimestamp(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
    timeZoneName: "short",
  });
}

function formatDuration(seconds: number | null): string {
  if (seconds === null) {
    return "—";
  }

  return `${seconds.toFixed(1)} sec`;
}

export function AuditMetadataCard({ metadata }: { metadata: AuditReportMetadata }) {
  const items = [
    { label: "Last Crawled", value: formatUtcTimestamp(metadata.lastCrawled) },
    { label: "Pages Crawled", value: String(metadata.pagesCrawled) },
    { label: "Products Sampled", value: String(metadata.productsSampled) },
    { label: "Policy Pages Found", value: String(metadata.policyPagesFound) },
    { label: "Platform", value: metadata.platform },
    { label: "Crawl Duration", value: formatDuration(metadata.crawlDurationSec) },
    { label: "Data Source", value: metadata.dataSource },
  ];

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 dark:border-slate-700 dark:bg-slate-900">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
        Audit Metadata
      </p>
      <h2 className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-100">
        {metadata.merchantName}
      </h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{metadata.normalizedDomain}</p>

      <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <div key={item.label} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-800/50">
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {item.label}
            </dt>
            <dd className="mt-2 text-sm font-medium text-slate-900 dark:text-slate-100">
              {item.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

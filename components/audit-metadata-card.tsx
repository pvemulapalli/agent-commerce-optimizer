import { PlatformDisplay } from "@/components/platform-display";
import type { AuditReportMetadata } from "@/lib/audit-metadata";

function formatLocalTimestamp(iso: string): string {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return iso;
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZoneName: "short",
  }).format(date);
}

function formatDuration(seconds: number | null): string {
  if (seconds === null) {
    return "—";
  }

  return `${seconds.toFixed(1)} sec`;
}

export function AuditMetadataCard({
  metadata,
  auditUrl,
}: {
  metadata: AuditReportMetadata;
  auditUrl: string;
}) {
  const items = [
    { label: "Last Crawled", value: formatLocalTimestamp(metadata.lastCrawled) },
    { label: "Pages Crawled", value: String(metadata.pagesCrawled) },
    { label: "Products Sampled", value: String(metadata.productsSampled) },
    { label: "Policy Pages Found", value: String(metadata.policyPagesFound) },
    { label: "Crawl Duration", value: formatDuration(metadata.crawlDurationSec) },
    { label: "Data Source", value: metadata.dataSource },
  ];

  return (
    <section className="rounded-2xl border border-card-border bg-card p-6 shadow-sm sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">
        Audit Metadata
      </p>
      <h2 className="mt-2 text-xl font-semibold text-text-primary">
        {metadata.merchantName}
      </h2>
      <p className="mt-1 text-sm text-text-secondary">{metadata.normalizedDomain}</p>

      <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <div key={item.label} className="rounded-xl border border-card-border bg-card-muted p-4">
            <dt className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
              {item.label}
            </dt>
            <dd className="mt-2 text-sm font-medium text-text-primary">
              {item.value}
            </dd>
          </div>
        ))}
        <div className="rounded-xl border border-card-border bg-card-muted p-4">
          <dt className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
            Platform
          </dt>
          <dd className="mt-2 text-sm font-medium text-text-primary">
            <PlatformDisplay
              platform={metadata.platform}
              auditUrl={auditUrl}
              helpVariant="compact"
            />
          </dd>
        </div>
      </dl>
    </section>
  );
}

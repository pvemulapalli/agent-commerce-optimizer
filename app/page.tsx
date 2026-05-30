"use client";

import type {
  AuditApiResponse,
  ConfidenceLevel,
  Finding,
  PlatformAnalysis,
} from "@/lib/types";
import { useState } from "react";

type AuditResponse = AuditApiResponse;

function ConfidenceBadge({ confidence }: { confidence: ConfidenceLevel }) {
  const classes = {
    high: "bg-emerald-100 text-emerald-800",
    medium: "bg-sky-100 text-sky-800",
    low: "bg-zinc-100 text-zinc-700",
  }[confidence];

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${classes}`}
    >
      {confidence}
    </span>
  );
}

function FindingCard({ finding }: { finding: Finding }) {
  return (
    <article className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="text-base font-semibold text-zinc-900">{finding.label}</h3>
        <div className="flex flex-wrap gap-2">
          <ConfidenceBadge confidence={finding.confidence} />
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium uppercase tracking-wide ${
              finding.status === "detected"
                ? "bg-emerald-50 text-emerald-700"
                : finding.status === "missing"
                  ? "bg-rose-50 text-rose-700"
                  : "bg-amber-50 text-amber-700"
            }`}
          >
            {finding.status.replace("_", " ")}
          </span>
        </div>
      </div>

      <dl className="mt-4 space-y-3 text-sm">
        <div>
          <dt className="font-medium text-zinc-500">Evidence</dt>
          <dd className="mt-1 text-zinc-800">{finding.evidence}</dd>
        </div>

        {finding.evidenceUrls.length > 0 && (
          <div>
            <dt className="font-medium text-zinc-500">Evidence URLs</dt>
            <dd className="mt-1 space-y-1">
              {finding.evidenceUrls.map((evidenceUrl) => (
                <div key={evidenceUrl} className="break-all">
                  <a
                    href={evidenceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 hover:underline"
                  >
                    {evidenceUrl}
                  </a>
                </div>
              ))}
            </dd>
          </div>
        )}

        {finding.discoveredFromUrl && (
          <div>
            <dt className="font-medium text-zinc-500">Discovered From URL</dt>
            <dd className="mt-1 break-all">
              <a
                href={finding.discoveredFromUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 hover:underline"
              >
                {finding.discoveredFromUrl}
              </a>
            </dd>
          </div>
        )}

        <div>
          <dt className="font-medium text-zinc-500">Source URL</dt>
          <dd className="mt-1 break-all">
            <a
              href={finding.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-700 hover:underline"
            >
              {finding.sourceUrl}
            </a>
          </dd>
        </div>
      </dl>
    </article>
  );
}

function PlatformAnalysisSection({ platform }: { platform: PlatformAnalysis }) {
  return (
    <section className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-6 shadow-sm sm:p-8">
      <h2 className="text-2xl font-semibold text-zinc-900">Platform Analysis</h2>
      <p className="mt-1 text-sm text-zinc-600">
        Commerce platform signals detected from storefront assets, URL structures, and crawled pages.
      </p>

      <dl className="mt-6 grid gap-6 sm:grid-cols-2">
        <div>
          <dt className="text-sm font-medium text-zinc-500">Detected Platform</dt>
          <dd className="mt-1 text-lg font-semibold text-zinc-900">{platform.platform}</dd>
        </div>
        <div>
          <dt className="text-sm font-medium text-zinc-500">Confidence</dt>
          <dd className="mt-2">
            <ConfidenceBadge confidence={platform.confidence} />
          </dd>
        </div>
      </dl>

      <div className="mt-6">
        <h3 className="text-sm font-medium text-zinc-500">Evidence</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-800">
          {platform.evidence.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      {platform.sourceUrls.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-medium text-zinc-500">Source URLs</h3>
          <ul className="mt-2 space-y-1 text-sm">
            {platform.sourceUrls.map((sourceUrl) => (
              <li key={sourceUrl} className="break-all">
                <a
                  href={sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 hover:underline"
                >
                  {sourceUrl}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function FindingSection({
  title,
  description,
  findings,
  accent,
}: {
  title: string;
  description: string;
  findings: Finding[];
  accent: "emerald" | "rose" | "amber";
}) {
  if (findings.length === 0) return null;

  const accentClasses = {
    emerald: "border-emerald-200 bg-emerald-50/60",
    rose: "border-rose-200 bg-rose-50/60",
    amber: "border-amber-200 bg-amber-50/60",
  }[accent];

  return (
    <section className="space-y-4">
      <div className={`rounded-2xl border p-5 ${accentClasses}`}>
        <h2 className="text-xl font-semibold text-zinc-900">{title}</h2>
        <p className="mt-1 text-sm text-zinc-600">{description}</p>
        <p className="mt-2 text-sm font-medium text-zinc-700">
          {findings.length} finding{findings.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="grid gap-4">
        {findings.map((finding) => (
          <FindingCard key={finding.id} finding={finding} />
        ))}
      </div>
    </section>
  );
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AuditResponse | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const data = (await response.json()) as AuditResponse & { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Audit request failed");
      }

      setResult(data);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Something went wrong",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-full bg-gradient-to-b from-zinc-50 via-white to-zinc-100">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 py-12 lg:px-8 lg:py-16">
        <header className="max-w-3xl">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-600">
            Phase 1.3
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-zinc-900 sm:text-5xl">
            AI Commerce Discoverability Optimizer
          </h1>
          <p className="mt-4 text-lg leading-8 text-zinc-600">
            Enter a merchant website URL to run an evidence-backed audit of how
            easily AI agents can discover, understand, and interact with the
            business. Findings include platform detection, sitemap-driven page
            discovery, schema signals, and confidence levels derived only from
            crawled evidence.
          </p>
        </header>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <label htmlFor="website-url" className="block text-sm font-medium text-zinc-700">
              Website URL
            </label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                id="website-url"
                type="url"
                inputMode="url"
                placeholder="https://example.com"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                required
                className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-base text-zinc-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
              <button
                type="submit"
                disabled={loading || !url.trim()}
                className="inline-flex items-center justify-center rounded-xl bg-zinc-900 px-6 py-3 text-base font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
              >
                {loading ? "Running Audit…" : "Run Audit"}
              </button>
            </div>
          </form>

          {loading && (
            <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
              Crawling discovery files, parsing sitemaps (up to 20 prioritized
              URLs), following trusted support subdomains (up to 10), and
              analyzing storefront signals…
            </div>
          )}

          {error && (
            <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {error}
            </div>
          )}
        </section>

        {result && (
          <div className="space-y-10">
            <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
              <h2 className="text-2xl font-semibold text-zinc-900">Audit Summary</h2>
              <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-zinc-500">Audited URL</dt>
                  <dd className="mt-1 break-all text-zinc-900">{result.url}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-zinc-500">Cache Status</dt>
                  <dd className="mt-1 font-medium text-zinc-900">{result.cacheStatus}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-zinc-500">Crawled At</dt>
                  <dd className="mt-1 text-zinc-900">
                    {new Date(result.crawledAt).toLocaleString()}
                  </dd>
                </div>
                {result.expiresAt && (
                  <div>
                    <dt className="text-sm font-medium text-zinc-500">Cache Expires At</dt>
                    <dd className="mt-1 text-zinc-900">
                      {new Date(result.expiresAt).toLocaleString()}
                    </dd>
                  </div>
                )}
              </dl>
            </section>

            <PlatformAnalysisSection platform={result.platform} />

            <FindingSection
              title="Detected"
              description="Signals found with direct evidence from crawled pages or discovery files."
              findings={result.grouped.detected}
              accent="emerald"
            />

            <FindingSection
              title="Missing"
              description="Expected signals that were not found during the crawl."
              findings={result.grouped.missing}
              accent="rose"
            />

            <FindingSection
              title="Needs Review"
              description="Partial or ambiguous signals that may require manual verification."
              findings={result.grouped.needsReview}
              accent="amber"
            />
          </div>
        )}
      </main>
    </div>
  );
}

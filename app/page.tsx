"use client";

import type { AuditResult, Finding, GroupedFindings } from "@/lib/types";
import { useState } from "react";

type AuditResponse = AuditResult & { grouped: GroupedFindings };

function FindingCard({ finding }: { finding: Finding }) {
  return (
    <article className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="text-base font-semibold text-zinc-900">{finding.label}</h3>
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

      <dl className="mt-4 space-y-3 text-sm">
        <div>
          <dt className="font-medium text-zinc-500">Evidence</dt>
          <dd className="mt-1 text-zinc-800">{finding.evidence}</dd>
        </div>
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
            Phase 1
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-zinc-900 sm:text-5xl">
            AI Commerce Discoverability Optimizer
          </h1>
          <p className="mt-4 text-lg leading-8 text-zinc-600">
            Enter a merchant website URL to run an evidence-backed audit of how
            easily AI agents can discover, understand, and interact with the
            business. Findings are derived only from crawled pages and linked
            resources.
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
              Crawling the site, standard discovery files, and up to 5 relevant
              same-domain pages…
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
                  <dt className="text-sm font-medium text-zinc-500">Crawled At</dt>
                  <dd className="mt-1 text-zinc-900">
                    {new Date(result.crawledAt).toLocaleString()}
                  </dd>
                </div>
              </dl>
            </section>

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

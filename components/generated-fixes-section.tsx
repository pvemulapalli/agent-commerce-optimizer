"use client";

import type { GeneratedAsset, GenerateFixesApiResponse } from "@/lib/types";
import { useMemo, useState } from "react";

type FixesResponse = GenerateFixesApiResponse;

const PREVIEW_MAX_HEIGHT = "max-h-72";

function formatByteSize(content: string): string {
  const bytes = new TextEncoder().encode(content).length;

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatAssetType(contentType: string): string {
  switch (contentType) {
    case "text/plain":
      return "Plain text";
    case "text/markdown":
      return "Markdown";
    case "application/json":
      return "JSON";
    default:
      return contentType;
  }
}

function downloadAsset(asset: GeneratedAsset) {
  const blob = new Blob([asset.content], { type: asset.contentType });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = asset.filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function highlightJson(content: string): string {
  const escaped = escapeHtml(content);

  return escaped.replace(
    /("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?/g,
    (match, quoted: string | undefined, colon: string | undefined) => {
      if (quoted) {
        const className = colon
          ? "text-sky-300"
          : "text-emerald-300";
        return `<span class="${className}">${quoted}${colon ?? ""}</span>`;
      }

      if (/^(true|false|null)$/.test(match)) {
        return `<span class="text-violet-300">${match}</span>`;
      }

      return `<span class="text-amber-300">${match}</span>`;
    },
  );
}

function JsonPreview({ content }: { content: string }) {
  const highlighted = useMemo(() => highlightJson(content), [content]);

  return (
    <pre
      className={`${PREVIEW_MAX_HEIGHT} min-w-0 overflow-auto rounded-lg bg-zinc-950 p-4 font-mono text-xs leading-6 text-zinc-100`}
    >
      <code
        className="block min-w-max whitespace-pre"
        dangerouslySetInnerHTML={{ __html: highlighted }}
      />
    </pre>
  );
}

function MarkdownPreview({ content }: { content: string }) {
  return (
    <pre
      className={`${PREVIEW_MAX_HEIGHT} min-w-0 overflow-auto rounded-lg bg-zinc-950 p-4 font-mono text-xs leading-6 text-zinc-100`}
    >
      <code className="block whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
        {content}
      </code>
    </pre>
  );
}

function PlainTextPreview({ content }: { content: string }) {
  return (
    <pre
      className={`${PREVIEW_MAX_HEIGHT} min-w-0 overflow-auto rounded-lg bg-zinc-950 p-4 font-mono text-xs leading-6 text-zinc-100`}
    >
      <code className="block whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
        {content}
      </code>
    </pre>
  );
}

function AssetPreview({ asset }: { asset: GeneratedAsset }) {
  if (asset.contentType === "application/json") {
    return <JsonPreview content={asset.content} />;
  }

  if (asset.contentType === "text/markdown") {
    return <MarkdownPreview content={asset.content} />;
  }

  return <PlainTextPreview content={asset.content} />;
}

function GeneratedAssetCard({ asset }: { asset: GeneratedAsset }) {
  const [copied, setCopied] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const lineCount = useMemo(
    () => asset.content.split("\n").length,
    [asset.content],
  );
  const sizeLabel = useMemo(
    () => formatByteSize(asset.content),
    [asset.content],
  );
  const typeLabel = formatAssetType(asset.contentType);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(asset.content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = asset.content;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <article className="min-w-0 overflow-hidden rounded-xl border border-violet-200/80 border-l-4 border-l-violet-500 bg-card p-5 shadow-sm dark:border-violet-500/30">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <h3 className="break-all font-mono text-sm font-semibold text-violet-950 dark:text-violet-100">
            {asset.filename}
          </h3>

          <dl className="mt-3 grid gap-3 sm:grid-cols-3">
            <div className="min-w-0">
              <dt className="text-xs font-medium uppercase tracking-wide text-violet-600/80">
                Filename
              </dt>
              <dd className="mt-1 break-all font-mono text-sm text-text-primary">
                {asset.filename}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="text-xs font-medium uppercase tracking-wide text-violet-600/80">
                Type
              </dt>
              <dd className="mt-1 text-sm text-text-primary">{typeLabel}</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-xs font-medium uppercase tracking-wide text-violet-600/80">
                Size
              </dt>
              <dd className="mt-1 text-sm text-text-primary">
                {sizeLabel}
                <span className="text-text-secondary"> · {lineCount} lines</span>
              </dd>
            </div>
          </dl>
        </div>

        <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row">
          <button
            type="button"
            onClick={() => void handleCopy()}
            aria-label={`Copy ${asset.filename}`}
            className="w-full rounded-lg border border-violet-200 bg-card px-3 py-2 text-sm font-medium text-violet-900 transition hover:bg-violet-50 dark:border-violet-500/30 dark:text-violet-100 dark:hover:bg-violet-950/40 sm:w-auto"
          >
            {copied ? "Copied" : "Copy"}
          </button>
          <button
            type="button"
            onClick={() => downloadAsset(asset)}
            aria-label={`Download ${asset.filename}`}
            className="w-full rounded-lg bg-violet-700 px-3 py-2 text-sm font-medium text-white transition hover:bg-violet-800 sm:w-auto"
          >
            Download
          </button>
        </div>
      </div>

      <div className="mt-4 min-w-0">
        <button
          type="button"
          onClick={() => setPreviewOpen((open) => !open)}
          aria-expanded={previewOpen}
          className="flex w-full items-center justify-between gap-3 rounded-lg border border-violet-100 bg-violet-50/60 px-4 py-3 text-left text-sm font-medium text-violet-950 transition hover:bg-violet-50 dark:border-violet-500/20 dark:bg-violet-950/30 dark:text-violet-100 dark:hover:bg-violet-950/50"
        >
          <span>{previewOpen ? "Hide preview" : "Show preview"}</span>
          <span className="shrink-0 text-xs font-normal text-violet-700">
            {lineCount} lines · {sizeLabel}
          </span>
        </button>

        {previewOpen && (
          <div className="mt-3 min-w-0 overflow-hidden">
            <AssetPreview asset={asset} />
          </div>
        )}
      </div>
    </article>
  );
}

export function GeneratedFixesSection({
  fixes,
  loading,
  error,
  onRegenerate,
}: {
  fixes: FixesResponse | null;
  loading: boolean;
  error: string | null;
  onRegenerate: () => void;
}) {
  if (!fixes && !loading && !error) {
    return null;
  }

  return (
    <section className="relative min-w-0 overflow-hidden rounded-2xl border-2 border-violet-300 bg-gradient-to-br from-violet-100/80 via-fuchsia-50/50 to-indigo-100/60 p-6 shadow-md dark:border-violet-500/30 dark:from-violet-950/40 dark:via-fuchsia-950/20 dark:to-indigo-950/40 sm:p-8">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-indigo-500"
      />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-semibold text-violet-950 dark:text-violet-100">
              Generated Fixes
            </h2>
            <span className="rounded-full bg-violet-700 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-white">
              Optimizer output
            </span>
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-violet-900/80 dark:text-violet-100/80">
            Downloadable assets derived only from crawled scan evidence. TODO
            placeholders mark information that was not found during the crawl.
          </p>
        </div>

        <button
          type="button"
          onClick={onRegenerate}
          disabled={loading}
          className="shrink-0 rounded-xl border border-violet-300 bg-card px-4 py-2 text-sm font-medium text-violet-900 transition hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-violet-500/30 dark:text-violet-100 dark:hover:bg-violet-950/40"
        >
          {loading ? "Generating…" : "Regenerate"}
        </button>
      </div>

      {loading && (
        <div className="mt-6 rounded-xl border border-violet-200 bg-card/80 px-4 py-3 text-sm text-violet-900 dark:border-violet-500/30 dark:text-violet-100">
          Building llms.txt, merchant profile, schema templates, and readiness
          report…
        </div>
      )}

      {error && (
        <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-500/40 dark:bg-rose-950/50 dark:text-rose-200">
          {error}
        </div>
      )}

      {fixes && !loading && (
        <div className="mt-6 min-w-0 space-y-5">
          <dl className="grid min-w-0 gap-4 rounded-xl border border-violet-200/70 bg-card/70 p-4 sm:grid-cols-2 lg:grid-cols-3 dark:border-violet-500/30">
            <div className="min-w-0">
              <dt className="text-xs font-medium uppercase tracking-wide text-violet-600/80">
                Scanned URL
              </dt>
              <dd className="mt-1 break-all text-sm text-text-primary">
                {fixes.auditedUrl}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="text-xs font-medium uppercase tracking-wide text-violet-600/80">
                Generated At
              </dt>
              <dd className="mt-1 text-sm text-text-primary">
                {new Date(fixes.generatedAt).toLocaleString()}
              </dd>
            </div>
            {fixes.cacheStatus && (
              <div className="min-w-0">
                <dt className="text-xs font-medium uppercase tracking-wide text-violet-600/80 dark:text-violet-300/80">
                  Scan Cache
                </dt>
                <dd className="mt-1 text-sm font-medium text-text-primary">
                  {fixes.cacheStatus}
                </dd>
              </div>
            )}
          </dl>

          <div className="grid min-w-0 gap-4">
            {fixes.assets.map((asset) => (
              <GeneratedAssetCard key={asset.filename} asset={asset} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

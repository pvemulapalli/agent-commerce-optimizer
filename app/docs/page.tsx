import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "API Documentation",
  description:
    "REST API reference for running merchant audits and generating AI-ready fix assets.",
};

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="min-w-0 overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-xs leading-6 text-zinc-100 sm:text-sm">
      <code className="block min-w-max whitespace-pre font-mono">{children}</code>
    </pre>
  );
}

function EndpointSection({
  method,
  path,
  title,
  description,
  requestExample,
  responseExample,
  curlExample,
}: {
  method: string;
  path: string;
  title: string;
  description: string;
  requestExample: string;
  responseExample: string;
  curlExample: string;
}) {
  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-wrap items-center gap-3">
        <span className="rounded-lg bg-indigo-600 px-2.5 py-1 font-mono text-xs font-bold uppercase text-white">
          {method}
        </span>
        <code className="break-all font-mono text-sm text-zinc-900">{path}</code>
      </div>

      <h2 className="mt-4 text-2xl font-semibold text-zinc-900">{title}</h2>
      <p className="mt-2 text-sm leading-7 text-zinc-600">{description}</p>

      <h3 className="mt-8 text-sm font-semibold uppercase tracking-wide text-zinc-500">
        Request
      </h3>
      <p className="mt-2 text-sm text-zinc-600">
        Content-Type: <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs">application/json</code>
      </p>
      <div className="mt-3 min-w-0">
        <CodeBlock>{requestExample}</CodeBlock>
      </div>

      <h3 className="mt-8 text-sm font-semibold uppercase tracking-wide text-zinc-500">
        Response
      </h3>
      <p className="mt-2 text-sm text-zinc-600">
        Success: <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs">200 OK</code>
        {" · "}
        Error: <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs">400</code>
        {" / "}
        <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs">500</code>
      </p>
      <div className="mt-3 min-w-0">
        <CodeBlock>{responseExample}</CodeBlock>
      </div>

      <h3 className="mt-8 text-sm font-semibold uppercase tracking-wide text-zinc-500">
        curl
      </h3>
      <div className="mt-3 min-w-0">
        <CodeBlock>{curlExample}</CodeBlock>
      </div>
    </section>
  );
}

export default function DocsPage() {
  return (
    <main className="mx-auto w-full min-w-0 max-w-4xl overflow-x-hidden px-6 py-12 lg:px-8 lg:py-16">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.15em] text-indigo-600">
            API Reference
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-zinc-900">
            Documentation
          </h1>
          <p className="mt-4 text-lg leading-8 text-zinc-600">
            Run evidence-backed merchant audits and generate downloadable fix
            assets programmatically. No authentication required.
          </p>
        </div>

        <div className="mt-10 space-y-8">
          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-lg font-semibold text-zinc-900">Base URL</h2>
            <p className="mt-2 text-sm text-zinc-600">
              Use your deployment origin. Local development:
            </p>
            <CodeBlock>http://localhost:3000</CodeBlock>
            <p className="mt-4 text-sm text-zinc-600">
              Utility routes:{" "}
              <a href="/api/health" className="font-medium text-indigo-600 hover:underline">
                /api/health
              </a>
              {" · "}
              <a href="/openapi.json" className="font-medium text-indigo-600 hover:underline">
                /openapi.json
              </a>
            </p>
          </section>

          <EndpointSection
            method="GET"
            path="/api/health"
            title="Health check"
            description="Returns service status, version, timestamp, and whether Upstash Redis is configured."
            requestExample="No request body."
            responseExample={`{
  "status": "ok",
  "service": "commerce-optimizer",
  "version": "2.5",
  "timestamp": "2026-05-30T12:00:00.000Z",
  "redis": "configured"
}`}
            curlExample="curl -s http://localhost:3000/api/health"
          />

          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-lg font-semibold text-zinc-900">OpenAPI specification</h2>
            <p className="mt-2 text-sm leading-7 text-zinc-600">
              Machine-readable API description for health, audit, and generate-fixes
              endpoints.
            </p>
            <div className="mt-4 min-w-0">
              <CodeBlock>http://localhost:3000/openapi.json</CodeBlock>
            </div>
          </section>

          <EndpointSection
            method="POST"
            path="/api/audit"
            title="Run audit"
            description="Crawls a merchant URL and returns platform analysis, evidence-backed findings grouped by status, and cache metadata. Findings are derived only from crawled pages and discovery files."
            requestExample={`{
  "url": "https://www.allbirds.com"
}`}
            responseExample={`{
  "url": "https://www.allbirds.com/",
  "crawledAt": "2026-05-30T12:00:00.000Z",
  "platform": {
    "platform": "Shopify",
    "confidence": "high",
    "evidence": ["Shopify CDN asset detected"],
    "sourceUrls": ["https://www.allbirds.com/"]
  },
  "findings": [
    {
      "id": "product-pages",
      "label": "Product pages",
      "status": "detected",
      "confidence": "high",
      "evidence": "URL pattern match on crawled pages",
      "evidenceUrls": ["https://www.allbirds.com/products/example"],
      "sourceUrl": "https://www.allbirds.com/products/example",
      "discoveredFromUrl": null
    }
  ],
  "grouped": {
    "detected": [],
    "missing": [],
    "needsReview": []
  },
  "cacheStatus": "MISS",
  "expiresAt": "2026-05-30T14:00:00.000Z"
}`}
            curlExample={`curl -s -X POST http://localhost:3000/api/audit \\
  -H "Content-Type: application/json" \\
  -d '{"url":"https://www.allbirds.com"}'`}
          />

          <EndpointSection
            method="POST"
            path="/api/generate-fixes"
            title="Generate fixes"
            description="Reuses the audit crawl and cache, then returns six downloadable assets built only from crawled evidence. TODO placeholders mark missing facts — nothing is invented."
            requestExample={`{
  "url": "https://www.allbirds.com"
}`}
            responseExample={`{
  "auditedUrl": "https://www.allbirds.com/",
  "generatedAt": "2026-05-30T12:05:00.000Z",
  "cacheStatus": "HIT",
  "assets": [
    {
      "filename": "llms.txt",
      "contentType": "text/plain",
      "content": "# Allbirds\\n> TODO: Add merchant description\\n..."
    },
    {
      "filename": "merchant-profile.md",
      "contentType": "text/markdown",
      "content": "# Merchant Profile\\n..."
    },
    {
      "filename": "organization-schema.json",
      "contentType": "application/json",
      "content": "{\\n  \\"@context\\": \\"https://schema.org\\",\\n  \\"@type\\": \\"Organization\\"\\n}\\n"
    },
    {
      "filename": "product-schema-template.json",
      "contentType": "application/json",
      "content": "{\\n  \\"@type\\": \\"Product\\"\\n}\\n"
    },
    {
      "filename": "faq-schema-template.json",
      "contentType": "application/json",
      "content": "{\\n  \\"@type\\": \\"FAQPage\\"\\n}\\n"
    },
    {
      "filename": "agent-commerce-readiness.md",
      "contentType": "text/markdown",
      "content": "# Agent Commerce Readiness\\n..."
    }
  ]
}`}
            curlExample={`curl -s -X POST http://localhost:3000/api/generate-fixes \\
  -H "Content-Type: application/json" \\
  -d '{"url":"https://www.allbirds.com"}'`}
          />

          <section className="rounded-2xl border border-amber-200 bg-amber-50/60 p-6 sm:p-8">
            <h2 className="text-lg font-semibold text-zinc-900">Error responses</h2>
            <p className="mt-2 text-sm leading-7 text-zinc-600">
              Invalid requests return <code className="font-mono text-xs">400</code> with{" "}
              <code className="font-mono text-xs">{`{ "error": "..." }`}</code>.
              Server failures return <code className="font-mono text-xs">500</code> with the
              same shape.
            </p>
            <div className="mt-4 min-w-0">
              <CodeBlock>{`{
  "error": "Enter a valid website URL"
}`}</CodeBlock>
            </div>
          </section>
        </div>

        <p className="mt-10 text-sm text-zinc-500">
          <Link href="/" className="font-medium text-indigo-600 hover:text-indigo-700 hover:underline">
            ← Back to audit
          </Link>
        </p>
    </main>
  );
}

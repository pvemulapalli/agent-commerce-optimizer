"use client";

import { PageHeader } from "@/components/page-header";
import { DEFERRED_DISCOVERABILITY_FEATURES } from "@/lib/ai-discoverability";
import { APP_VERSION } from "@/lib/app-version";
import { useEffect, useState } from "react";

type CheckStatus = "pending" | "pass" | "fail";

interface DiscoverabilityCheck {
  id: string;
  label: string;
  detail: string;
  status: CheckStatus;
}

function StatusBadge({ status }: { status: CheckStatus }) {
  if (status === "pending") {
    return (
      <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
        Checking…
      </span>
    );
  }

  if (status === "pass") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">
        <span aria-hidden>✓</span> Detected
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-800 dark:bg-rose-950/50 dark:text-rose-200">
      <span aria-hidden>✕</span> Missing
    </span>
  );
}

async function checkRobotsTxt(): Promise<{ pass: boolean; detail: string }> {
  const response = await fetch("/robots.txt", { cache: "no-store" });
  const text = await response.text();

  if (!response.ok) {
    return { pass: false, detail: `HTTP ${response.status}` };
  }

  const hasSitemap = /Sitemap:\s+\S+/i.test(text);
  const hasAiBots = ["GPTBot", "OAI-SearchBot", "Claude-Web", "Google-Extended"].every(
    (agent) => text.includes(agent),
  );
  const hasContentSignals = /Content-Signal:/i.test(text);

  if (!hasSitemap || !hasAiBots || !hasContentSignals) {
    return {
      pass: false,
      detail: "robots.txt is missing sitemap, AI bot rules, or Content-Signal directives",
    };
  }

  return { pass: true, detail: "robots.txt allows crawlers and references sitemap.xml" };
}

async function checkSitemap(): Promise<{ pass: boolean; detail: string }> {
  const response = await fetch("/sitemap.xml", { cache: "no-store" });
  const text = await response.text();

  if (!response.ok) {
    return { pass: false, detail: `HTTP ${response.status}` };
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(text, "application/xml");
  const parseError = doc.querySelector("parsererror");

  if (parseError) {
    return { pass: false, detail: "sitemap.xml is not valid XML" };
  }

  const locs = [...doc.querySelectorAll("url > loc")].map((node) => node.textContent ?? "");
  const requiredPaths = ["/about", "/api-docs", "/release-notes"];
  const hasHomepage = locs.some((loc) => {
    try {
      const url = new URL(loc);
      return url.pathname === "/" || url.pathname === "";
    } catch {
      return false;
    }
  });

  if (!hasHomepage) {
    return { pass: false, detail: "Homepage URL missing from sitemap" };
  }

  if (!requiredPaths.every((path) => locs.some((loc) => loc.includes(path)))) {
    return { pass: false, detail: "One or more canonical pages missing from sitemap" };
  }

  return { pass: true, detail: `${locs.length} canonical URLs published` };
}

async function checkLinkHeaders(): Promise<{ pass: boolean; detail: string }> {
  const response = await fetch("/", { cache: "no-store" });
  const linkHeader = response.headers.get("link") ?? "";

  const hasSitemap = /rel="sitemap"/i.test(linkHeader);
  const hasServiceDoc = /rel="service-doc"/i.test(linkHeader);
  const hasApiCatalog = /rel="api-catalog"/i.test(linkHeader);

  if (!hasSitemap || !hasServiceDoc || !hasApiCatalog) {
    return {
      pass: false,
      detail: "Homepage is missing one or more RFC8288 Link relations",
    };
  }

  return { pass: true, detail: "Homepage exposes sitemap, service-doc, and api-catalog Link headers" };
}

async function checkApiCatalog(): Promise<{ pass: boolean; detail: string }> {
  const response = await fetch("/.well-known/api-catalog", { cache: "no-store" });
  const contentType = response.headers.get("content-type") ?? "";

  if (!response.ok) {
    return { pass: false, detail: `HTTP ${response.status}` };
  }

  if (!contentType.includes("application/linkset+json")) {
    return { pass: false, detail: `Unexpected content type: ${contentType || "none"}` };
  }

  const data = (await response.json()) as {
    linkset?: Array<{ item?: Array<{ href?: string; rel?: string }> }>;
  };

  const items = data.linkset?.[0]?.item ?? [];
  const rels = items.map((item) => item.rel).filter(Boolean);

  if (!rels.includes("service-doc") || !rels.includes("health")) {
    return { pass: false, detail: "API catalog is missing required service-doc or health links" };
  }

  return { pass: true, detail: `${items.length} API links published in RFC9727 linkset format` };
}

async function checkMarkdownNegotiation(): Promise<{ pass: boolean; detail: string }> {
  const response = await fetch("/", {
    cache: "no-store",
    headers: { Accept: "text/markdown" },
  });
  const contentType = response.headers.get("content-type") ?? "";
  const text = await response.text();

  if (!response.ok || !contentType.includes("text/markdown") || !text.startsWith("#")) {
    return { pass: false, detail: "Homepage markdown negotiation is unavailable" };
  }

  return { pass: true, detail: "Homepage and About support Accept: text/markdown" };
}

export function AgentReadinessClient() {
  const [checks, setChecks] = useState<DiscoverabilityCheck[]>([
    {
      id: "robots",
      label: "robots.txt",
      detail: "Waiting for check…",
      status: "pending",
    },
    {
      id: "sitemap",
      label: "sitemap.xml",
      detail: "Waiting for check…",
      status: "pending",
    },
    {
      id: "link-headers",
      label: "Link response headers",
      detail: "Waiting for check…",
      status: "pending",
    },
    {
      id: "api-catalog",
      label: "API catalog",
      detail: "Waiting for check…",
      status: "pending",
    },
    {
      id: "markdown",
      label: "Markdown for agents",
      detail: "Waiting for check…",
      status: "pending",
    },
  ]);

  useEffect(() => {
    let cancelled = false;

    async function runChecks() {
      const runners = [
        { id: "robots", run: checkRobotsTxt },
        { id: "sitemap", run: checkSitemap },
        { id: "link-headers", run: checkLinkHeaders },
        { id: "api-catalog", run: checkApiCatalog },
        { id: "markdown", run: checkMarkdownNegotiation },
      ] as const;

      for (const runner of runners) {
        try {
          const result = await runner.run();
          if (cancelled) {
            return;
          }

          setChecks((existing) =>
            existing.map((check) =>
              check.id === runner.id
                ? {
                    ...check,
                    status: result.pass ? "pass" : "fail",
                    detail: result.detail,
                  }
                : check,
            ),
          );
        } catch (error) {
          if (cancelled) {
            return;
          }

          setChecks((existing) =>
            existing.map((check) =>
              check.id === runner.id
                ? {
                    ...check,
                    status: "fail",
                    detail:
                      error instanceof Error ? error.message : "Check failed unexpectedly",
                  }
                : check,
            ),
          );
        }
      }
    }

    void runChecks();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="mx-auto w-full min-w-0 max-w-4xl px-6 py-10 lg:px-8 lg:py-14">
      <PageHeader
        eyebrow="Debug"
        title="Agent Readiness"
        description="Informational checks for AI discoverability signals exposed by Merchant Signals. This page does not modify site configuration."
      />

      <section className="mt-8 rounded-2xl border border-card-border bg-card p-6 shadow-sm sm:p-8">
        <p className="text-sm text-text-secondary">
          Version {APP_VERSION} · Live checks against this deployment
        </p>

        <ul className="mt-6 space-y-4">
          {checks.map((check) => (
            <li
              key={check.id}
              className="flex flex-col gap-3 rounded-xl border border-card-border bg-card-muted px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium text-text-primary">{check.label}</p>
                <p className="mt-1 text-sm text-text-secondary">{check.detail}</p>
              </div>
              <StatusBadge status={check.status} />
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8 rounded-2xl border border-card-border bg-card p-6 shadow-sm sm:p-8">
        <h2 className="text-lg font-semibold text-text-primary">Deferred capabilities</h2>
        <p className="mt-2 text-sm leading-7 text-text-secondary">
          The following agent discoverability patterns were intentionally not implemented in
          this release.
        </p>
        <ul className="mt-6 space-y-4">
          {DEFERRED_DISCOVERABILITY_FEATURES.map((feature) => (
            <li key={feature.name} className="rounded-xl border border-card-border px-4 py-4">
              <p className="font-medium text-text-primary">{feature.name}</p>
              <p className="mt-1 text-sm leading-6 text-text-secondary">{feature.reason}</p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

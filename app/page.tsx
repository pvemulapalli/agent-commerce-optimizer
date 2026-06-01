"use client";

import { AuditHero } from "@/components/audit-hero";
import { AuditResultsSection } from "@/components/audit-results";
import { MarketingSections } from "@/components/marketing-sections";
import { RecentAuditsPreview } from "@/components/recent-audits";
import { useAuditHistory } from "@/hooks/use-audit-history";
import type { AuditApiResponse, GenerateFixesApiResponse } from "@/lib/types";
import { useRef, useState } from "react";

type AuditResponse = AuditApiResponse;
type FixesResponse = GenerateFixesApiResponse;

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AuditResponse | null>(null);
  const [fixesLoading, setFixesLoading] = useState(false);
  const [fixesError, setFixesError] = useState<string | null>(null);
  const [fixes, setFixes] = useState<FixesResponse | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const { history, totalCount, hydrated, recordAudit } = useAuditHistory();

  async function generateFixes(targetUrl: string) {
    setFixesLoading(true);
    setFixesError(null);
    setFixes(null);

    try {
      const response = await fetch("/api/generate-fixes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: targetUrl }),
      });

      const data = (await response.json()) as FixesResponse & { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Fix generation failed");
      }

      setFixes(data);
    } catch (generateError) {
      setFixesError(
        generateError instanceof Error
          ? generateError.message
          : "Something went wrong generating fixes",
      );
    } finally {
      setFixesLoading(false);
    }
  }

  async function runAudit(targetUrl: string) {
    setLoading(true);
    setError(null);
    setResult(null);
    setFixes(null);
    setFixesError(null);

    try {
      const response = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: targetUrl }),
      });

      const data = (await response.json()) as AuditResponse & { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Audit request failed");
      }

      setResult(data);
      recordAudit(data);

      window.setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);

      await generateFixes(data.url);
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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runAudit(url);
  }

  function handleExampleSelect(exampleUrl: string) {
    setUrl(exampleUrl);
    void runAudit(exampleUrl);
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-6xl space-y-12 px-6 py-10 lg:px-8 lg:py-14">
      <AuditHero
        url={url}
        loading={loading}
        error={error}
        onUrlChange={setUrl}
        onSubmit={handleSubmit}
        onExampleSelect={handleExampleSelect}
      />

      <RecentAuditsPreview
        entries={history}
        totalCount={totalCount}
        hydrated={hydrated}
      />

      {result && (
        <div ref={resultsRef} className="scroll-mt-24">
          <AuditResultsSection
            result={result}
            fixes={fixes}
            fixesLoading={fixesLoading}
            fixesError={fixesError}
            onRegenerateFixes={() => generateFixes(result.url)}
          />
        </div>
      )}

      {!result && <MarketingSections />}
    </div>
  );
}

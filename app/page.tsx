"use client";

import { ActivityFeed } from "@/components/activity-feed";
import { AuditHero } from "@/components/audit-hero";
import { AuditResultsSection } from "@/components/audit-results";
import { MarketingSections } from "@/components/marketing-sections";
import { RecentAuditsPreview } from "@/components/recent-audits";
import { shouldShowTurnstileWidget } from "@/components/turnstile-widget";
import { useRecentScans } from "@/hooks/use-recent-scans";
import { isScanActivityToastEnabled } from "@/lib/scan-activity-config";
import type { AuditApiResponse, GenerateFixesApiResponse } from "@/lib/types";
import type { RecentScanRecord } from "@/lib/scan-activity";
import { useRef, useState } from "react";

type AuditResponse = AuditApiResponse & {
  scanRecord?: { id: string; hostname: string };
};
type FixesResponse = GenerateFixesApiResponse;

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AuditResponse | null>(null);
  const [fixesLoading, setFixesLoading] = useState(false);
  const [fixesError, setFixesError] = useState<string | null>(null);
  const [fixes, setFixes] = useState<FixesResponse | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const scanActivityToastEnabled = isScanActivityToastEnabled();

  const { activity, loading: activityLoading, refresh, markOwnScan } =
    useRecentScans({
      limit: 5,
      poll: scanActivityToastEnabled,
    });

  async function generateFixes(targetUrl: string, token: string | null) {
    setFixesLoading(true);
    setFixesError(null);
    setFixes(null);

    try {
      const payload: { url: string; turnstileToken?: string } = { url: targetUrl };
      if (token) {
        payload.turnstileToken = token;
      }

      const response = await fetch("/api/generate-fixes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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

  async function loadRecentAudit(entry: RecentScanRecord) {
    setUrl(entry.url);
    setLoading(true);
    setError(null);
    setResult(null);
    setFixes(null);
    setFixesError(null);

    try {
      const payload: { url: string; turnstileToken?: string } = { url: entry.url };
      if (turnstileToken) {
        payload.turnstileToken = turnstileToken;
      }

      const response = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as AuditResponse & { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Audit request failed");
      }

      setResult(data);

      window.setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);

      await generateFixes(data.url, turnstileToken);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Something went wrong loading the audit",
      );
    } finally {
      setLoading(false);
    }
  }

  async function runAudit(targetUrl: string) {
    if (shouldShowTurnstileWidget() && !turnstileToken) {
      setError("Complete the Turnstile check before running a scan.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setFixes(null);
    setFixesError(null);

    try {
      const payload: { url: string; turnstileToken?: string } = { url: targetUrl };
      if (turnstileToken) {
        payload.turnstileToken = turnstileToken;
      }

      const response = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as AuditResponse & { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Audit request failed");
      }

      setResult(data);
      markOwnScan(data.scanRecord?.id);
      void refresh();

      window.setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);

      await generateFixes(data.url, turnstileToken);
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
    <>
      <div className="mx-auto w-full min-w-0 max-w-6xl space-y-12 px-6 py-10 lg:px-8 lg:py-14">
        <AuditHero
          url={url}
          loading={loading}
          error={error}
          turnstileToken={turnstileToken}
          onUrlChange={setUrl}
          onSubmit={handleSubmit}
          onExampleSelect={handleExampleSelect}
          onTurnstileTokenChange={setTurnstileToken}
        />

        <RecentAuditsPreview
          entries={activity.recentScans}
          totalCount={activity.totalScans}
          loading={activityLoading}
          onSelectEntry={(entry) => void loadRecentAudit(entry)}
        />

        {result && (
          <div ref={resultsRef} className="scroll-mt-24">
            <AuditResultsSection
              result={result}
              fixes={fixes}
              fixesLoading={fixesLoading}
              fixesError={fixesError}
              onRegenerateFixes={() => generateFixes(result.url, turnstileToken)}
            />
          </div>
        )}

        {!result && <MarketingSections />}
      </div>

      <ActivityFeed entries={activity.recentScans} />
    </>
  );
}

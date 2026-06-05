"use client";

import { ActivityFeed } from "@/components/activity-feed";
import { AuditHero } from "@/components/audit-hero";
import { AuditResultsSection } from "@/components/audit-results";
import { MarketingSections } from "@/components/marketing-sections";
import { PlatformReadinessCards } from "@/components/platform-readiness-cards";
import { RecentAuditsPreview } from "@/components/recent-audits";
import { shouldShowTurnstileWidget } from "@/components/turnstile-widget";
import { useRecentScans } from "@/hooks/use-recent-scans";
import { isNonEcommerceScanResponse } from "@/lib/non-ecommerce-messages";
import { isActivityFeedEnabled } from "@/lib/scan-activity-config";
import { scrollToElementById } from "@/lib/scroll-utils";
import type { EnrichedAuditResponse } from "@/lib/enrich-audit-response";
import type { GenerateFixesApiResponse } from "@/lib/types";
import type { RecentScanRecord } from "@/lib/scan-activity";
import { useCallback, useEffect, useState } from "react";

type AuditResponse = EnrichedAuditResponse & {
  scanRecord?: { id: string; hostname: string };
};
type FixesResponse = GenerateFixesApiResponse;

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nonEcommerceMessage, setNonEcommerceMessage] = useState<string | null>(null);
  const [result, setResult] = useState<AuditResponse | null>(null);
  const [fixesLoading, setFixesLoading] = useState(false);
  const [fixesError, setFixesError] = useState<string | null>(null);
  const [fixes, setFixes] = useState<FixesResponse | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [feedNotifications, setFeedNotifications] = useState<RecentScanRecord[]>([]);
  const [loadingRecentId, setLoadingRecentId] = useState<string | null>(null);

  const activityFeedEnabled = isActivityFeedEnabled();

  const handleNewScan = useCallback((entry: RecentScanRecord) => {
    setFeedNotifications((existing) => [...existing, entry]);
  }, []);

  const { activity, loading: activityLoading, refresh, markOwnScan } =
    useRecentScans({
      limit: 6,
      poll: activityFeedEnabled,
      onNewScan: activityFeedEnabled ? handleNewScan : undefined,
    });

  useEffect(() => {
    if (!result) {
      return;
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        scrollToElementById("overview");
      });
    });
  }, [result?.url, result?.crawledAt]);

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
    setLoadingRecentId(entry.id);
    setError(null);
    setNonEcommerceMessage(null);
    setResult(null);
    setFixes(null);
    setFixesError(null);
    scrollToElementById("audit-hero");

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

      if (isNonEcommerceScanResponse(data)) {
        setNonEcommerceMessage(data.message);
        return;
      }

      if (!response.ok) {
        throw new Error(data.error ?? "Audit request failed");
      }

      setResult(data);
      await generateFixes(data.url, turnstileToken);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Something went wrong loading the audit",
      );
    } finally {
      setLoading(false);
      setLoadingRecentId(null);
    }
  }

  async function runAudit(targetUrl: string) {
    if (shouldShowTurnstileWidget() && !turnstileToken) {
      setError("Complete the Turnstile check before running a scan.");
      return;
    }

    setLoading(true);
    setError(null);
    setNonEcommerceMessage(null);
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

      if (isNonEcommerceScanResponse(data)) {
        setNonEcommerceMessage(data.message);
        return;
      }

      if (!response.ok) {
        throw new Error(data.error ?? "Audit request failed");
      }

      markOwnScan(data.scanRecord?.id);
      await refresh();
      setResult(data);

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

  return (
    <>
      <div className="mx-auto w-full min-w-0 max-w-6xl space-y-12 px-6 py-10 lg:px-8 lg:py-14">
        <div id="audit-hero">
          <AuditHero
            url={url}
            loading={loading}
            error={error}
            nonEcommerceMessage={nonEcommerceMessage}
            turnstileToken={turnstileToken}
            onUrlChange={setUrl}
            onSubmit={handleSubmit}
            onTurnstileTokenChange={setTurnstileToken}
            onScanAnother={() => {
              setError(null);
              setNonEcommerceMessage(null);
              setUrl("");
              setResult(null);
              setFixes(null);
              setFixesError(null);
            }}
          />
        </div>

        {!result && <MarketingSections />}

        {!result && activity.platformStats.length > 0 ? (
          <PlatformReadinessCards stats={activity.platformStats} />
        ) : null}

        {!result ? (
          <RecentAuditsPreview
            entries={activity.recentScans}
            totalCount={activity.totalScans}
            loading={activityLoading}
            variant="homepage"
            onSelectEntry={(entry) => void loadRecentAudit(entry)}
            loadingEntryId={loadingRecentId}
            auditLoading={loading}
          />
        ) : null}

        {result && (
          <AuditResultsSection
            result={result}
            fixes={fixes}
            fixesLoading={fixesLoading}
            fixesError={fixesError}
            onRegenerateFixes={() => generateFixes(result.url, turnstileToken)}
          />
        )}
      </div>

      {activityFeedEnabled && (
        <ActivityFeed notifications={feedNotifications} />
      )}
    </>
  );
}

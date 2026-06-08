"use client";

import { AuditResultsSection } from "@/components/audit-results";
import { trackReportViewed } from "@/lib/analytics-events";
import { analyticsDomainFromUrl } from "@/lib/analytics-domain";
import type { EnrichedAuditResponse } from "@/lib/enrich-audit-response";
import type { GenerateFixesApiResponse } from "@/lib/types";
import Link from "next/link";
import { useEffect, useState } from "react";

type FixesResponse = GenerateFixesApiResponse;

export function SharedReportView({ reportId }: { reportId: string }) {
  const [result, setResult] = useState<EnrichedAuditResponse | null>(null);
  const [shareUrl, setShareUrl] = useState<string | undefined>();
  const [fixes, setFixes] = useState<FixesResponse | null>(null);
  const [fixesLoading, setFixesLoading] = useState(false);
  const [fixesError, setFixesError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadReport() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/report/${reportId}`);
        const data = (await response.json()) as {
          result?: EnrichedAuditResponse;
          fixes?: FixesResponse | null;
          error?: string;
        };

        if (!response.ok || !data.result) {
          throw new Error(data.error ?? "Report not found.");
        }

        setResult(data.result);
        setShareUrl(`/report/${reportId}`);
        trackReportViewed(reportId, analyticsDomainFromUrl(data.result.url));

        if (data.fixes) {
          setFixes(data.fixes);
          return;
        }

        setFixesLoading(true);
        const fixesResponse = await fetch("/api/generate-fixes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: data.result.url, reportId }),
        });
        const fixesData = (await fixesResponse.json()) as FixesResponse & { error?: string };

        if (!fixesResponse.ok) {
          throw new Error(fixesData.error ?? "Fix generation failed");
        }

        setFixes(fixesData);
      } catch (loadError) {
        setError(
          loadError instanceof Error ? loadError.message : "Unable to load shared report.",
        );
      } finally {
        setLoading(false);
        setFixesLoading(false);
      }
    }

    void loadReport();
  }, [reportId]);

  async function regenerateFixes() {
    if (!result) {
      return;
    }

    setFixesLoading(true);
    setFixesError(null);

    try {
      const response = await fetch("/api/generate-fixes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: result.url, reportId }),
      });
      const data = (await response.json()) as FixesResponse & { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Fix generation failed");
      }

      setFixes(data);
    } catch (regenerateError) {
      setFixesError(
        regenerateError instanceof Error
          ? regenerateError.message
          : "Something went wrong generating fixes",
      );
    } finally {
      setFixesLoading(false);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto w-full min-w-0 max-w-6xl px-6 py-10 lg:px-8 lg:py-14">
        <p className="text-sm text-text-secondary">Loading shared report…</p>
      </main>
    );
  }

  if (error || !result) {
    return (
      <main className="mx-auto w-full min-w-0 max-w-6xl px-6 py-10 lg:px-8 lg:py-14">
        <p className="text-sm text-rose-700 dark:text-rose-300">{error ?? "Report not found."}</p>
        <Link href="/" className="mt-4 inline-block text-sm font-medium text-blue-900 hover:underline dark:text-blue-300">
          ← Back to homepage
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full min-w-0 max-w-6xl space-y-8 px-6 py-10 lg:px-8 lg:py-14">
      <AuditResultsSection
        result={result}
        fixes={fixes}
        fixesLoading={fixesLoading}
        fixesError={fixesError}
        onRegenerateFixes={() => void regenerateFixes()}
        reportId={reportId}
        shareUrl={shareUrl}
        isSharedReport
      />
    </main>
  );
}

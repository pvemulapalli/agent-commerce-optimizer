"use client";

import { AuditResultsSection } from "@/components/audit-results";
import { PartialReportSection } from "@/components/partial-report-section";
import { trackReportViewed } from "@/lib/analytics-events";
import { scanContextFromAudit, scanContextFromPartialReport } from "@/lib/analytics-properties";
import { buildShareReportUrl } from "@/lib/share-report-url";
import type { ShareableReportRecord } from "@/lib/shareable-reports";
import type { EnrichedAuditResponse } from "@/lib/enrich-audit-response";
import type { GenerateFixesApiResponse, PartialReportResponse } from "@/lib/types";
import Link from "next/link";
import { useEffect, useState } from "react";

type FixesResponse = GenerateFixesApiResponse;

export function SharedReportView({ reportId }: { reportId: string }) {
  const [result, setResult] = useState<EnrichedAuditResponse | null>(null);
  const [partialReport, setPartialReport] = useState<PartialReportResponse | null>(null);
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
        const data = (await response.json()) as ShareableReportRecord & { error?: string };

        if (!response.ok) {
          throw new Error(data.error ?? "Report not found.");
        }

        setShareUrl(buildShareReportUrl(reportId));

        if (data.reportType === "partial" && data.partialReport) {
          setPartialReport(data.partialReport);
          trackReportViewed({
            reportId,
            ...scanContextFromPartialReport(data.partialReport),
          });
          return;
        }

        if (!data.result) {
          throw new Error("Report not found.");
        }

        setResult(data.result);
        trackReportViewed({
          reportId,
          ...scanContextFromAudit(data.result),
        });

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
      const fixesResponse = await fetch("/api/generate-fixes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: result.url, reportId }),
      });
      const fixesData = (await fixesResponse.json()) as FixesResponse & { error?: string };

      if (!fixesResponse.ok) {
        throw new Error(fixesData.error ?? "Fix generation failed");
      }

      setFixes(fixesData);
    } catch (regenerateError) {
      setFixesError(
        regenerateError instanceof Error
          ? regenerateError.message
          : "Unable to regenerate fixes.",
      );
    } finally {
      setFixesLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-16 text-center text-text-secondary">
        Loading report…
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-16 text-center">
        <p className="text-text-primary">{error}</p>
        <Link href="/" className="mt-4 inline-block text-blue-700 hover:underline dark:text-blue-300">
          Run a new scan
        </Link>
      </div>
    );
  }

  if (partialReport) {
    return (
      <div className="mx-auto w-full min-w-0 max-w-6xl space-y-8 px-6 py-10 lg:px-8 lg:py-14">
        <PartialReportSection
          report={partialReport}
          reportId={reportId}
          shareUrl={shareUrl}
          scanContext={scanContextFromPartialReport(partialReport)}
          isSharedReport
        />
      </div>
    );
  }

  if (!result) {
    return null;
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-6xl space-y-8 px-6 py-10 lg:px-8 lg:py-14">
      <AuditResultsSection
        result={result}
        fixes={fixes}
        fixesLoading={fixesLoading}
        fixesError={fixesError}
        onRegenerateFixes={regenerateFixes}
        reportId={reportId}
        shareUrl={shareUrl}
        isSharedReport
      />
    </div>
  );
}

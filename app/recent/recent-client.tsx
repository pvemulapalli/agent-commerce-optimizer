"use client";

import { AuditResultsSection } from "@/components/audit-results";
import { RecentAuditsList } from "@/components/recent-audits";
import { useRecentScans } from "@/hooks/use-recent-scans";
import type { RecentScanRecord } from "@/lib/scan-activity";
import type { AuditApiResponse, GenerateFixesApiResponse } from "@/lib/types";
import Link from "next/link";
import { useRef, useState } from "react";

type AuditResponse = AuditApiResponse;
type FixesResponse = GenerateFixesApiResponse;

export default function RecentAuditsPage() {
  const { activity, loading, error } = useRecentScans({ limit: 100, poll: false });
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [result, setResult] = useState<AuditResponse | null>(null);
  const [fixesLoading, setFixesLoading] = useState(false);
  const [fixesError, setFixesError] = useState<string | null>(null);
  const [fixes, setFixes] = useState<FixesResponse | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  async function regenerateFixes(targetUrl: string) {
    setFixesLoading(true);
    setFixesError(null);

    try {
      const fixesResponse = await fetch("/api/generate-fixes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: targetUrl }),
      });

      const fixesData = (await fixesResponse.json()) as FixesResponse & {
        error?: string;
      };

      if (!fixesResponse.ok) {
        throw new Error(fixesData.error ?? "Fix generation failed");
      }

      setFixes(fixesData);
    } catch (loadError) {
      setFixesError(
        loadError instanceof Error
          ? loadError.message
          : "Something went wrong generating fixes",
      );
    } finally {
      setFixesLoading(false);
    }
  }

  async function loadAuditReport(entry: RecentScanRecord) {
    setSelectedEntryId(entry.id);
    setAuditLoading(true);
    setAuditError(null);
    setResult(null);
    setFixes(null);
    setFixesError(null);

    try {
      const auditResponse = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: entry.url }),
      });

      const auditData = (await auditResponse.json()) as AuditResponse & {
        error?: string;
      };

      if (!auditResponse.ok) {
        throw new Error(auditData.error ?? "Audit request failed");
      }

      setResult(auditData);

      window.setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);

      setFixesLoading(true);

      await regenerateFixes(entry.url);
    } catch (loadError) {
      setAuditError(
        loadError instanceof Error
          ? loadError.message
          : "Something went wrong loading the audit",
      );
    } finally {
      setAuditLoading(false);
      setFixesLoading(false);
    }
  }

  return (
    <main className="mx-auto w-full min-w-0 max-w-6xl overflow-x-hidden px-6 py-10 lg:px-8 lg:py-14">
      <div className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
          Global scan history
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          Recent Audits
        </h1>
        <p className="mt-4 text-base leading-7 text-slate-600">
          Shared scan activity across all users, stored in Redis. Click a row to
          reload that audit report using existing cached audit data when available.
        </p>
      </div>

      <div className="mt-10">
        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-600">
            Loading recent scans…
          </div>
        ) : error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-6 py-10 text-center text-sm text-rose-800">
            {error}
          </div>
        ) : (
          <RecentAuditsList
            entries={activity.recentScans}
            selectedEntryId={selectedEntryId}
            onSelectEntry={(entry) => void loadAuditReport(entry)}
          />
        )}
      </div>

      {auditLoading && (
        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          Loading audit report…
        </div>
      )}

      {auditError && (
        <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {auditError}
        </div>
      )}

      {result && (
        <div ref={resultsRef} className="mt-10 scroll-mt-24">
          <AuditResultsSection
            result={result}
            fixes={fixes}
            fixesLoading={fixesLoading}
            fixesError={fixesError}
            onRegenerateFixes={() => void regenerateFixes(result.url)}
          />
        </div>
      )}

      <p className="mt-8">
        <Link
          href="/"
          className="text-sm font-medium text-blue-900 hover:underline"
        >
          ← Back to audit
        </Link>
      </p>
    </main>
  );
}

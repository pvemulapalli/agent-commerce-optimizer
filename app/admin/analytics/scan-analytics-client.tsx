"use client";

import { adminApiUrl, adminHeaders, readStoredAdminToken, storeAdminToken, verifyAdminToken } from "@/lib/admin-client-auth";
import { AdminToolsNav } from "@/components/admin-tools-nav";
import { adminPageHref } from "@/lib/admin-route";
import {
  adminBodyClass,
  adminHeadingClass,
  adminInputClass,
  adminSecondaryButtonClass,
  adminSectionClass,
  adminTableCellClass,
  adminTableHeadClass,
  adminTableHeaderCellClass,
  adminTableRowClass,
  adminTableWrapClass,
} from "@/lib/admin-theme-classes";
import type { ScanAnalyticsReport } from "@/lib/scan-analytics";
import { cardSurfaceClass, textPrimaryClass, textSecondaryClass } from "@/lib/theme-classes";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

function formatGeneratedAt(value: string): string {
  return new Date(value).toLocaleString();
}

function SummaryCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail?: string;
}) {
  return (
    <div className="rounded-xl border border-card-border bg-card-muted px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-text-primary">{value}</p>
      {detail ? <p className="mt-1 text-sm text-text-secondary">{detail}</p> : null}
    </div>
  );
}

function CountTable({
  title,
  rows,
  emptyMessage,
}: {
  title: string;
  rows: Array<{ label: string; count: number; percentage: number }>;
  emptyMessage: string;
}) {
  return (
    <section className={adminSectionClass}>
      <h2 className={adminHeadingClass}>{title}</h2>
      <div className={`${adminTableWrapClass} mt-4`}>
        <table className="min-w-full text-left text-sm">
          <thead className={adminTableHeadClass}>
            <tr>
              <th className={adminTableHeaderCellClass}>Item</th>
              <th className={adminTableHeaderCellClass}>Count</th>
              <th className={adminTableHeaderCellClass}>% of scans</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={3} className={`px-3 py-4 ${textSecondaryClass}`}>
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.label} className={adminTableRowClass}>
                  <td className={`${adminTableCellClass} font-medium text-text-primary`}>
                    {row.label}
                  </td>
                  <td className={adminTableCellClass}>{row.count}</td>
                  <td className={adminTableCellClass}>{row.percentage}%</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function ScanAnalyticsClient({ adminRoutePath }: { adminRoutePath: string }) {
  const [token, setToken] = useState("");
  const [tokenInput, setTokenInput] = useState("");
  const [checkingStoredToken, setCheckingStoredToken] = useState(true);
  const [unlocking, setUnlocking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<ScanAnalyticsReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadReport = useCallback(async (activeToken: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(adminApiUrl("/api/admin/scan-analytics", activeToken), {
        headers: adminHeaders(activeToken),
      });
      const data = (await response.json()) as ScanAnalyticsReport & { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to load scan analytics.");
      }

      setReport(data);
    } catch (loadError) {
      setReport(null);
      setError(loadError instanceof Error ? loadError.message : "Failed to load scan analytics.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    async function restoreSession() {
      const stored = readStoredAdminToken();

      if (!stored) {
        setCheckingStoredToken(false);
        return;
      }

      const verification = await verifyAdminToken(stored);

      if (verification.ok) {
        setToken(stored);
        await loadReport(stored);
      } else {
        storeAdminToken("");
        setError(verification.error);
      }

      setCheckingStoredToken(false);
    }

    void restoreSession();
  }, [loadReport]);

  async function handleUnlock(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUnlocking(true);
    setError(null);

    const verification = await verifyAdminToken(tokenInput);

    if (!verification.ok) {
      setError(verification.error);
      setUnlocking(false);
      return;
    }

    storeAdminToken(tokenInput);
    setToken(tokenInput.trim());
    setTokenInput("");
    await loadReport(tokenInput.trim());
    setUnlocking(false);
  }

  function clearToken() {
    storeAdminToken("");
    setToken("");
    setReport(null);
  }

  if (checkingStoredToken) {
    return (
      <div className={`${cardSurfaceClass} px-6 py-10 text-center text-sm ${textSecondaryClass}`}>
        Verifying admin session…
      </div>
    );
  }

  if (!token) {
    return (
      <div className={`max-w-lg ${adminSectionClass}`}>
        <h2 className={adminHeadingClass}>Admin access required</h2>
        <p className={adminBodyClass}>
          Scan analytics are available only after unlocking admin tools on this browser session.
          Use the same admin token as the main maintenance page.
        </p>
        <form className="mt-6 space-y-4" onSubmit={(event) => void handleUnlock(event)}>
          <label className={`block text-sm font-medium ${textPrimaryClass}`}>
            Admin token
            <input
              type="password"
              autoComplete="off"
              value={tokenInput}
              onChange={(event) => setTokenInput(event.target.value)}
              className={`mt-2 w-full ${adminInputClass}`}
              placeholder="Paste ADMIN_RESET_TOKEN"
            />
          </label>
          <button
            type="submit"
            disabled={unlocking}
            className="rounded-lg bg-blue-900 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-60 dark:bg-blue-700 dark:hover:bg-blue-600"
          >
            {unlocking ? "Verifying…" : "Unlock scan analytics"}
          </button>
        </form>
        <p className="mt-6">
          <Link
            href={adminPageHref(undefined, adminRoutePath)}
            className="text-sm font-medium text-blue-900 hover:underline dark:text-blue-300"
          >
            ← Back to admin tools
          </Link>
        </p>
        {error ? <p className="mt-4 text-sm text-rose-700 dark:text-rose-300">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className={`flex flex-wrap items-center justify-between gap-4 ${adminSectionClass}`}>
        <div>
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
            Admin session active
          </p>
          <p className={`mt-1 text-sm ${textSecondaryClass}`}>
            Aggregate scan analytics only. Individual merchant scores are not published
            anywhere outside this admin view. Use &ldquo;End admin session&rdquo; to clear
            your token and hide this page in this browser tab.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <AdminToolsNav adminRoutePath={adminRoutePath} currentPath="/analytics" />
          <button
            type="button"
            disabled={loading}
            onClick={() => void loadReport(token)}
            className={adminSecondaryButtonClass}
          >
            {loading ? "Refreshing…" : "Refresh report"}
          </button>
          <a
            href={adminApiUrl("/api/admin/scan-analytics/export?format=json", token)}
            className={adminSecondaryButtonClass}
          >
            Export JSON
          </a>
          <a
            href={adminApiUrl("/api/admin/scan-analytics/export?format=csv", token)}
            className={adminSecondaryButtonClass}
          >
            Export CSV
          </a>
          <button type="button" onClick={clearToken} className={adminSecondaryButtonClass}>
            End admin session
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-500/40 dark:bg-rose-950/30 dark:text-rose-200">
          {error}
        </div>
      ) : null}

      {!report && loading ? (
        <div className={`${cardSurfaceClass} px-6 py-10 text-center text-sm ${textSecondaryClass}`}>
          Building analytics report from Redis scan history…
        </div>
      ) : null}

      {report ? (
        <>
          <section className={adminSectionClass}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className={adminHeadingClass}>Overview</h2>
                <p className={adminBodyClass}>
                  Generated {formatGeneratedAt(report.generatedAt)} from{" "}
                  {report.dataSource.auditHistoryRecords} audit history records and{" "}
                  {report.dataSource.reportsWithFixes} reports with generated fixes.
                </p>
              </div>
              <Link
                href={adminPageHref(undefined, adminRoutePath)}
                className="text-sm font-medium text-blue-900 hover:underline dark:text-blue-300"
              >
                ← Admin tools
              </Link>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryCard label="Total scans" value={report.summary.totalScans} />
              <SummaryCard label="Unique domains" value={report.summary.uniqueDomains} />
              <SummaryCard
                label="robots.txt adoption"
                value={`${report.signalAdoption.robotsTxt.percentage}%`}
                detail={`${report.signalAdoption.robotsTxt.count} storefronts`}
              />
              <SummaryCard
                label="llms.txt adoption"
                value={`${report.signalAdoption.llmsTxt.percentage}%`}
                detail={`${report.signalAdoption.llmsTxt.count} storefronts`}
              />
            </div>
          </section>

          <section className={adminSectionClass}>
            <h2 className={adminHeadingClass}>Publishable insights</h2>
            <p className={adminBodyClass}>
              Draft talking points for LinkedIn and X based on aggregate patterns. Review before
              posting — do not include individual merchant scores publicly.
            </p>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-text-secondary">
              {report.publishableInsights.length === 0 ? (
                <li>No insights yet. Complete more scans to populate this section.</li>
              ) : (
                report.publishableInsights.map((insight) => (
                  <li key={insight} className="rounded-lg border border-card-border bg-card-muted px-4 py-3">
                    {insight}
                  </li>
                ))
              )}
            </ul>
          </section>

          <CountTable
            title="Commerce platform distribution"
            rows={report.platformDistribution}
            emptyMessage="No completed scans yet."
          />

          <section className={adminSectionClass}>
            <h2 className={adminHeadingClass}>Average readiness score by platform</h2>
            <div className={`${adminTableWrapClass} mt-4`}>
              <table className="min-w-full text-left text-sm">
                <thead className={adminTableHeadClass}>
                  <tr>
                    <th className={adminTableHeaderCellClass}>Platform</th>
                    <th className={adminTableHeaderCellClass}>Average score</th>
                    <th className={adminTableHeaderCellClass}>Sample size</th>
                  </tr>
                </thead>
                <tbody>
                  {report.averageScoreByPlatform.length === 0 ? (
                    <tr>
                      <td colSpan={3} className={`px-3 py-4 ${textSecondaryClass}`}>
                        No completed scans yet.
                      </td>
                    </tr>
                  ) : (
                    report.averageScoreByPlatform.map((row) => (
                      <tr key={row.platform} className={adminTableRowClass}>
                        <td className={`${adminTableCellClass} font-medium text-text-primary`}>
                          {row.platform}
                        </td>
                        <td className={adminTableCellClass}>{row.averageScore}</td>
                        <td className={adminTableCellClass}>{row.sampleSize}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <CountTable
            title="Most common failed checks"
            rows={report.mostCommonFailedChecks}
            emptyMessage="No missing-check patterns recorded yet."
          />

          <CountTable
            title="Most common generated fixes"
            rows={report.mostCommonGeneratedFixes}
            emptyMessage="No generated fix bundles found in Redis yet."
          />

          <section className={adminSectionClass}>
            <h2 className={adminHeadingClass}>Discovery signal adoption</h2>
            <div className={`${adminTableWrapClass} mt-4`}>
              <table className="min-w-full text-left text-sm">
                <thead className={adminTableHeadClass}>
                  <tr>
                    <th className={adminTableHeaderCellClass}>Signal</th>
                    <th className={adminTableHeaderCellClass}>Storefronts</th>
                    <th className={adminTableHeaderCellClass}>% of scans</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: "robots.txt", data: report.signalAdoption.robotsTxt },
                    { label: "sitemap.xml", data: report.signalAdoption.sitemapXml },
                    { label: "llms.txt", data: report.signalAdoption.llmsTxt },
                    {
                      label: "merchant profile (Organization schema)",
                      data: report.signalAdoption.merchantProfile,
                    },
                  ].map((row) => (
                    <tr key={row.label} className={adminTableRowClass}>
                      <td className={`${adminTableCellClass} font-medium text-text-primary`}>
                        {row.label}
                      </td>
                      <td className={adminTableCellClass}>{row.data.count}</td>
                      <td className={adminTableCellClass}>{row.data.percentage}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className={adminSectionClass}>
            <h2 className={adminHeadingClass}>Top 10 highest scoring domains</h2>
            <p className={adminBodyClass}>Best score per domain across scan history. Admin-only.</p>
            <div className={`${adminTableWrapClass} mt-4`}>
              <table className="min-w-full text-left text-sm">
                <thead className={adminTableHeadClass}>
                  <tr>
                    <th className={adminTableHeaderCellClass}>Domain</th>
                    <th className={adminTableHeaderCellClass}>Score</th>
                    <th className={adminTableHeaderCellClass}>Grade</th>
                    <th className={adminTableHeaderCellClass}>Platform</th>
                  </tr>
                </thead>
                <tbody>
                  {report.topScoringDomains.length === 0 ? (
                    <tr>
                      <td colSpan={4} className={`px-3 py-4 ${textSecondaryClass}`}>
                        No scored domains yet.
                      </td>
                    </tr>
                  ) : (
                    report.topScoringDomains.map((row) => (
                      <tr key={row.domain} className={adminTableRowClass}>
                        <td className={`${adminTableCellClass} font-medium text-text-primary`}>
                          {row.domain}
                        </td>
                        <td className={adminTableCellClass}>{row.score}</td>
                        <td className={adminTableCellClass}>{row.grade}</td>
                        <td className={adminTableCellClass}>{row.platform}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className={adminSectionClass}>
            <h2 className={adminHeadingClass}>Top 10 most scanned domains</h2>
            <div className={`${adminTableWrapClass} mt-4`}>
              <table className="min-w-full text-left text-sm">
                <thead className={adminTableHeadClass}>
                  <tr>
                    <th className={adminTableHeaderCellClass}>Domain</th>
                    <th className={adminTableHeaderCellClass}>Scan count</th>
                    <th className={adminTableHeaderCellClass}>Latest platform</th>
                  </tr>
                </thead>
                <tbody>
                  {report.mostScannedDomains.length === 0 ? (
                    <tr>
                      <td colSpan={3} className={`px-3 py-4 ${textSecondaryClass}`}>
                        No rescan patterns yet.
                      </td>
                    </tr>
                  ) : (
                    report.mostScannedDomains.map((row) => (
                      <tr key={row.domain} className={adminTableRowClass}>
                        <td className={`${adminTableCellClass} font-medium text-text-primary`}>
                          {row.domain}
                        </td>
                        <td className={adminTableCellClass}>{row.scanCount}</td>
                        <td className={adminTableCellClass}>{row.platform}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className={adminSectionClass}>
            <h2 className={adminHeadingClass}>Top opportunities by platform</h2>
            <p className={adminBodyClass}>
              Most common readiness gaps by platform from scan opportunity labels.
            </p>
            {report.topOpportunitiesByPlatform.length === 0 ? (
              <p className={`mt-4 text-sm ${textSecondaryClass}`}>No platform opportunity data yet.</p>
            ) : (
              <div className="mt-4 space-y-6">
                {report.topOpportunitiesByPlatform.map((platformEntry) => (
                  <div key={platformEntry.platform}>
                    <h3 className="text-sm font-semibold text-text-primary">{platformEntry.platform}</h3>
                    <div className={`${adminTableWrapClass} mt-3`}>
                      <table className="min-w-full text-left text-sm">
                        <thead className={adminTableHeadClass}>
                          <tr>
                            <th className={adminTableHeaderCellClass}>Opportunity</th>
                            <th className={adminTableHeaderCellClass}>Count</th>
                            <th className={adminTableHeaderCellClass}>% of platform scans</th>
                          </tr>
                        </thead>
                        <tbody>
                          {platformEntry.opportunities.map((row) => (
                            <tr key={`${platformEntry.platform}-${row.label}`} className={adminTableRowClass}>
                              <td className={`${adminTableCellClass} font-medium text-text-primary`}>
                                {row.label}
                              </td>
                              <td className={adminTableCellClass}>{row.count}</td>
                              <td className={adminTableCellClass}>{row.percentage}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}

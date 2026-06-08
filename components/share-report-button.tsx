"use client";

import { buildShareReportUrl } from "@/lib/share-report-url";
import { trackReportShared } from "@/lib/analytics-events";
import type { ScanAnalyticsProperties } from "@/lib/analytics-properties";
import { useCopyToast, CopyToast } from "@/components/copy-toast";

function ShareIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="M8.59 13.51 15.42 17.49" />
      <path d="M15.41 6.51 8.59 10.49" />
    </svg>
  );
}

export function ShareReportButton({
  reportId,
  shareUrl,
  scanContext,
}: {
  reportId?: string;
  shareUrl?: string;
  scanContext?: ScanAnalyticsProperties;
}) {
  const { toastMessage, clearToast, copyWithToast } = useCopyToast();

  if (!reportId && !shareUrl) {
    return null;
  }

  const href = shareUrl ?? buildShareReportUrl(reportId!);

  async function handleShare() {
    const absoluteUrl =
      href.startsWith("http") ? href : `${window.location.origin}${href}`;
    if (reportId) {
      trackReportShared({
        reportId,
        ...scanContext,
        domain: scanContext?.domain ?? "unknown",
      });
    }
    await copyWithToast(absoluteUrl, "Shareable report link copied.");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => void handleShare()}
        className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-card px-4 py-2 text-sm font-medium text-blue-900 transition hover:bg-blue-50 dark:border-blue-500/40 dark:text-blue-100 dark:hover:bg-blue-950/40"
      >
        <ShareIcon />
        Share
      </button>
      {toastMessage ? <CopyToast message={toastMessage} onDone={clearToast} /> : null}
    </>
  );
}

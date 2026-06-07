"use client";

import { buildShareReportUrl } from "@/lib/share-report-url";
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
}: {
  reportId?: string;
  shareUrl?: string;
}) {
  const { toastMessage, clearToast, copyWithToast } = useCopyToast();

  if (!reportId && !shareUrl) {
    return null;
  }

  const href = shareUrl ?? buildShareReportUrl(reportId!);

  async function handleShare() {
    const absoluteUrl =
      href.startsWith("http") ? href : `${window.location.origin}${href}`;
    await copyWithToast(absoluteUrl, "Shareable report link copied.");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => void handleShare()}
        className="inline-flex items-center gap-2 rounded-full border border-amber-700/70 bg-slate-950 px-4 py-2 text-sm font-medium text-amber-200/90 transition hover:border-amber-600 hover:bg-slate-900 hover:text-amber-100 dark:border-amber-600/50 dark:bg-slate-950 dark:text-amber-200 dark:hover:border-amber-500 dark:hover:text-amber-100"
      >
        <ShareIcon />
        Share
      </button>
      {toastMessage ? <CopyToast message={toastMessage} onDone={clearToast} /> : null}
    </>
  );
}

"use client";

import { StorefrontReviewRequestPanel } from "@/components/storefront-review-request-panel";
import { shouldOfferStorefrontReviewRequest } from "@/lib/storefront-review-eligibility";

export function DomainReviewNotice({
  title,
  message,
  storefrontUrl,
  reviewType,
  onScanAnother,
}: {
  title: string;
  message: string;
  storefrontUrl: string;
  reviewType?: string;
  onScanAnother: () => void;
}) {
  return (
    <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/80 p-6 dark:border-amber-500/30 dark:bg-amber-950/40">
      <h2 className="text-lg font-semibold text-amber-950 dark:text-amber-100">{title}</h2>
      <p className="mt-3 text-sm leading-7 text-amber-900 dark:text-amber-100/90">{message}</p>
      <button
        type="button"
        onClick={onScanAnother}
        className="mt-5 inline-flex items-center justify-center rounded-lg bg-amber-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-800 dark:bg-amber-700 dark:hover:bg-amber-600"
      >
        Try Another Site
      </button>

      {reviewType && shouldOfferStorefrontReviewRequest(reviewType) ? (
        <StorefrontReviewRequestPanel storefrontUrl={storefrontUrl} failureType={reviewType} />
      ) : null}
    </div>
  );
}

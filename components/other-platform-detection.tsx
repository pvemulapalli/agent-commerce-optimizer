"use client";

import { PlatformFeedbackModal } from "@/components/platform-feedback-modal";
import { PlatformLabel } from "@/components/platform-label";
import { trackBuiltWithClicked } from "@/lib/analytics-events";
import type { ScanAnalyticsProperties } from "@/lib/analytics-properties";
import { getBuiltWithProfileUrl } from "@/lib/builtwith-url";
import { normalizeDomainFromUrl } from "@/lib/domain-normalization";

export const OTHER_PLATFORM_DETECTION_EXPLANATION =
  "Commerce platform could not be confidently identified from storefront signals.";

export function OtherPlatformDetectionDetails({
  auditUrl,
  showFeedback = true,
  scanContext,
}: {
  auditUrl: string;
  showFeedback?: boolean;
  scanContext?: ScanAnalyticsProperties;
}) {
  const builtWithUrl = getBuiltWithProfileUrl(auditUrl);
  const domain = normalizeDomainFromUrl(auditUrl);

  function handleBuiltWithClick() {
    trackBuiltWithClicked({
      domain: scanContext?.domain ?? domain,
      platform: scanContext?.platform,
      score: scanContext?.score,
      grade: scanContext?.grade,
      top_gap: scanContext?.top_gap,
    });
  }

  return (
    <div className="mt-6 rounded-xl border border-card-border bg-card-muted p-4">
      <p className="text-sm leading-6 text-text-secondary">{OTHER_PLATFORM_DETECTION_EXPLANATION}</p>
      {showFeedback ? (
        <div className="mt-3">
          <PlatformFeedbackModal domain={domain} />
        </div>
      ) : null}
      <p className="mt-3">
        <a
          href={builtWithUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleBuiltWithClick}
          className="text-sm font-medium text-blue-900 hover:underline dark:text-blue-300"
        >
          Check BuiltWith technology profile
        </a>
      </p>
      <p className="mt-2 text-xs text-text-secondary">
        External reference only. Not affiliated with Commerce Optimizer.
      </p>
    </div>
  );
}

export function PlatformValue({ platform }: { platform: string | null | undefined }) {
  return <PlatformLabel platform={platform} />;
}

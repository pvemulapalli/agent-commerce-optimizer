"use client";

import { appendAnalyticsEventLog } from "@/lib/analytics-event-log";
import { analyticsDomainFromUrl } from "@/lib/analytics-domain";
import {
  isEffectiveGa4TrackingEnabled,
  isEffectivePostHogTrackingEnabled,
} from "@/lib/analytics-runtime";
import {
  compactAnalyticsProperties,
  scanContextFromRecentScan,
  scanContextFromUrl,
  type ScanAnalyticsProperties,
} from "@/lib/analytics-properties";
import type { RecentScanRecord } from "@/lib/scan-activity-types";

type PostHogClient = {
  capture: (event: string, properties?: Record<string, unknown>) => void;
};

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

let posthogInitPromise: Promise<PostHogClient | null> | null = null;

async function getPostHogClient(): Promise<PostHogClient | null> {
  if (!isEffectivePostHogTrackingEnabled()) {
    return null;
  }

  if (!posthogInitPromise) {
    posthogInitPromise = import("posthog-js").then(({ default: posthog }) => {
      const key = process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim();
      const host = process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim();

      if (!key || !host) {
        return null;
      }

      posthog.init(key, {
        api_host: host,
        capture_pageview: false,
        capture_pageleave: true,
        persistence: "localStorage+cookie",
        session_recording: {
          maskAllInputs: true,
          maskTextSelector: "[data-ph-mask]",
        },
      });

      return posthog;
    });
  }

  return posthogInitPromise;
}

export function initPostHogAnalytics(): void {
  void getPostHogClient();
}

type PostHogLifecycleClient = PostHogClient & {
  opt_out_capturing?: () => void;
  opt_in_capturing?: () => void;
  reset?: () => void;
};

export async function suppressPostHogCapturing(): Promise<void> {
  if (!posthogInitPromise) {
    return;
  }

  try {
    const posthog = (await posthogInitPromise) as PostHogLifecycleClient | null;
    posthog?.opt_out_capturing?.();
    posthog?.reset?.();
    posthogInitPromise = null;
  } catch {
    posthogInitPromise = null;
  }
}

export async function resumePostHogCapturing(): Promise<void> {
  posthogInitPromise = null;
  initPostHogAnalytics();
}

function trackGa4Event(event: string, properties?: Record<string, unknown>): boolean {
  if (!isEffectiveGa4TrackingEnabled() || typeof window.gtag !== "function") {
    return false;
  }

  window.gtag("event", event, properties);
  return true;
}

async function captureAnalyticsEvent(
  event: string,
  properties?: Record<string, unknown>,
): Promise<void> {
  const payload = properties ? compactAnalyticsProperties(properties) : {};
  let delivered = false;

  if (!isEffectiveGa4TrackingEnabled() && !isEffectivePostHogTrackingEnabled()) {
    appendAnalyticsEventLog({
      event,
      properties: payload,
      timestamp: new Date().toISOString(),
      delivered: false,
    });
    return;
  }

  try {
    const posthog = await getPostHogClient();
    if (posthog) {
      posthog.capture(event, payload);
      delivered = true;
    }
  } catch {
    // Analytics should never block product flows.
  }

  if (trackGa4Event(event, payload)) {
    delivered = true;
  }

  appendAnalyticsEventLog({
    event,
    properties: payload,
    timestamp: new Date().toISOString(),
    delivered,
  });
}

function withScanContext(
  context: ScanAnalyticsProperties,
  extra?: Record<string, unknown>,
): Record<string, unknown> {
  return {
    domain: context.domain,
    platform: context.platform,
    score: context.score,
    grade: context.grade,
    top_gap: context.top_gap,
    ...extra,
  };
}

export function trackScanStarted(context: ScanAnalyticsProperties): void {
  void captureAnalyticsEvent("scan_started", withScanContext(context));
}

export function trackTechnologyDetectionStarted(context: ScanAnalyticsProperties): void {
  void captureAnalyticsEvent("technology_detection_started", withScanContext(context));
}

export function trackTechnologyDetectionCompleted(
  context: ScanAnalyticsProperties & {
    platformConfidence?: string;
    reportType?: string;
  },
): void {
  void captureAnalyticsEvent(
    "technology_detection_completed",
    withScanContext(context, {
      platformConfidence: context.platformConfidence ?? null,
      reportType: context.reportType ?? null,
    }),
  );
}

export function trackTechnologyDetectionFailed(
  context: ScanAnalyticsProperties & { failureReason?: string },
): void {
  void captureAnalyticsEvent(
    "technology_detection_failed",
    withScanContext(context, { failureReason: context.failureReason ?? null }),
  );
}

export function trackFullAuditStarted(context: ScanAnalyticsProperties): void {
  void captureAnalyticsEvent("full_audit_started", withScanContext(context));
}

export function trackFullAuditCompleted(
  context: ScanAnalyticsProperties & { scanDuration: number | null; reportType?: string },
): void {
  void captureAnalyticsEvent(
    "full_audit_completed",
    withScanContext(context, {
      scanDuration: context.scanDuration,
      reportType: context.reportType ?? "full",
    }),
  );
}

export function trackFullAuditFailed(
  context: ScanAnalyticsProperties & { failureReason?: string; reportType?: string },
): void {
  void captureAnalyticsEvent(
    "full_audit_failed",
    withScanContext(context, {
      failureReason: context.failureReason ?? null,
      reportType: context.reportType ?? null,
    }),
  );
}

export function trackPartialReportCreated(
  context: ScanAnalyticsProperties & {
    failureReason?: string;
    platformConfidence?: string;
  },
): void {
  void captureAnalyticsEvent(
    "partial_report_created",
    withScanContext(context, {
      failureReason: context.failureReason ?? null,
      platformConfidence: context.platformConfidence ?? null,
      reportType: "partial",
    }),
  );
}

export function trackDomainReviewCreated(
  context: ScanAnalyticsProperties & { reviewType?: string; reviewStatus?: string },
): void {
  void captureAnalyticsEvent(
    "domain_review_created",
    withScanContext(context, {
      type: context.reviewType ?? null,
      status: context.reviewStatus ?? null,
    }),
  );
}

export function trackDomainReviewUpdated(
  context: ScanAnalyticsProperties & { reviewType?: string; reviewStatus?: string },
): void {
  void captureAnalyticsEvent(
    "domain_review_updated",
    withScanContext(context, {
      type: context.reviewType ?? null,
      status: context.reviewStatus ?? null,
    }),
  );
}

export function trackDomainReviewReclassified(
  context: ScanAnalyticsProperties & { reviewType?: string; reviewStatus?: string },
): void {
  void captureAnalyticsEvent(
    "domain_review_reclassified",
    withScanContext(context, {
      type: context.reviewType ?? null,
      status: context.reviewStatus ?? null,
    }),
  );
}

export function trackDomainReviewWhitelisted(
  context: ScanAnalyticsProperties & { reviewType?: string; reviewStatus?: string },
): void {
  void captureAnalyticsEvent(
    "domain_review_whitelisted",
    withScanContext(context, {
      type: context.reviewType ?? null,
      status: context.reviewStatus ?? null,
    }),
  );
}

export function trackDomainReviewBlocked(
  context: ScanAnalyticsProperties & { reviewType?: string; reviewStatus?: string },
): void {
  void captureAnalyticsEvent(
    "domain_review_updated",
    withScanContext(context, {
      type: context.reviewType ?? null,
      status: context.reviewStatus ?? null,
      failureReason: "blocked_scan_attempt",
    }),
  );
}

export function trackStorefrontReviewRequested(
  context: ScanAnalyticsProperties & { failureType?: string },
): void {
  void captureAnalyticsEvent(
    "storefront_review_requested",
    withScanContext(context, {
      failureType: context.failureType ?? null,
    }),
  );
}

export function trackStorefrontReviewSubmitted(
  context: ScanAnalyticsProperties & { failureType?: string; relationship?: string },
): void {
  void captureAnalyticsEvent(
    "storefront_review_submitted",
    withScanContext(context, {
      failureType: context.failureType ?? null,
      relationship: context.relationship ?? null,
    }),
  );
}

export function trackStorefrontReviewCompleted(
  context: ScanAnalyticsProperties & { failureType?: string; relationship?: string; status?: string },
): void {
  void captureAnalyticsEvent(
    "storefront_review_completed",
    withScanContext(context, {
      failureType: context.failureType ?? null,
      relationship: context.relationship ?? null,
      status: context.status ?? null,
    }),
  );
}

export function trackScanCompleted(
  context: ScanAnalyticsProperties & { scanDuration: number | null },
): void {
  void captureAnalyticsEvent(
    "scan_completed",
    withScanContext(context, { scanDuration: context.scanDuration }),
  );
}

export function trackPlatformDetected(
  context: ScanAnalyticsProperties & {
    confidence?: string;
    confidenceScore?: number;
  },
): void {
  void captureAnalyticsEvent(
    "platform_detected",
    withScanContext(context, {
      confidence: context.confidence ?? null,
      confidenceScore: context.confidenceScore ?? null,
    }),
  );
}

export function trackScanFailed(
  context: ScanAnalyticsProperties & { reason: string },
): void {
  void captureAnalyticsEvent("scan_failed", withScanContext(context, { reason: context.reason }));
}

export function trackReportShared(
  context: ScanAnalyticsProperties & { reportId: string },
): void {
  void captureAnalyticsEvent(
    "report_shared",
    withScanContext(context, { reportId: context.reportId }),
  );
}

export function trackFixPromptCopied(
  context: ScanAnalyticsProperties & { findingId: string; findingTitle: string },
): void {
  void captureAnalyticsEvent(
    "fix_prompt_copied",
    withScanContext(context, {
      findingId: context.findingId,
      findingTitle: context.findingTitle,
    }),
  );
}

export function trackBuiltWithClicked(context: ScanAnalyticsProperties): void {
  void captureAnalyticsEvent("builtwith_clicked", withScanContext(context));
}

export function trackReportDownloaded(
  context: ScanAnalyticsProperties & { filename: string },
): void {
  void captureAnalyticsEvent(
    "report_downloaded",
    withScanContext(context, { filename: context.filename }),
  );
}

export function trackRecentScanClicked(context: ScanAnalyticsProperties): void {
  void captureAnalyticsEvent("recent_scan_clicked", withScanContext(context));
}

export function trackContactClicked(location: "header" | "footer" | "mobile_nav"): void {
  void captureAnalyticsEvent("contact_clicked", { location });
}

export function trackFeedbackSubmitted(sentiment: string, reportId?: string): void {
  void captureAnalyticsEvent("feedback_submitted", {
    sentiment,
    reportId: reportId ?? null,
  });
}

export function trackReportViewed(context: ScanAnalyticsProperties & { reportId: string }): void {
  void captureAnalyticsEvent(
    "report_viewed",
    withScanContext(context, { reportId: context.reportId }),
  );
}

export function trackPermalinkOpened(
  context: ScanAnalyticsProperties & { reportId: string; domainSlug: string },
): void {
  void captureAnalyticsEvent(
    "permalink_opened",
    withScanContext(context, {
      reportId: context.reportId,
      domainSlug: context.domainSlug,
    }),
  );
}

export function trackNewScanClicked(currentReportId?: string): void {
  void captureAnalyticsEvent("new_scan_clicked", {
    currentReportId: currentReportId ?? null,
  });
}

export function trackScanStartedFromUrl(url: string): void {
  const context = scanContextFromUrl(url);
  trackScanStarted(context);
  trackTechnologyDetectionStarted(context);
}

export function trackScanFailedFromUrl(
  url: string,
  reason: string,
  context?: ScanAnalyticsProperties,
): void {
  trackScanFailed({
    domain: analyticsDomainFromUrl(url),
    ...context,
    reason,
  });
}

export function trackRecentScanClickedFromEntry(entry: RecentScanRecord): void {
  trackRecentScanClicked(scanContextFromRecentScan(entry));
}

/** @deprecated Use trackReportShared */
export function trackShareReport(reportId: string, domain: string): void {
  trackReportShared({ reportId, domain });
}

/** @deprecated Use trackFixPromptCopied */
export function trackCopyFixPrompt(input: {
  findingId: string;
  findingTitle: string;
  platform?: string;
  domain?: string;
  score?: number | null;
  grade?: string | null;
  top_gap?: string | null;
}): void {
  trackFixPromptCopied({
    domain: input.domain,
    platform: input.platform,
    score: input.score,
    grade: input.grade,
    top_gap: input.top_gap,
    findingId: input.findingId,
    findingTitle: input.findingTitle,
  });
}

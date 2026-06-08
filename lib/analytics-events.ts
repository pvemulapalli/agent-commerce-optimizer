"use client";

import { appendAnalyticsEventLog } from "@/lib/analytics-event-log";
import { analyticsDomainFromUrl } from "@/lib/analytics-domain";
import { isGa4TrackingEnabled, isPostHogTrackingEnabled } from "@/lib/analytics-config";
import {
  compactAnalyticsProperties,
  scanContextFromRecentScan,
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
  if (!isPostHogTrackingEnabled()) {
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

function trackGa4Event(event: string, properties?: Record<string, unknown>): boolean {
  if (!isGa4TrackingEnabled() || typeof window.gtag !== "function") {
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

export function trackScanCompleted(
  context: ScanAnalyticsProperties & { scanDuration: number | null },
): void {
  void captureAnalyticsEvent(
    "scan_completed",
    withScanContext(context, { scanDuration: context.scanDuration }),
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

export function trackNewScanClicked(currentReportId?: string): void {
  void captureAnalyticsEvent("new_scan_clicked", {
    currentReportId: currentReportId ?? null,
  });
}

export function trackScanStartedFromUrl(url: string): void {
  trackScanStarted({ domain: analyticsDomainFromUrl(url) });
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

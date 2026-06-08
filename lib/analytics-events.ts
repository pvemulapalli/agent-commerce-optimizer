"use client";

import { appendAnalyticsEventLog } from "@/lib/analytics-event-log";
import { analyticsDomainFromUrl } from "@/lib/analytics-domain";
import { isPostHogTrackingEnabled } from "@/lib/analytics-config";
import type { ConfidenceLevel, CommercePlatform } from "@/lib/types";

type PostHogClient = {
  capture: (event: string, properties?: Record<string, unknown>) => void;
};

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

async function capturePostHogEvent(
  event: string,
  properties?: Record<string, unknown>,
): Promise<void> {
  let delivered = false;

  try {
    const posthog = await getPostHogClient();
    if (posthog) {
      posthog.capture(event, properties);
      delivered = true;
    }
  } catch {
    // Analytics should never block product flows.
  }

  appendAnalyticsEventLog({
    event,
    properties,
    timestamp: new Date().toISOString(),
    delivered,
  });
}

export function trackScanStarted(domain: string): void {
  void capturePostHogEvent("scan_started", { domain });
}

export function trackScanCompleted(input: {
  domain: string;
  platform: CommercePlatform;
  score: number;
  grade: string;
  scanDuration: number | null;
}): void {
  void capturePostHogEvent("scan_completed", {
    domain: input.domain,
    platform: input.platform,
    score: input.score,
    grade: input.grade,
    scanDuration: input.scanDuration,
  });
}

export function trackScanFailed(domain: string, reason: string): void {
  void capturePostHogEvent("scan_failed", { domain, reason });
}

export function trackPlatformDetected(platform: CommercePlatform, confidence: ConfidenceLevel): void {
  void capturePostHogEvent("platform_detected", { platform, confidence });
}

export function trackCopyFixPrompt(input: {
  findingId: string;
  findingTitle: string;
  platform?: CommercePlatform;
}): void {
  void capturePostHogEvent("copy_fix_prompt", {
    findingId: input.findingId,
    findingTitle: input.findingTitle,
    platform: input.platform ?? "Unknown",
  });
}

export function trackShareReport(reportId: string, domain: string): void {
  void capturePostHogEvent("share_report", { reportId, domain });
}

export function trackFeedbackSubmitted(sentiment: string, reportId?: string): void {
  void capturePostHogEvent("feedback_submitted", {
    sentiment,
    reportId: reportId ?? null,
  });
}

export function trackReportViewed(reportId: string, domain: string): void {
  void capturePostHogEvent("report_viewed", { reportId, domain });
}

export function trackNewScanClicked(currentReportId?: string): void {
  void capturePostHogEvent("new_scan_clicked", {
    currentReportId: currentReportId ?? null,
  });
}

export function trackScanStartedFromUrl(url: string): void {
  trackScanStarted(analyticsDomainFromUrl(url));
}

export function trackScanFailedFromUrl(url: string, reason: string): void {
  trackScanFailed(analyticsDomainFromUrl(url), reason);
}

"use client";

import { ActivityFeed } from "@/components/activity-feed";
import { AuditHero } from "@/components/audit-hero";
import { AuditResultsSection } from "@/components/audit-results";
import { HowItWorksSection } from "@/components/how-it-works-section";
import { PartialReportSection } from "@/components/partial-report-section";
import { MarketingSections } from "@/components/marketing-sections";
import { ReportPreviewSection } from "@/components/report-preview-section";
import { PlatformReadinessCards } from "@/components/platform-readiness-cards";
import { RecentAuditsPreview } from "@/components/recent-audits";
import { shouldShowTurnstileWidget } from "@/components/turnstile-widget";
import { useRecentScans } from "@/hooks/use-recent-scans";
import { isBotVerificationScanResponse } from "@/lib/bot-verification-messages";
import type { BotVerificationDiagnostic } from "@/lib/bot-verification-diagnostics";
import { isDomainReviewBlockedScanResponse } from "@/lib/domain-review-messages";
import { isNonEcommerceScanResponse } from "@/lib/non-ecommerce-messages";
import { isScanFailureResponse } from "@/lib/scan-failure-diagnostics";
import type { ScanFailureDiagnostic } from "@/lib/scan-failure-diagnostics";
import { isStorefrontPasswordScanResponse } from "@/lib/storefront-password-messages";
import type { StorefrontPasswordDiagnostic } from "@/lib/storefront-password-diagnostics";
import { isActivityFeedEnabled } from "@/lib/scan-activity-config";
import { normalizeAuditUrl } from "@/lib/audit-url";
import { getAuditUrlValidationError } from "@/lib/audit-url-validation";
import { parseApiResponse } from "@/lib/parse-api-response";
import { scrollToAuditOverview, scrollToElementById } from "@/lib/scroll-utils";
import { isPartialReportResponse } from "@/lib/partial-report";
import type { EnrichedAuditResponse } from "@/lib/enrich-audit-response";
import type { GenerateFixesApiResponse, PartialReportResponse } from "@/lib/types";
import type { RecentScanRecord } from "@/lib/scan-activity-types";
import {
  trackFullAuditCompleted,
  trackFullAuditFailed,
  trackHeroScanStarted,
  trackNewScanClicked,
  trackPartialReportCreated,
  trackPlatformDetected,
  trackRecentScanClickedFromEntry,
  trackScanCompleted,
  trackScanFailedFromUrl,
  trackScanStartedFromUrl,
  trackTechnologyDetectionCompleted,
  trackTechnologyDetectionFailed,
  trackDomainReviewBlocked,
} from "@/lib/analytics-events";
import { scanContextFromAudit, scanContextFromPartialReport } from "@/lib/analytics-properties";
import { useCallback, useEffect, useRef, useState } from "react";

type AuditResponse = EnrichedAuditResponse & {
  scanRecord?: { id: string; hostname: string };
  reportId?: string;
  shareUrl?: string;
  reportType?: "full";
};
type PartialAuditResponse = PartialReportResponse & {
  scanRecord?: { id: string; hostname: string };
};
type FixesResponse = GenerateFixesApiResponse;

function trackSuccessfulAudit(data: AuditResponse): void {
  const scanContext = scanContextFromAudit(data);
  trackTechnologyDetectionCompleted({
    ...scanContext,
    platformConfidence: data.platform.confidence,
    reportType: "full",
  });
  trackFullAuditCompleted({
    ...scanContext,
    scanDuration: data.crawlDurationSec,
    reportType: "full",
  });
  trackScanCompleted({
    ...scanContext,
    scanDuration: data.crawlDurationSec,
  });
  trackPlatformDetected({
    ...scanContext,
    confidence: data.platform.confidence,
    confidenceScore: data.platform.confidenceScore,
  });
}

function trackPartialAudit(data: PartialAuditResponse): void {
  const scanContext = scanContextFromPartialReport(data);
  trackTechnologyDetectionCompleted({
    ...scanContext,
    platformConfidence: data.technologyDetection.platformConfidence,
    reportType: "partial",
  });
  trackFullAuditFailed({
    ...scanContext,
    failureReason: data.fullAuditFailure.reason,
    reportType: "partial",
  });
  trackPartialReportCreated({
    ...scanContext,
    failureReason: data.fullAuditFailure.reason,
    platformConfidence: data.technologyDetection.platformConfidence,
  });
  trackPlatformDetected({
    ...scanContext,
    confidence: data.technologyDetection.platformConfidence,
    confidenceScore: data.technologyDetection.detectedPlatform.confidenceScore,
  });
}

function handleAuditApiResponse(
  targetUrl: string,
  data: AuditResponse | PartialAuditResponse,
  responseOk: boolean,
): "partial" | "full" | "handled" {
  if (isPartialReportResponse(data)) {
    trackPartialAudit(data);
    return "partial";
  }

  if (!responseOk) {
    return "handled";
  }

  trackSuccessfulAudit(data as AuditResponse);
  return "full";
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nonEcommerceMessage, setNonEcommerceMessage] = useState<string | null>(null);
  const [domainReviewNotice, setDomainReviewNotice] = useState<{
    title: string;
    message: string;
    reviewType?: string;
  } | null>(null);
  const [botVerificationDiagnostic, setBotVerificationDiagnostic] =
    useState<BotVerificationDiagnostic | null>(null);
  const [scanFailureDiagnostic, setScanFailureDiagnostic] =
    useState<ScanFailureDiagnostic | null>(null);
  const [storefrontPasswordDiagnostic, setStorefrontPasswordDiagnostic] =
    useState<StorefrontPasswordDiagnostic | null>(null);
  const [result, setResult] = useState<AuditResponse | null>(null);
  const [partialResult, setPartialResult] = useState<PartialAuditResponse | null>(null);
  const [fixesLoading, setFixesLoading] = useState(false);
  const [fixesError, setFixesError] = useState<string | null>(null);
  const [fixes, setFixes] = useState<FixesResponse | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [scanStartedAt, setScanStartedAt] = useState<number | null>(null);
  const [feedNotifications, setFeedNotifications] = useState<RecentScanRecord[]>([]);
  const loadedReportUrlRef = useRef<string | null>(null);

  const activityFeedEnabled = isActivityFeedEnabled();

  const handleNewScan = useCallback((entry: RecentScanRecord) => {
    setFeedNotifications((existing) => [...existing, entry]);
  }, []);

  const { activity, loading: activityLoading, refresh, markOwnScan } =
    useRecentScans({
      limit: 6,
      poll: activityFeedEnabled,
      onNewScan: activityFeedEnabled ? handleNewScan : undefined,
    });

  useEffect(() => {
    if (!result) {
      return;
    }

    scrollToAuditOverview("instant");
  }, [result?.url, result?.crawledAt, fixesLoading]);

  async function generateFixes(
    targetUrl: string,
    token: string | null,
    reportId?: string,
  ) {
    setFixesLoading(true);
    setFixesError(null);
    setFixes(null);

    try {
      const payload: { url: string; turnstileToken?: string; reportId?: string } = {
        url: targetUrl,
      };
      if (token) {
        payload.turnstileToken = token;
      }
      if (reportId) {
        payload.reportId = reportId;
      }

      const response = await fetch("/api/generate-fixes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await parseApiResponse<FixesResponse & { error?: string }>(
        response,
        "Fix generation failed",
      );

      if (!response.ok) {
        throw new Error(data.error ?? "Fix generation failed");
      }

      setFixes(data);
    } catch (generateError) {
      setFixesError(
        generateError instanceof Error
          ? generateError.message
          : "Something went wrong generating fixes",
      );
    } finally {
      setFixesLoading(false);
    }
  }

  async function loadRecentAudit(entry: RecentScanRecord) {
    if (entry.shareUrl) {
      trackRecentScanClickedFromEntry(entry);
      window.location.assign(entry.shareUrl);
      return;
    }

    const scanUrl = normalizeAuditUrl(entry.url);
    setUrl(scanUrl);
    setLoading(true);
    setScanStartedAt(Date.now());
    setError(null);
    setNonEcommerceMessage(null);
    setDomainReviewNotice(null);
    setBotVerificationDiagnostic(null);
    setScanFailureDiagnostic(null);
    setResult(null);
    setPartialResult(null);
    setFixes(null);
    setFixesError(null);
    scrollToElementById("audit-hero");
    trackScanStartedFromUrl(scanUrl);

    try {
      const payload: { url: string; turnstileToken?: string } = { url: scanUrl };
      if (turnstileToken) {
        payload.turnstileToken = turnstileToken;
      }

      const response = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await parseApiResponse<
        (AuditResponse | PartialAuditResponse) & { error?: string }
      >(response, "Audit request failed");

      if (isBotVerificationScanResponse(data)) {
        setBotVerificationDiagnostic(data);
        trackScanFailedFromUrl(scanUrl, "bot_verification_blocked");
        trackTechnologyDetectionFailed({
          domain: scanUrl,
          failureReason: "bot_verification",
        });
        return;
      }

      if (isDomainReviewBlockedScanResponse(data)) {
        setDomainReviewNotice({
          title: data.title ?? "Scanning temporarily paused",
          message: data.message,
          reviewType: data.reviewType,
        });
        trackDomainReviewBlocked({
          domain: scanUrl,
          reviewType: data.reviewType,
          reviewStatus: data.reviewStatus,
        });
        return;
      }

      if (isNonEcommerceScanResponse(data)) {
        setNonEcommerceMessage(data.message);
        trackScanFailedFromUrl(scanUrl, "non_ecommerce_site");
        return;
      }

      if (isScanFailureResponse(data)) {
        setScanFailureDiagnostic(data);
        trackScanFailedFromUrl(scanUrl, data.code);
        trackTechnologyDetectionFailed({
          domain: scanUrl,
          failureReason: data.code,
        });
        return;
      }

      if (isPartialReportResponse(data)) {
        handleAuditApiResponse(scanUrl, data, response.ok);
        setPartialResult(data);
        scrollToAuditOverview("instant");
        return;
      }

      if (!response.ok) {
        throw new Error(data.error ?? "Audit request failed");
      }

      handleAuditApiResponse(scanUrl, data, response.ok);
      setResult(data as AuditResponse);
      await generateFixes(data.url, turnstileToken, data.reportId);
      scrollToAuditOverview("instant");
    } catch (loadError) {
      trackScanFailedFromUrl(
        scanUrl,
        loadError instanceof Error ? loadError.message : "load_recent_audit_failed",
      );
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Something went wrong loading the scan",
      );
    } finally {
      setLoading(false);
      setScanStartedAt(null);
    }
  }

  useEffect(() => {
    if (typeof window === "undefined" || loading || result || partialResult || activityLoading) {
      return;
    }

    const urlParam = new URLSearchParams(window.location.search).get("url");
    if (!urlParam || loadedReportUrlRef.current === urlParam) {
      return;
    }

    const normalizedParam = normalizeAuditUrl(urlParam);
    const entry = activity.recentScans.find(
      (scan) => normalizeAuditUrl(scan.url) === normalizedParam,
    );

    loadedReportUrlRef.current = urlParam;
    window.history.replaceState({}, "", "/");

    if (entry) {
      void loadRecentAudit(entry);
      return;
    }

    void loadRecentAudit({
      id: normalizedParam,
      url: normalizedParam,
      hostname: new URL(normalizedParam).hostname,
      merchant: normalizedParam,
      platform: "Unknown",
      confidence: "low",
      scannedAt: new Date().toISOString(),
      cacheStatus: "MISS",
      summary: "",
      readinessScore: 0,
      grade: "-",
      topGap: "",
    });
  }, [activity.recentScans, activityLoading, loading, partialResult, result]);

  async function runAudit(
    targetUrl: string,
    options?: { storefrontPassword?: string },
  ) {
    if (shouldShowTurnstileWidget() && !turnstileToken) {
      setError("Complete the Turnstile check before running a scan.");
      return;
    }

    const validationError = getAuditUrlValidationError(targetUrl);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setScanStartedAt(Date.now());
    setError(null);
    setNonEcommerceMessage(null);
    setDomainReviewNotice(null);
    setBotVerificationDiagnostic(null);
    setScanFailureDiagnostic(null);
    if (!options?.storefrontPassword) {
      setStorefrontPasswordDiagnostic(null);
    }
    setResult(null);
    setPartialResult(null);
    setFixes(null);
    setFixesError(null);
    if (!options?.storefrontPassword) {
      trackHeroScanStarted(targetUrl);
      trackScanStartedFromUrl(targetUrl);
    }

    try {
      const payload: {
        url: string;
        turnstileToken?: string;
        storefrontPassword?: string;
      } = { url: targetUrl };
      if (turnstileToken) {
        payload.turnstileToken = turnstileToken;
      }
      if (options?.storefrontPassword) {
        payload.storefrontPassword = options.storefrontPassword;
      }

      const response = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await parseApiResponse<
        (AuditResponse | PartialAuditResponse) & { error?: string }
      >(response, "Audit request failed");

      if (isStorefrontPasswordScanResponse(data)) {
        setNonEcommerceMessage(null);
        setScanFailureDiagnostic(null);
        setBotVerificationDiagnostic(null);
        setStorefrontPasswordDiagnostic(data);
        trackScanFailedFromUrl(
          targetUrl,
          data.invalidPassword ? "storefront_password_invalid" : "storefront_password_required",
        );
        trackTechnologyDetectionFailed({
          domain: targetUrl,
          failureReason: data.invalidPassword
            ? "storefront_password_invalid"
            : "storefront_password_required",
        });
        scrollToElementById("audit-hero");
        return;
      }

      if (isBotVerificationScanResponse(data)) {
        setStorefrontPasswordDiagnostic(null);
        setBotVerificationDiagnostic(data);
        trackScanFailedFromUrl(targetUrl, "bot_verification_blocked");
        trackTechnologyDetectionFailed({
          domain: targetUrl,
          failureReason: "bot_verification",
        });
        return;
      }

      if (isDomainReviewBlockedScanResponse(data)) {
        setStorefrontPasswordDiagnostic(null);
        setDomainReviewNotice({
          title: data.title ?? "Scanning temporarily paused",
          message: data.message,
          reviewType: data.reviewType,
        });
        trackDomainReviewBlocked({
          domain: targetUrl,
          reviewType: data.reviewType,
          reviewStatus: data.reviewStatus,
        });
        return;
      }

      if (isNonEcommerceScanResponse(data)) {
        setStorefrontPasswordDiagnostic(null);
        setNonEcommerceMessage(data.message);
        trackScanFailedFromUrl(targetUrl, "non_ecommerce_site");
        return;
      }

      if (isScanFailureResponse(data)) {
        setStorefrontPasswordDiagnostic(null);
        setScanFailureDiagnostic(data);
        trackScanFailedFromUrl(targetUrl, data.code);
        trackTechnologyDetectionFailed({
          domain: targetUrl,
          failureReason: data.code,
        });
        return;
      }

      if (isPartialReportResponse(data)) {
        markOwnScan(data.scanRecord?.id);
        await refresh();
        handleAuditApiResponse(targetUrl, data, response.ok);
        setPartialResult(data);
        scrollToAuditOverview("instant");
        return;
      }

      if (!response.ok) {
        throw new Error(data.error ?? "Audit request failed");
      }

      markOwnScan(data.scanRecord?.id);
      await refresh();
      handleAuditApiResponse(targetUrl, data, response.ok);
      setStorefrontPasswordDiagnostic(null);
      setResult(data as AuditResponse);
      await generateFixes(data.url, turnstileToken, data.reportId);
      scrollToAuditOverview("instant");
    } catch (submitError) {
      trackScanFailedFromUrl(
        targetUrl,
        submitError instanceof Error ? submitError.message : "scan_failed",
      );
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Something went wrong",
      );
    } finally {
      setLoading(false);
      setScanStartedAt(null);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runAudit(url);
  }

  return (
    <>
      <div className="mx-auto w-full min-w-0 max-w-6xl space-y-12 px-6 py-10 lg:px-8 lg:py-14">
        <div id="audit-hero">
          <AuditHero
            url={url}
            loading={loading}
            error={error}
            nonEcommerceMessage={nonEcommerceMessage}
            domainReviewNotice={domainReviewNotice}
            botVerificationDiagnostic={botVerificationDiagnostic}
            scanFailureDiagnostic={scanFailureDiagnostic}
            storefrontPasswordDiagnostic={storefrontPasswordDiagnostic}
            turnstileToken={turnstileToken}
            scanStartedAt={scanStartedAt}
            onUrlChange={setUrl}
            onSubmit={handleSubmit}
            onTurnstileTokenChange={setTurnstileToken}
            onSubmitStorefrontPassword={(password) => {
              void runAudit(url, { storefrontPassword: password });
            }}
            onScanAnother={() => {
              trackNewScanClicked(result?.reportId ?? partialResult?.reportId);
              setError(null);
              setNonEcommerceMessage(null);
              setDomainReviewNotice(null);
              setBotVerificationDiagnostic(null);
              setScanFailureDiagnostic(null);
              setStorefrontPasswordDiagnostic(null);
              setUrl("");
              setResult(null);
              setPartialResult(null);
              setFixes(null);
              setFixesError(null);
            }}
          />
        </div>

        {!result && !partialResult ? (
          <>
            <HowItWorksSection />
            <ReportPreviewSection />
            <RecentAuditsPreview
              entries={activity.recentScans}
              totalCount={activity.totalScans}
              loading={activityLoading}
              variant="homepage"
            />
            <MarketingSections />
          </>
        ) : null}

        {!result && !partialResult && activity.platformStats.length > 0 ? (
          <PlatformReadinessCards stats={activity.platformStats} />
        ) : null}

        {partialResult && (
          <PartialReportSection
            report={partialResult}
            reportId={partialResult.reportId}
            shareUrl={partialResult.shareUrl}
            scanContext={scanContextFromPartialReport(partialResult)}
          />
        )}

        {result && (
          <AuditResultsSection
            result={result}
            fixes={fixes}
            fixesLoading={fixesLoading}
            fixesError={fixesError}
            onRegenerateFixes={() =>
              generateFixes(result.url, turnstileToken, result.reportId)
            }
            reportId={result.reportId}
            shareUrl={result.shareUrl}
          />
        )}
      </div>

      {activityFeedEnabled && (
        <ActivityFeed notifications={feedNotifications} />
      )}
    </>
  );
}

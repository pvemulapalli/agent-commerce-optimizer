import type { PlatformAnalysis } from "./types";

export const PUBLIC_PLATFORM_EVIDENCE_IDENTIFIED = [
  "Storefront technology indicators detected",
  "Commerce platform characteristics identified",
  "Catalog and product architecture analyzed",
  "Platform confidence established using multiple independent signals",
] as const;

export const PUBLIC_PLATFORM_EVIDENCE_UNKNOWN = [
  "Storefront commerce patterns were analyzed",
  "Multiple independent storefront signals were evaluated",
  "A definitive platform label could not be established with sufficient confidence",
] as const;

export const PUBLIC_PLATFORM_EVIDENCE_LOW = [
  "Storefront technology indicators detected",
  "Commerce platform characteristics partially identified",
  "Additional storefront signals may improve identification confidence",
] as const;

export function buildPublicPlatformEvidence(
  platform: PlatformAnalysis,
): readonly string[] {
  if (platform.platform === "Unknown") {
    return PUBLIC_PLATFORM_EVIDENCE_UNKNOWN;
  }

  if (platform.confidence === "low") {
    return PUBLIC_PLATFORM_EVIDENCE_LOW;
  }

  return PUBLIC_PLATFORM_EVIDENCE_IDENTIFIED;
}

export function getPlatformEvidenceForDisplay(
  platform: PlatformAnalysis,
  showInternalEvidence: boolean,
): readonly string[] {
  if (showInternalEvidence) {
    return platform.evidence;
  }

  return buildPublicPlatformEvidence(platform);
}

export function formatPlatformConfidenceSummary(platform: PlatformAnalysis): string {
  return platform.confidence.charAt(0).toUpperCase() + platform.confidence.slice(1);
}

export function getPlatformDetectionSummary(showInternalEvidence: boolean): string {
  if (showInternalEvidence) {
    return "Internal platform attribution details from storefront assets, URL structures, crawled pages, and supporting infrastructure signals.";
  }

  return "Merchant Signals identifies the commerce platform powering this storefront and reports an overall confidence level.";
}

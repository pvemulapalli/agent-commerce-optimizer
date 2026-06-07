import type { ReadinessReport } from "./readiness-score";

export interface BusinessSummary {
  readinessBand: string;
  paragraphs: string[];
}

function getReadinessBand(score: number): string {
  if (score >= 80) {
    return "Strong readiness";
  }

  if (score >= 60) {
    return "Moderate readiness";
  }

  if (score >= 40) {
    return "Limited readiness";
  }

  return "Significant opportunity";
}

function getOpeningLine(score: number, missingCount: number): string {
  if (score >= 80 && missingCount <= 2) {
    return "Your storefront appears well prepared for customers and AI-driven discovery today.";
  }

  if (score >= 60) {
    return "Your storefront appears usable by customers today.";
  }

  if (score >= 40) {
    return "Your storefront may work for shoppers today, but important discovery signals are incomplete.";
  }

  return "Your storefront may still serve customers, but AI systems likely have limited visibility into your commerce capabilities.";
}

export function buildBusinessSummary(
  report: ReadinessReport,
  missingCount: number,
): BusinessSummary {
  const readinessBand = getReadinessBand(report.score);
  const opening = getOpeningLine(report.score, missingCount);

  const paragraphs: string[] = [opening];

  if (missingCount > 0) {
    paragraphs.push(
      "However, AI systems may have limited visibility into your products, policies, and commerce capabilities because several machine-readable signals were not detected during the crawl.",
    );
    paragraphs.push(
      "Improving these signals can increase discoverability in AI shopping assistants and agent-driven commerce experiences.",
    );
  } else if (report.score < 80) {
    paragraphs.push(
      "Some areas still need attention so AI shopping assistants can confidently understand your catalog, policies, and purchase flow.",
    );
    paragraphs.push(
      "Strengthening these signals can improve how your store appears in agent-driven commerce experiences.",
    );
  } else {
    paragraphs.push(
      "Most core commerce signals were detected. Continued maintenance will help your storefront stay visible as AI shopping channels evolve.",
    );
  }

  return {
    readinessBand,
    paragraphs,
  };
}

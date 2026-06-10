import type { ReadinessReport } from "./readiness-score";

export interface BusinessSummary {
  readinessBand: string;
  paragraphs: string[];
}

function getReadinessBand(score: number): string {
  if (score >= 80) {
    return "Strong customer and AI visibility";
  }

  if (score >= 60) {
    return "Solid foundation with room to grow";
  }

  if (score >= 40) {
    return "Limited discoverability today";
  }

  return "Significant visibility opportunity";
}

function getOpeningLine(score: number, missingCount: number): string {
  if (score >= 80 && missingCount <= 2) {
    return "Your storefront appears ready for shoppers and AI-driven discovery. Customers can likely find key products, policies, and purchase paths with confidence.";
  }

  if (score >= 60) {
    return "Your storefront provides a usable customer experience today, but AI shopping assistants may still miss important product, policy, and trust signals.";
  }

  if (score >= 40) {
    return "Customers may be able to shop on your site, but AI systems likely have limited visibility into what you sell, how checkout works, and why shoppers should trust the experience.";
  }

  return "Your storefront may still serve customers directly, but AI visibility, discoverability, and conversion readiness appear limited based on the signals detected during this scan.";
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
      "Several machine-readable signals that help AI systems understand your catalog, policies, and purchase flow were not detected. That can reduce discoverability in AI shopping assistants and agent-driven commerce channels.",
    );
    paragraphs.push(
      "Strengthening these signals improves customer trust, conversion readiness, and the likelihood that AI systems can confidently recommend your storefront.",
    );
  } else if (report.score < 80) {
    paragraphs.push(
      "Most core commerce signals were detected, but there is still room to improve how clearly AI systems understand your products, policies, and purchase experience.",
    );
    paragraphs.push(
      "Closing the remaining gaps helps maintain visibility as AI shopping and agent checkout channels evolve.",
    );
  } else {
    paragraphs.push(
      "Most core commerce signals were detected. Continued maintenance will help your storefront stay visible, trustworthy, and ready for AI-driven discovery.",
    );
  }

  return {
    readinessBand,
    paragraphs,
  };
}

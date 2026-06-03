import type { GroupedFindings } from "./types";

/**
 * Derives a 0–100 summary score from grouped audit findings only.
 * Does not change crawl/check logic — presentation layer for executive summary.
 */
export function computeDiscoverabilityScore(grouped: GroupedFindings): number {
  const detected = grouped.detected.length;
  const missing = grouped.missing.length;
  const needsReview = grouped.needsReview.length;
  const total = detected + missing + needsReview;

  if (total === 0) {
    return 0;
  }

  const points = detected + needsReview * 0.5;
  return Math.round((points / total) * 100);
}

export function getDiscoverabilityScoreLabel(score: number): string {
  if (score >= 80) return "Strong";
  if (score >= 60) return "Moderate";
  if (score >= 40) return "Limited";
  return "Weak";
}

import type { CommercePlatform } from "./types";

export type PlatformSignalCategory =
  | "storefront_assets"
  | "js_bundles"
  | "url_patterns"
  | "ip_hosting";

export interface CategorizedPlatformSignal {
  platform: CommercePlatform;
  label: string;
  weight: number;
  category: PlatformSignalCategory;
  sourceUrl: string;
}

/** User-facing confidence mix — hosting is supporting only (10%). */
export const PLATFORM_SIGNAL_CATEGORY_WEIGHTS: Record<PlatformSignalCategory, number> = {
  storefront_assets: 0.45,
  js_bundles: 0.25,
  url_patterns: 0.2,
  ip_hosting: 0.1,
};

const CATEGORY_SCORE_CAPS: Record<PlatformSignalCategory, number> = {
  storefront_assets: 12,
  js_bundles: 9,
  url_patterns: 9,
  ip_hosting: 3,
};

export const PLATFORM_ASSIGNMENT_MIN_PRIMARY_SCORE = 6;
export const PLATFORM_ASSIGNMENT_MIN_PRIMARY_SIGNALS = 2;

export function isPrimaryPlatformSignal(signal: CategorizedPlatformSignal): boolean {
  return signal.category !== "ip_hosting";
}

export function scorePlatformCandidates(signals: CategorizedPlatformSignal[]): Map<
  CommercePlatform,
  {
    totalScore: number;
    primaryScore: number;
    evidence: Set<string>;
    sourceUrls: Set<string>;
    categoryScores: Record<PlatformSignalCategory, number>;
  }
> {
  const scores = new Map<
    CommercePlatform,
    {
      totalScore: number;
      primaryScore: number;
      evidence: Set<string>;
      sourceUrls: Set<string>;
      categoryRaw: Record<PlatformSignalCategory, number>;
      categoryScores: Record<PlatformSignalCategory, number>;
    }
  >();

  for (const signal of signals) {
    const current = scores.get(signal.platform) ?? {
      totalScore: 0,
      primaryScore: 0,
      evidence: new Set<string>(),
      sourceUrls: new Set<string>(),
      categoryRaw: {
        storefront_assets: 0,
        js_bundles: 0,
        url_patterns: 0,
        ip_hosting: 0,
      },
      categoryScores: {
        storefront_assets: 0,
        js_bundles: 0,
        url_patterns: 0,
        ip_hosting: 0,
      },
    };

    current.totalScore += signal.weight;
    if (isPrimaryPlatformSignal(signal)) {
      current.primaryScore += signal.weight;
    }
    current.categoryRaw[signal.category] += signal.weight;
    current.evidence.add(signal.label);
    current.sourceUrls.add(signal.sourceUrl);
    scores.set(signal.platform, current);
  }

  for (const [, entry] of scores) {
    for (const category of Object.keys(CATEGORY_SCORE_CAPS) as PlatformSignalCategory[]) {
      const cap = CATEGORY_SCORE_CAPS[category];
      entry.categoryScores[category] = Math.min(
        100,
        Math.round((entry.categoryRaw[category] / cap) * 100),
      );
    }
  }

  return scores;
}

export function computeWeightedConfidenceScore(categoryScores: Record<PlatformSignalCategory, number>): number {
  const weighted = (
    Object.entries(PLATFORM_SIGNAL_CATEGORY_WEIGHTS) as Array<[PlatformSignalCategory, number]>
  ).reduce((sum, [category, weight]) => sum + categoryScores[category] * weight, 0);

  return Math.min(100, Math.max(0, Math.round(weighted)));
}

export function countPrimarySignals(
  signals: CategorizedPlatformSignal[],
  platform: CommercePlatform,
): number {
  return new Set(
    signals.filter((signal) => signal.platform === platform && isPrimaryPlatformSignal(signal)).map(
      (signal) => signal.label,
    ),
  ).size;
}

export function meetsPlatformAssignmentThreshold(
  signals: CategorizedPlatformSignal[],
  platform: CommercePlatform,
  primaryScore: number,
): boolean {
  const primarySignalCount = countPrimarySignals(signals, platform);
  return (
    primaryScore >= PLATFORM_ASSIGNMENT_MIN_PRIMARY_SCORE &&
    primarySignalCount >= PLATFORM_ASSIGNMENT_MIN_PRIMARY_SIGNALS
  );
}

export function rankPlatformCandidates(signals: CategorizedPlatformSignal[]): Array<{
  platform: CommercePlatform;
  totalScore: number;
  primaryScore: number;
  evidence: string[];
  sourceUrls: string[];
  confidenceScore: number;
  categoryScores: Record<PlatformSignalCategory, number>;
}> {
  const scored = scorePlatformCandidates(signals);

  return [...scored.entries()]
    .map(([platform, result]) => ({
      platform,
      totalScore: result.totalScore,
      primaryScore: result.primaryScore,
      evidence: [...result.evidence],
      sourceUrls: [...result.sourceUrls],
      confidenceScore: computeWeightedConfidenceScore(result.categoryScores),
      categoryScores: result.categoryScores,
    }))
    .sort((a, b) => b.confidenceScore - a.confidenceScore || b.primaryScore - a.primaryScore);
}

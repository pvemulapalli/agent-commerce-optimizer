import { getAuditHistory } from "./audit-history";
import type { CommercePlatform } from "./types";

const INDEX_PLATFORMS: CommercePlatform[] = [
  "Shopify",
  "BigCommerce",
  "Salesforce Commerce Cloud",
  "WooCommerce",
  "Magento",
  "VTEX",
  "Fenicio",
  "Squarespace",
  "Wix",
  "CommerceTools",
];

export interface PlatformIndexEntry {
  platform: CommercePlatform;
  sampleSize: number;
  averageScore: number;
  topAverage: number;
}

export interface CommerceOptimizerIndex {
  generatedAt: string;
  platforms: PlatformIndexEntry[];
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function topAverage(scores: number[]): number {
  if (scores.length === 0) {
    return 0;
  }

  const sorted = [...scores].sort((left, right) => right - left);
  const topCount = Math.max(1, Math.ceil(sorted.length * 0.1));
  return average(sorted.slice(0, topCount));
}

export async function buildCommerceOptimizerIndex(): Promise<CommerceOptimizerIndex> {
  const records = await getAuditHistory();
  const platforms: PlatformIndexEntry[] = [];

  for (const platform of INDEX_PLATFORMS) {
    const scores = records
      .filter((record) => record.platform === platform)
      .map((record) => record.score);

    if (scores.length === 0) {
      continue;
    }

    platforms.push({
      platform,
      sampleSize: scores.length,
      averageScore: Math.round(average(scores)),
      topAverage: Math.round(topAverage(scores)),
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    platforms,
  };
}

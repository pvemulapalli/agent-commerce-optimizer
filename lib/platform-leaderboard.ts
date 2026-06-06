import { OTHER_PLATFORM_LABEL } from "./platform-labels";
import type { RecentScanRecord } from "./scan-activity";

export const PLATFORM_LEADERBOARD_ORDER = [
  { key: "Shopify", label: "Shopify" },
  { key: "BigCommerce", label: "BigCommerce" },
  { key: "Salesforce Commerce Cloud", label: "Salesforce Commerce Cloud" },
  { key: "Magento", label: "Adobe Commerce" },
  { key: "VTEX", label: "VTEX" },
  { key: "Fenicio", label: "Fenicio" },
  { key: "WooCommerce", label: "WooCommerce" },
  { key: "Squarespace", label: "Squarespace" },
  { key: "Wix", label: "Wix" },
  { key: "CommerceTools", label: "commercetools" },
  { key: "Unknown", label: OTHER_PLATFORM_LABEL },
] as const;

const ORDERED_KEYS = new Set(PLATFORM_LEADERBOARD_ORDER.map((entry) => entry.key));

export interface PlatformLeaderboardStat {
  key: string;
  label: string;
  domainsScanned: number;
  averageScore: number | null;
  topGap: string | null;
  topScore: number | null;
}

function mode(values: string[]): string | null {
  if (values.length === 0) {
    return null;
  }

  const counts = new Map<string, number>();

  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  let best: string | null = null;
  let bestCount = 0;

  for (const [value, count] of counts) {
    if (count > bestCount) {
      best = value;
      bestCount = count;
    }
  }

  return best;
}

function buildLeaderboardRow(
  key: string,
  label: string,
  group: RecentScanRecord[],
): PlatformLeaderboardStat {
  const domainsScanned = group.length;

  if (domainsScanned === 0) {
    return {
      key,
      label,
      domainsScanned: 0,
      averageScore: null,
      topGap: null,
      topScore: null,
    };
  }

  const scores = group.map((record) => record.readinessScore ?? 0);

  return {
    key,
    label,
    domainsScanned,
    averageScore: Math.round(scores.reduce((sum, score) => sum + score, 0) / domainsScanned),
    topGap: mode(group.map((record) => record.topGap).filter(Boolean)),
    topScore: Math.max(...scores),
  };
}

export function computePlatformLeaderboard(
  records: RecentScanRecord[],
): PlatformLeaderboardStat[] {
  const byPlatform = new Map<string, RecentScanRecord[]>();

  for (const record of records) {
    const key = record.platform || "Unknown";
    const bucket = byPlatform.get(key) ?? [];
    bucket.push(record);
    byPlatform.set(key, bucket);
  }

  const leaderboard = PLATFORM_LEADERBOARD_ORDER.map(({ key, label }) =>
    buildLeaderboardRow(key, label, byPlatform.get(key) ?? []),
  );

  for (const [key, group] of byPlatform) {
    if (ORDERED_KEYS.has(key as (typeof PLATFORM_LEADERBOARD_ORDER)[number]["key"])) {
      continue;
    }

    leaderboard.push(buildLeaderboardRow(key, key, group));
  }

  return leaderboard;
}

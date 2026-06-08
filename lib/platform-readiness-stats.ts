import { OTHER_PLATFORM_LABEL } from "./platform-labels";
import type { RecentScanRecord } from "./scan-activity";

export const PLATFORM_READINESS_BUCKETS = [
  { key: "Shopify", label: "Shopify" },
  { key: "BigCommerce", label: "BigCommerce" },
  { key: "Salesforce Commerce Cloud", label: "Salesforce Commerce Cloud" },
  { key: "WooCommerce", label: "WooCommerce" },
  { key: "Wix", label: "Wix" },
  { key: "Squarespace", label: "Squarespace" },
  { key: "CommerceTools", label: "commercetools" },
  { key: "Magento", label: "Adobe Commerce" },
  { key: "Shopware", label: "Shopware" },
  { key: "Unknown", label: OTHER_PLATFORM_LABEL },
] as const;

const MIN_SAMPLE_SIZE = 3;

export interface PlatformReadinessStat {
  key: string;
  label: string;
  scanCount: number;
  averageScore: number | null;
  topGap: string | null;
  insufficientData: boolean;
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

export function computePlatformReadinessStats(
  records: RecentScanRecord[],
): PlatformReadinessStat[] {
  const byPlatform = new Map<string, RecentScanRecord[]>();

  for (const record of records) {
    const key = record.platform || "Unknown";
    const bucket = byPlatform.get(key) ?? [];
    bucket.push(record);
    byPlatform.set(key, bucket);
  }

  return PLATFORM_READINESS_BUCKETS.map(({ key, label }) => {
    const group = byPlatform.get(key) ?? [];
    const scanCount = group.length;
    const insufficientData = scanCount < MIN_SAMPLE_SIZE;

    if (insufficientData) {
      return {
        key,
        label,
        scanCount,
        averageScore: null,
        topGap: null,
        insufficientData: true,
      };
    }

    const averageScore = Math.round(
      group.reduce((sum, record) => sum + (record.readinessScore ?? 0), 0) / scanCount,
    );
    const topGap = mode(group.map((record) => record.topGap).filter(Boolean));

    return {
      key,
      label,
      scanCount,
      averageScore,
      topGap,
      insufficientData: false,
    };
  });
}

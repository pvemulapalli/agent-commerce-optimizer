import { normalizeDomainFromUrl } from "./domain-normalization";
import { getRedis, isRedisConfigured } from "./redis";

export interface EcommerceRejectionRecord {
  domain: string;
  timestamp: string;
  reason: string;
  ecommerceConfidence: number;
}

const REJECTION_KEY = "aco:scan:rejections";
const MAX_REJECTIONS = 500;

let memoryRejections: EcommerceRejectionRecord[] = [];

export async function recordEcommerceRejection(input: {
  url: string;
  reason: string;
  ecommerceConfidence: number;
}): Promise<void> {
  const record: EcommerceRejectionRecord = {
    domain: normalizeDomainFromUrl(input.url),
    timestamp: new Date().toISOString(),
    reason: input.reason,
    ecommerceConfidence: input.ecommerceConfidence,
  };

  try {
    if (isRedisConfigured()) {
      const redis = getRedis();
      await redis.lpush(REJECTION_KEY, JSON.stringify(record));
      await redis.ltrim(REJECTION_KEY, 0, MAX_REJECTIONS - 1);
      return;
    }

    memoryRejections = [record, ...memoryRejections].slice(0, MAX_REJECTIONS);
  } catch (error) {
    console.error("[ecommerce-rejection] failed to record rejection:", error);
  }
}

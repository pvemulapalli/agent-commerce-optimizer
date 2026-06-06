import { normalizeDomainFromUrl } from "./domain-normalization";
import { getRedis, isRedisConfigured } from "./redis";

export interface PlatformFeedbackRecord {
  domain: string;
  platform: string | null;
  comments: string | null;
  timestamp: string;
}

const FEEDBACK_KEY = "aco:platform:feedback";
const MAX_FEEDBACK = 2000;

let memoryFeedback: PlatformFeedbackRecord[] = [];

export async function listPlatformFeedback(limit = 100): Promise<PlatformFeedbackRecord[]> {
  try {
    if (isRedisConfigured()) {
      const redis = getRedis();
      const raw = await redis.lrange(FEEDBACK_KEY, 0, limit - 1);
      return (raw ?? [])
        .map((entry) => {
          if (typeof entry === "string") {
            return JSON.parse(entry) as PlatformFeedbackRecord;
          }
          return entry as PlatformFeedbackRecord;
        })
        .filter(Boolean);
    }

    return memoryFeedback.slice(0, limit);
  } catch (error) {
    console.error("[platform-feedback] list failed:", error);
    return [];
  }
}

export async function recordPlatformFeedback(input: {
  domain: string;
  platform?: string | null;
  comments?: string | null;
}): Promise<void> {
  const record: PlatformFeedbackRecord = {
    domain: normalizeDomainFromUrl(input.domain),
    platform: input.platform?.trim() || null,
    comments: input.comments?.trim() || null,
    timestamp: new Date().toISOString(),
  };

  try {
    if (isRedisConfigured()) {
      const redis = getRedis();
      await redis.lpush(FEEDBACK_KEY, JSON.stringify(record));
      await redis.ltrim(FEEDBACK_KEY, 0, MAX_FEEDBACK - 1);
      return;
    }

    memoryFeedback = [record, ...memoryFeedback].slice(0, MAX_FEEDBACK);
  } catch (error) {
    console.error("[platform-feedback] failed to record feedback:", error);
  }
}

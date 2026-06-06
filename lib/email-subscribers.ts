import { getRedis, isRedisConfigured } from "./redis";

const SUBSCRIBERS_KEY = "aco:email:subscribers";
const MAX_SUBSCRIBERS = 5000;

const memorySubscribers = new Set<string>();

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidSubscriberEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email));
}

export async function listEmailSubscribers(): Promise<string[]> {
  try {
    if (isRedisConfigured()) {
      const redis = getRedis();
      const members = await redis.smembers<string[]>(SUBSCRIBERS_KEY);
      return [...(members ?? [])].sort();
    }

    return [...memorySubscribers].sort();
  } catch (error) {
    console.error("[email-subscribers] list failed:", error);
    return [];
  }
}

export async function recordEmailSubscriber(email: string): Promise<"added" | "duplicate"> {
  const normalized = normalizeEmail(email);

  try {
    if (isRedisConfigured()) {
      const redis = getRedis();
      const added = await redis.sadd(SUBSCRIBERS_KEY, normalized);

      if (added === 0) {
        return "duplicate";
      }

      await redis.scard(SUBSCRIBERS_KEY).then(async (count) => {
        if (count > MAX_SUBSCRIBERS) {
          console.warn("[email-subscribers] subscriber set exceeds soft limit");
        }
      });

      return "added";
    }

    if (memorySubscribers.has(normalized)) {
      return "duplicate";
    }

    memorySubscribers.add(normalized);
    return "added";
  } catch (error) {
    console.error("[email-subscribers] failed to record subscriber:", error);
    throw error;
  }
}

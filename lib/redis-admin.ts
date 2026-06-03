import { getRedis, isRedisConfigured } from "./redis";

const ACO_KEY_PREFIXES = ["aco:scan:", "aco:audit:", "aco:ratelimit:"];

export async function clearCommerceOptimizerRedisKeys(): Promise<number> {
  if (!isRedisConfigured()) {
    return 0;
  }

  const redis = getRedis();
  let deletedKeys = 0;

  for (const prefix of ACO_KEY_PREFIXES) {
    const keys = await redis.keys(`${prefix}*`);

    if (keys.length === 0) {
      continue;
    }

    deletedKeys += keys.length;
    await redis.del(...keys);
  }

  return deletedKeys;
}

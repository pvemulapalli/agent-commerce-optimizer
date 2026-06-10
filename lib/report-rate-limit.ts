import { Ratelimit } from "@upstash/ratelimit";
import { getRateLimitKey } from "./request-utils";
import { getRedis, isRedisConfigured } from "./redis";

const memoryBuckets = new Map<string, { count: number; resetAt: number }>();

function getReportRateLimitPerHour(): number {
  const raw = process.env.REPORT_RATE_LIMIT_PER_HOUR;
  const parsed = raw ? Number.parseInt(raw, 10) : 120;
  return Number.isNaN(parsed) || parsed < 1 ? 120 : parsed;
}

function enforceMemoryRateLimit(
  rateLimitKey: string,
): { allowed: boolean; retryAfterSeconds: number } {
  const limit = getReportRateLimitPerHour();
  const now = Date.now();
  const hourMs = 60 * 60 * 1000;
  const bucket = memoryBuckets.get(rateLimitKey);

  if (!bucket || bucket.resetAt <= now) {
    memoryBuckets.set(rateLimitKey, { count: 1, resetAt: now + hourMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (bucket.count >= limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  bucket.count += 1;
  memoryBuckets.set(rateLimitKey, bucket);
  return { allowed: true, retryAfterSeconds: 0 };
}

let ratelimitClient: Ratelimit | null = null;

function getReportRateLimiter(): Ratelimit {
  if (!ratelimitClient) {
    ratelimitClient = new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.slidingWindow(getReportRateLimitPerHour(), "1 h"),
      prefix: "aco:ratelimit:report",
    });
  }

  return ratelimitClient;
}

export async function enforceReportRateLimit(
  request: Request,
): Promise<Response | null> {
  const rateLimitKey = getRateLimitKey(request);

  if (!isRedisConfigured()) {
    const memoryResult = enforceMemoryRateLimit(rateLimitKey);
    if (memoryResult.allowed) {
      return null;
    }

    return new Response(
      JSON.stringify({
        error: "Too many report requests. Please wait and try again later.",
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(memoryResult.retryAfterSeconds),
        },
      },
    );
  }

  const result = await getReportRateLimiter().limit(rateLimitKey);

  if (result.success) {
    return null;
  }

  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((result.reset - Date.now()) / 1000),
  );

  return new Response(
    JSON.stringify({
      error: "Too many report requests. Please wait and try again later.",
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfterSeconds),
      },
    },
  );
}

import { normalizeDomainFromUrl } from "./domain-normalization";
import { buildReadinessReport } from "./readiness-score";
import { getRedis, isRedisConfigured } from "./redis";
import type { AuditApiResponse } from "./types";

export interface BenchmarkSample {
  platform: string;
  overallScore: number;
  topGap: string;
  timestamp: string;
  hostname: string;
}

const SAMPLES_KEY = "aco:benchmark:samples";
const MAX_SAMPLES = 10000;

let memorySamples: BenchmarkSample[] = [];

export async function updateBenchmarkSamplesPlatform(
  domainInput: string,
  platform: string,
): Promise<number> {
  const hostname = normalizeDomainFromUrl(
    domainInput.includes("://") ? domainInput : `https://${domainInput}/`,
  );

  try {
    let updated = 0;

    if (isRedisConfigured()) {
      const redis = getRedis();
      const raw = await redis.lrange(SAMPLES_KEY, 0, MAX_SAMPLES - 1);
      const samples = (raw ?? [])
        .map((entry) =>
          typeof entry === "string"
            ? (JSON.parse(entry) as BenchmarkSample)
            : (entry as BenchmarkSample),
        )
        .filter(Boolean);

      const next = samples.map((sample) => {
        if (sample.hostname !== hostname) {
          return sample;
        }

        updated += 1;
        return { ...sample, platform };
      });

      if (updated === 0) {
        return 0;
      }

      await redis.del(SAMPLES_KEY);
      if (next.length > 0) {
        await redis.lpush(
          SAMPLES_KEY,
          ...next.toReversed().map((sample) => JSON.stringify(sample)),
        );
      }

      return updated;
    }

    memorySamples = memorySamples.map((sample) => {
      if (sample.hostname !== hostname) {
        return sample;
      }

      updated += 1;
      return { ...sample, platform };
    });

    return updated;
  } catch (error) {
    console.error("[benchmark-samples] platform update failed:", error);
    return 0;
  }
}

export async function recordBenchmarkSample(audit: AuditApiResponse): Promise<void> {
  const report = buildReadinessReport(audit);
  const sample: BenchmarkSample = {
    platform: audit.platform.platform,
    overallScore: report.score,
    topGap: report.topGap,
    timestamp: audit.crawledAt,
    hostname: normalizeDomainFromUrl(audit.url),
  };

  try {
    if (isRedisConfigured()) {
      const redis = getRedis();
      await redis.lpush(SAMPLES_KEY, JSON.stringify(sample));
      await redis.ltrim(SAMPLES_KEY, 0, MAX_SAMPLES - 1);
      return;
    }

    memorySamples = [sample, ...memorySamples].slice(0, MAX_SAMPLES);
  } catch (error) {
    console.error("[benchmark-samples] failed to record sample:", error);
  }
}

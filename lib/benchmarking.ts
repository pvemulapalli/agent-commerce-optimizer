import { getAuditHistoryForPlatform } from "./audit-history";

const MIN_BENCHMARK_SAMPLE = 5;

export interface PlatformBenchmark {
  platform: string;
  yourScore: number;
  average: number;
  top10Percent: number;
  sampleSize: number;
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function top10PercentThreshold(sortedDesc: number[]): number {
  if (sortedDesc.length === 0) {
    return 0;
  }

  const index = Math.max(0, Math.ceil(sortedDesc.length * 0.1) - 1);
  return sortedDesc[index] ?? sortedDesc[0];
}

export async function getPlatformBenchmark(input: {
  platform: string;
  score: number;
}): Promise<PlatformBenchmark | null> {
  if (!input.platform || input.platform === "Unknown") {
    return null;
  }

  const records = await getAuditHistoryForPlatform(input.platform);
  const scores = records.map((record) => record.score);

  if (scores.length < MIN_BENCHMARK_SAMPLE) {
    return null;
  }

  const sorted = [...scores].sort((left, right) => right - left);

  return {
    platform: input.platform,
    yourScore: input.score,
    average: Math.round(average(scores)),
    top10Percent: top10PercentThreshold(sorted),
    sampleSize: scores.length,
  };
}

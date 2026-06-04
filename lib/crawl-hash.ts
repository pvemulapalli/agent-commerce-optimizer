import { createHash } from "node:crypto";
import type { Finding } from "./types";

export function computeCrawlHash(input: {
  platform: string;
  findings: Finding[];
  dimensionScores: Record<string, number>;
}): string {
  const findingsPayload = input.findings
    .map((finding) => ({
      id: finding.id,
      status: finding.status,
      confidence: finding.confidence,
    }))
    .sort((left, right) => left.id.localeCompare(right.id));

  const dimensionsPayload = Object.fromEntries(
    Object.entries(input.dimensionScores).sort(([left], [right]) =>
      left.localeCompare(right),
    ),
  );

  const payload = JSON.stringify({
    platform: input.platform,
    dimensions: dimensionsPayload,
    findings: findingsPayload,
  });

  return createHash("sha256").update(payload).digest("hex").slice(0, 16);
}

"use client";

import type { ReadinessDimension } from "@/lib/readiness-score";

function ScoreBar({ dimension }: { dimension: ReadinessDimension }) {
  const filled = Math.max(0, Math.min(100, dimension.score));
  const filledBlocks = Math.round(filled / 10);
  const emptyBlocks = 10 - filledBlocks;
  const bar = `${"█".repeat(filledBlocks)}${"░".repeat(emptyBlocks)}`;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-slate-900">{dimension.label}</span>
        <span className="font-semibold tabular-nums text-slate-900">{dimension.score}</span>
      </div>
      <div
        className="font-mono text-sm tracking-tight text-blue-900"
        aria-hidden
      >
        {bar}
      </div>
      <p className="text-xs text-slate-500">
        Based on: {dimension.evidenceLabels.slice(0, 4).join(", ")}
        {dimension.evidenceLabels.length > 4 ? "…" : ""}
      </p>
    </div>
  );
}

export function DimensionScoreBars({
  dimensions,
}: {
  dimensions: ReadinessDimension[];
}) {
  if (dimensions.length === 0) {
    return (
      <p className="text-sm text-slate-600">
        No scored dimensions — run a full audit to collect evidence-backed signals.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {dimensions.map((dimension) => (
        <ScoreBar key={dimension.id} dimension={dimension} />
      ))}
    </div>
  );
}

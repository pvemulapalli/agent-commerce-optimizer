"use client";

import type { ReadinessDimension } from "@/lib/readiness-score";
import { useEffect, useState } from "react";

function ringColor(score: number): string {
  if (score >= 80) return "#059669";
  if (score >= 60) return "#2563eb";
  if (score >= 40) return "#d97706";
  return "#e11d48";
}

function DimensionScoreCard({ dimension }: { dimension: ReadinessDimension }) {
  const score = Math.max(0, Math.min(100, dimension.score));
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setAnimated(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const evidencePreview = dimension.evidenceLabels.slice(0, 3);
  const evidenceOverflow = dimension.evidenceLabels.length - evidencePreview.length;

  return (
    <article className="group rounded-2xl border border-card-border bg-card p-5 shadow-sm transition duration-200 hover:border-slate-300 hover:shadow-md dark:hover:border-slate-600">
      <div className="flex flex-col items-center text-center">
        <div className="relative h-24 w-24">
          <svg viewBox="0 0 88 88" className="h-full w-full -rotate-90" aria-hidden>
            <circle
              cx="44"
              cy="44"
              r={radius}
              fill="none"
              className="stroke-slate-200 dark:stroke-slate-700"
              strokeWidth="7"
            />
            <circle
              cx="44"
              cy="44"
              r={radius}
              fill="none"
              stroke={ringColor(score)}
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={`${animated ? progress : 0} ${circumference}`}
              className="transition-[stroke-dasharray] duration-700 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-semibold tabular-nums text-text-primary">{score}</span>
          </div>
        </div>

        <h4 className="mt-4 text-sm font-semibold text-text-primary">{dimension.label}</h4>

        <div className="mt-3 w-full border-t border-card-border pt-3 text-left">
          <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">Based on</p>
          <ul className="mt-2 space-y-1">
            {evidencePreview.map((label) => (
              <li key={label} className="truncate text-xs text-text-secondary">
                {label}
              </li>
            ))}
            {evidenceOverflow > 0 && (
              <li className="text-xs text-text-secondary/70">+{evidenceOverflow} more</li>
            )}
          </ul>
        </div>
      </div>
    </article>
  );
}

export function DimensionScoreCards({
  dimensions,
}: {
  dimensions: ReadinessDimension[];
}) {
  if (dimensions.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-card-border bg-card-muted px-6 py-10 text-center text-sm text-text-secondary">
        No scored dimensions yet. Run a full scan to collect evidence-backed signals.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {dimensions.map((dimension) => (
        <DimensionScoreCard key={dimension.id} dimension={dimension} />
      ))}
    </div>
  );
}

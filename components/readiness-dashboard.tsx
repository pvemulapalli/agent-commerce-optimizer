"use client";

import { ReadinessRadarChart } from "@/components/readiness-radar-chart";
import type { ReadinessReport } from "@/lib/readiness-score";

function ScoreGauge({ score, grade }: { score: number; grade: string }) {
  const circumference = 2 * Math.PI * 54;
  const progress = (score / 100) * circumference;

  return (
    <div className="relative mx-auto h-36 w-36">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r="54" fill="none" stroke="#e2e8f0" strokeWidth="10" />
        <circle
          cx="60"
          cy="60"
          r="54"
          fill="none"
          stroke="#2563eb"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${progress} ${circumference}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-semibold tabular-nums text-slate-900">{score}</span>
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Grade {grade}
        </span>
      </div>
    </div>
  );
}

function Scorecard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone: "blue" | "emerald" | "rose" | "amber";
}) {
  const tones = {
    blue: "border-blue-200 bg-blue-50/60 text-blue-900",
    emerald: "border-emerald-200 bg-emerald-50/60 text-emerald-900",
    rose: "border-rose-200 bg-rose-50/60 text-rose-900",
    amber: "border-amber-200 bg-amber-50/60 text-amber-900",
  }[tone];

  return (
    <div className={`rounded-xl border p-4 ${tones}`}>
      <p className="text-xs font-medium uppercase tracking-wide opacity-80">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

export function ReadinessDashboard({
  report,
  detectedCount,
  missingCount,
  needsReviewCount,
}: {
  report: ReadinessReport;
  detectedCount: number;
  missingCount: number;
  needsReviewCount: number;
}) {
  return (
    <section
      id="overview"
      className="scroll-mt-28 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      <div className="border-b border-slate-100 bg-slate-50/80 px-6 py-5 sm:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          AI Commerce Readiness
        </p>
        <div className="mt-4 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-end gap-3">
              <p className="text-5xl font-semibold tabular-nums tracking-tight text-slate-900 sm:text-6xl">
                {report.score}
              </p>
              <p className="pb-2 text-2xl font-medium text-slate-400">/ 100</p>
            </div>
            <p className="mt-2 text-lg font-semibold text-slate-900">Grade {report.grade}</p>
            <p className="mt-1 text-base text-slate-600">{report.summaryLabel}</p>
          </div>
          <ScoreGauge score={report.score} grade={report.grade} />
        </div>
      </div>

      <div className="grid gap-6 px-6 py-8 sm:px-8 lg:grid-cols-[1fr_1.1fr]">
        <ReadinessRadarChart dimensions={report.dimensions} />

        <div className="grid grid-cols-2 gap-3 content-start">
          <Scorecard label="Detected Signals" value={detectedCount} tone="emerald" />
          <Scorecard label="Missing Signals" value={missingCount} tone="rose" />
          <Scorecard label="Needs Review" value={needsReviewCount} tone="amber" />
          <Scorecard label="Readiness Score" value={report.score} tone="blue" />
        </div>
      </div>
    </section>
  );
}

export function ExecutiveSummaryPanel({ report }: { report: ReadinessReport }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        Executive Summary
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-emerald-900">
            Strengths
          </h3>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-emerald-950">
            {report.strengths.map((item) => (
              <li key={item} className="flex gap-2">
                <span aria-hidden className="text-emerald-600">
                  ✓
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-amber-900">
            Opportunities
          </h3>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-amber-950">
            {report.opportunities.map((item) => (
              <li key={item} className="flex gap-2">
                <span aria-hidden className="text-amber-600">
                  →
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className="mt-6 text-base leading-7 text-slate-700">{report.executiveSummary}</p>
    </section>
  );
}

export function RecommendationsSection({ report }: { report: ReadinessReport }) {
  return (
    <section
      id="recommendations"
      className="scroll-mt-28 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        What to fix first
      </p>
      <h2 className="mt-2 text-2xl font-semibold text-slate-900">Recommendations</h2>
      <p className="mt-2 text-sm text-slate-600">
        Prioritized actions based on your weakest readiness dimensions and missing signals.
      </p>
      <ol className="mt-6 space-y-4">
        {report.recommendations.map((item, index) => (
          <li
            key={item}
            className="flex gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-900 text-sm font-semibold text-white">
              {index + 1}
            </span>
            <p className="text-sm leading-6 text-slate-800">{item}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

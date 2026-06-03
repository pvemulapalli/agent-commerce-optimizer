"use client";

import type { ReadinessDimension } from "@/lib/readiness-score";

const SIZE = 280;
const CENTER = SIZE / 2;
const RADIUS = 98;

function polarToCartesian(angleRad: number, radius: number) {
  return {
    x: CENTER + radius * Math.cos(angleRad - Math.PI / 2),
    y: CENTER + radius * Math.sin(angleRad - Math.PI / 2),
  };
}

function polygonPoints(dimensions: ReadinessDimension[], scale = 1): string {
  const step = (Math.PI * 2) / dimensions.length;

  return dimensions
    .map((dimension, index) => {
      const radius = (dimension.score / 100) * RADIUS * scale;
      const point = polarToCartesian(step * index, radius);
      return `${point.x},${point.y}`;
    })
    .join(" ");
}

export function ReadinessRadarChart({
  dimensions,
}: {
  dimensions: ReadinessDimension[];
}) {
  const step = (Math.PI * 2) / dimensions.length;
  const gridLevels = [0.25, 0.5, 0.75, 1];

  return (
    <div className="mx-auto w-full max-w-md">
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="h-auto w-full"
        role="img"
        aria-label="AI commerce readiness radar chart"
      >
        {gridLevels.map((level) => (
          <polygon
            key={level}
            points={polygonPoints(
              dimensions.map((dimension) => ({ ...dimension, score: 100 })),
              level,
            )}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="1"
          />
        ))}

        {dimensions.map((dimension, index) => {
          const outer = polarToCartesian(step * index, RADIUS);
          return (
            <line
              key={dimension.id}
              x1={CENTER}
              y1={CENTER}
              x2={outer.x}
              y2={outer.y}
              stroke="#e2e8f0"
              strokeWidth="1"
            />
          );
        })}

        <polygon
          points={polygonPoints(dimensions)}
          fill="rgba(37, 99, 235, 0.18)"
          stroke="#2563eb"
          strokeWidth="2"
        />

        {dimensions.map((dimension, index) => {
          const labelPoint = polarToCartesian(step * index, RADIUS + 22);
          return (
            <text
              key={`${dimension.id}-label`}
              x={labelPoint.x}
              y={labelPoint.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-slate-600 text-[9px] font-medium"
            >
              {dimension.label}
            </text>
          );
        })}
      </svg>

      <ul className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-600 sm:grid-cols-3">
        {dimensions.map((dimension) => (
          <li key={dimension.id} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-2 py-1.5">
            <span>{dimension.label}</span>
            <span className="font-semibold tabular-nums text-slate-900">{dimension.score}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

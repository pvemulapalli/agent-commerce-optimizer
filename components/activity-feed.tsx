"use client";

import type { RecentScanRecord } from "@/lib/scan-activity";
import { useEffect, useState } from "react";

export function ActivityFeed({ entries }: { entries: RecentScanRecord[] }) {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (entries.length <= 1) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setVisible(false);
      window.setTimeout(() => {
        setIndex((current) => (current + 1) % entries.length);
        setVisible(true);
      }, 250);
    }, 6000);

    return () => window.clearInterval(intervalId);
  }, [entries.length]);

  if (entries.length === 0) {
    return null;
  }

  const entry = entries[index % entries.length];

  return (
    <aside
      className={`fixed bottom-6 right-6 z-40 w-[min(100vw-2rem,22rem)] rounded-2xl border border-slate-200 bg-white p-4 shadow-lg transition-opacity duration-300 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      aria-live="polite"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
        Live activity
      </p>
      <p className="mt-2 text-sm font-medium text-slate-900">New audit completed</p>
      <p className="mt-1 break-all text-sm text-blue-900">{entry.hostname}</p>
      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <span className="rounded-full bg-slate-900 px-2.5 py-1 font-semibold text-white">
          Score {entry.readinessScore ?? "—"}
        </span>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-700">
          Grade {entry.grade || "—"}
        </span>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-700">
          {entry.platform}
        </span>
      </div>
    </aside>
  );
}

"use client";

import { PlatformLabel } from "@/components/platform-label";
import type { RecentScanRecord } from "@/lib/scan-activity";
import { useEffect, useRef, useState } from "react";

const TOAST_VISIBLE_MS = 5000;
const FADE_MS = 300;

export function ActivityFeed({
  notifications,
}: {
  notifications: RecentScanRecord[];
}) {
  const [queue, setQueue] = useState<RecentScanRecord[]>([]);
  const [current, setCurrent] = useState<RecentScanRecord | null>(null);
  const [visible, setVisible] = useState(false);
  const enqueuedKeysRef = useRef(new Set<string>());

  useEffect(() => {
    setQueue((existing) => {
      const next = [...existing];

      for (const entry of notifications) {
        const key = `${entry.id}-${entry.scannedAt}`;
        if (enqueuedKeysRef.current.has(key)) {
          continue;
        }

        enqueuedKeysRef.current.add(key);
        next.push(entry);
      }

      return next;
    });
  }, [notifications]);

  useEffect(() => {
    if (current || queue.length === 0) {
      return;
    }

    const [next, ...rest] = queue;
    setQueue(rest);
    setCurrent(next);
    setVisible(true);

    const hideTimer = window.setTimeout(() => {
      setVisible(false);
    }, TOAST_VISIBLE_MS);

    const clearTimer = window.setTimeout(() => {
      setCurrent(null);
    }, TOAST_VISIBLE_MS + FADE_MS);

    return () => {
      window.clearTimeout(hideTimer);
      window.clearTimeout(clearTimer);
    };
  }, [queue, current]);

  if (!current) {
    return null;
  }

  return (
    <aside
      className={`fixed bottom-6 right-6 z-40 w-[min(100vw-2rem,22rem)] rounded-2xl border border-card-border bg-card p-4 shadow-lg transition-opacity duration-300 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      aria-live="polite"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-text-secondary">
        Live activity
      </p>
      <p className="mt-2 text-sm font-medium text-text-primary">New audit completed</p>
      <p className="mt-1 break-all text-sm text-blue-900 dark:text-blue-300">{current.hostname}</p>
      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <span className="rounded-full bg-slate-900 px-2.5 py-1 font-semibold text-white">
          Score {current.readinessScore ?? "—"}
        </span>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-700">
          Grade {current.grade || "—"}
        </span>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
          <PlatformLabel platform={current.platform} />
        </span>
      </div>
    </aside>
  );
}

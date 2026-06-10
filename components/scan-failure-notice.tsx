"use client";

import type { ScanFailureDiagnostic } from "@/lib/scan-failure-diagnostics";

export function ScanFailureNotice({
  diagnostic,
  onScanAnother,
}: {
  diagnostic: ScanFailureDiagnostic;
  onScanAnother: () => void;
}) {
  return (
    <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50/80 p-6 dark:border-rose-500/30 dark:bg-rose-950/40">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="text-lg font-semibold text-rose-950 dark:text-rose-100">
          {diagnostic.title}
        </h2>
        <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-rose-800 dark:bg-rose-900/60 dark:text-rose-100">
          {diagnostic.confidence} confidence
        </span>
      </div>

      <p className="mt-3 text-sm leading-7 text-rose-900 dark:text-rose-100/90">
        {diagnostic.message}
      </p>

      {diagnostic.httpStatus ? (
        <p className="mt-2 text-xs text-rose-800/80 dark:text-rose-100/70">
          HTTP status observed: {diagnostic.httpStatus}
        </p>
      ) : null}

      <button
        type="button"
        onClick={onScanAnother}
        className="mt-5 inline-flex items-center justify-center rounded-lg bg-rose-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-800 dark:bg-rose-700 dark:hover:bg-rose-600"
      >
        Try Another Site
      </button>
    </div>
  );
}

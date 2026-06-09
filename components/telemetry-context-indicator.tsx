"use client";

import { useTelemetrySuppression } from "@/components/telemetry-context-provider";

export function TelemetryContextIndicator() {
  const { suppressed } = useTelemetrySuppression();

  if (!suppressed) {
    return null;
  }

  return (
    <div
      className="pointer-events-none fixed bottom-3 right-3 z-[60] rounded-md border border-amber-300/80 bg-amber-50/95 px-2.5 py-1 text-[11px] font-medium tracking-wide text-amber-900 shadow-sm backdrop-blur-sm dark:border-amber-700/70 dark:bg-amber-950/90 dark:text-amber-100"
      role="status"
      aria-live="polite"
    >
      Founder Mode Active
    </div>
  );
}

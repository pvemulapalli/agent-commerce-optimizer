"use client";

import { useEffect } from "react";

export function ScanActivityToast({
  hostname,
  onDismiss,
}: {
  hostname: string | null;
  onDismiss: () => void;
}) {
  useEffect(() => {
    if (!hostname) {
      return;
    }

    const timeoutId = window.setTimeout(onDismiss, 5000);
    return () => window.clearTimeout(timeoutId);
  }, [hostname, onDismiss]);

  if (!hostname) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm rounded-xl border border-slate-200 bg-white p-4 shadow-lg">
      <p className="text-sm font-medium text-slate-900">
        New scan completed: {hostname}
      </p>
      <button
        type="button"
        onClick={onDismiss}
        className="mt-3 text-xs font-medium text-blue-900 hover:underline"
      >
        Dismiss
      </button>
    </div>
  );
}

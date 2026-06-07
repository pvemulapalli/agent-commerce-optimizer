"use client";

import { useEffect, useState } from "react";

export function CopyToast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const timer = window.setTimeout(onDone, 2200);
    return () => window.clearTimeout(timer);
  }, [onDone]);

  return (
    <div
      role="status"
      className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-900 shadow-lg dark:border-emerald-500/40 dark:bg-emerald-950 dark:text-emerald-100"
    >
      {message}
    </div>
  );
}

export function useCopyToast() {
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  async function copyWithToast(text: string, toast: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text);
      setToastMessage(toast);
      return true;
    } catch {
      return false;
    }
  }

  return {
    toastMessage,
    clearToast: () => setToastMessage(null),
    copyWithToast,
  };
}

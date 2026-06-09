"use client";

import { useTelemetrySuppression } from "@/components/telemetry-context-provider";
import { isGa4TrackingEnabled } from "@/lib/analytics-config";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export function Ga4PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { suppressed } = useTelemetrySuppression();

  useEffect(() => {
    if (!isGa4TrackingEnabled() || suppressed || typeof window.gtag !== "function") {
      return;
    }

    const query = searchParams.toString();
    const pagePath = query ? `${pathname}?${query}` : pathname;

    window.gtag("event", "page_view", {
      page_path: pagePath,
      page_location: window.location.href,
      page_title: document.title,
    });
  }, [pathname, searchParams, suppressed]);

  return null;
}

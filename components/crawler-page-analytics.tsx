"use client";

import { trackCrawlerPageViewed } from "@/lib/analytics-events";
import { useEffect } from "react";

export function CrawlerPageAnalytics() {
  useEffect(() => {
    trackCrawlerPageViewed(document.referrer || null);
  }, []);

  return null;
}

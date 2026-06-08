import { AnalyticsStatusClient } from "@/components/analytics-status-client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Analytics Status",
  description: "Diagnostics for GA4 and PostHog analytics instrumentation.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AnalyticsStatusPage() {
  return <AnalyticsStatusClient />;
}

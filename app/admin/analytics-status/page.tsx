import { PageHeader } from "@/components/page-header";
import { resolveAdminPagePath } from "@/lib/admin-route";
import AnalyticsStatusAdminClient from "./analytics-status-admin-client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Analytics Status",
  description: "Admin diagnostics for GA4 and PostHog analytics instrumentation.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AnalyticsStatusAdminPage() {
  return (
    <main className="mx-auto w-full min-w-0 max-w-[96rem] px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <PageHeader
        eyebrow="Admin"
        title="Analytics Status"
        description="Diagnostics for GA4 and PostHog instrumentation. Requires an active admin session."
      />

      <div className="mt-10">
        <AnalyticsStatusAdminClient adminRoutePath={resolveAdminPagePath()} />
      </div>
    </main>
  );
}

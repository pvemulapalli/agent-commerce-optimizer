import { PageHeader } from "@/components/page-header";
import { resolveAdminPagePath } from "@/lib/admin-route";
import ScanAnalyticsClient from "./scan-analytics-client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Scan Analytics",
  robots: {
    index: false,
    follow: false,
  },
};

export default function ScanAnalyticsPage() {
  return (
    <main className="mx-auto w-full min-w-0 max-w-[96rem] px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <PageHeader
        eyebrow="Admin"
        title="Scan Analytics"
        description="Internal aggregate insights from completed Redis scan history. Not for public distribution."
      />

      <div className="mt-10">
        <ScanAnalyticsClient adminRoutePath={resolveAdminPagePath()} />
      </div>
    </main>
  );
}

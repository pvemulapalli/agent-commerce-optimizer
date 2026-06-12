import { PageHeader } from "@/components/page-header";
import { resolveAdminPagePath } from "@/lib/admin-route";
import AgentReadinessAdminClient from "./agent-readiness-admin-client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Agent Readiness",
  description:
    "Admin-only AI discoverability checks for robots.txt, sitemap.xml, Link headers, and API catalog support.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AgentReadinessAdminPage() {
  return (
    <main className="mx-auto w-full min-w-0 max-w-[96rem] px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <PageHeader
        eyebrow="Admin"
        title="Agent Readiness"
        description="Informational checks for AI discoverability signals exposed by Merchant Signals. Requires an active admin session."
      />

      <div className="mt-10">
        <AgentReadinessAdminClient adminRoutePath={resolveAdminPagePath()} />
      </div>
    </main>
  );
}

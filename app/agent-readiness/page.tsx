import { AgentReadinessClient } from "@/components/agent-readiness-client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Agent Readiness",
  description:
    "Informational AI discoverability checks for robots.txt, sitemap.xml, Link headers, and API catalog support.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AgentReadinessPage() {
  return <AgentReadinessClient />;
}

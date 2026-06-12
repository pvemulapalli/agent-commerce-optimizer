"use client";

import { AdminAuthGate } from "@/components/admin-auth-gate";
import { AdminToolsNav } from "@/components/admin-tools-nav";
import { AgentReadinessClient } from "@/components/agent-readiness-client";
import { adminSectionClass } from "@/lib/admin-theme-classes";
import { textSecondaryClass } from "@/lib/theme-classes";

export default function AgentReadinessAdminClient({
  adminRoutePath,
}: {
  adminRoutePath: string;
}) {
  return (
    <AdminAuthGate
      adminRoutePath={adminRoutePath}
      title="Admin access required"
      description="Agent readiness checks are available only after unlocking admin tools on this browser session. Use the same admin token as the main maintenance page."
      unlockLabel="Unlock agent readiness"
    >
      <div className="space-y-8">
        <div className={`flex flex-wrap items-center justify-between gap-4 ${adminSectionClass}`}>
          <div>
            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
              Admin session active
            </p>
            <p className={`mt-1 text-sm ${textSecondaryClass}`}>
              Live discoverability checks against this deployment.
            </p>
          </div>
          <AdminToolsNav adminRoutePath={adminRoutePath} currentPath="/agent-readiness" />
        </div>

        <AgentReadinessClient embedded />
      </div>
    </AdminAuthGate>
  );
}

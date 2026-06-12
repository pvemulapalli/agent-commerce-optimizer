"use client";

import { AdminAuthGate } from "@/components/admin-auth-gate";
import { AdminToolsNav } from "@/components/admin-tools-nav";
import { AnalyticsStatusClient } from "@/components/analytics-status-client";
import { adminSectionClass } from "@/lib/admin-theme-classes";
import { textSecondaryClass } from "@/lib/theme-classes";

export default function AnalyticsStatusAdminClient({
  adminRoutePath,
}: {
  adminRoutePath: string;
}) {
  return (
    <AdminAuthGate
      adminRoutePath={adminRoutePath}
      title="Admin access required"
      description="Analytics status diagnostics are available only after unlocking admin tools on this browser session. Use the same admin token as the main maintenance page."
      unlockLabel="Unlock analytics status"
    >
      <div className="space-y-8">
        <div className={`flex flex-wrap items-center justify-between gap-4 ${adminSectionClass}`}>
          <div>
            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
              Admin session active
            </p>
            <p className={`mt-1 text-sm ${textSecondaryClass}`}>
              GA4 and PostHog configuration checks for this deployment and browser session.
            </p>
          </div>
          <AdminToolsNav adminRoutePath={adminRoutePath} currentPath="/analytics-status" />
        </div>

        <AnalyticsStatusClient embedded />
      </div>
    </AdminAuthGate>
  );
}

"use client";

import { adminPageHref } from "@/lib/admin-route";
import { adminSecondaryButtonClass } from "@/lib/admin-theme-classes";
import Link from "next/link";

const INTERNAL_TOOLS = [
  { suffix: "", label: "Admin tools" },
  { suffix: "/analytics", label: "Scan analytics" },
  { suffix: "/analytics-status", label: "Analytics status" },
  { suffix: "/agent-readiness", label: "Agent readiness" },
] as const;

export function AdminToolsNav({
  adminRoutePath,
  currentPath = "",
}: {
  adminRoutePath: string;
  currentPath?: "" | "/analytics" | "/analytics-status" | "/agent-readiness";
}) {
  return (
    <div className="flex flex-wrap gap-3">
      {INTERNAL_TOOLS.map((tool) => {
        const href = adminPageHref(tool.suffix || undefined, adminRoutePath);
        const isCurrent = tool.suffix === currentPath;

        return (
          <Link
            key={tool.suffix || "home"}
            href={href}
            aria-current={isCurrent ? "page" : undefined}
            className={
              isCurrent
                ? "rounded-lg border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-900 dark:border-blue-700 dark:bg-blue-950/40 dark:text-blue-200"
                : adminSecondaryButtonClass
            }
          >
            {tool.label}
          </Link>
        );
      })}
      <a
        href="/api/health"
        target="_blank"
        rel="noopener noreferrer"
        className={adminSecondaryButtonClass}
      >
        API health ↗
      </a>
    </div>
  );
}

import { getBuiltWithProfileUrl } from "@/lib/builtwith-url";
import { UNKNOWN_PLATFORM_EXPLANATION } from "@/lib/scan-messaging";

export function UnknownPlatformHelp({
  auditUrl,
  variant = "full",
}: {
  auditUrl: string;
  variant?: "compact" | "full";
}) {
  const builtWithUrl = getBuiltWithProfileUrl(auditUrl);

  if (variant === "compact") {
    return (
      <div className="mt-1.5 space-y-1">
        <p className="text-xs leading-5 text-text-secondary">{UNKNOWN_PLATFORM_EXPLANATION}</p>
        <a
          href={builtWithUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-medium text-blue-900 hover:underline dark:text-blue-300"
        >
          View technology profile on BuiltWith
        </a>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-xl border border-card-border bg-card-muted p-4">
      <p className="text-sm leading-6 text-text-secondary">{UNKNOWN_PLATFORM_EXPLANATION}</p>
      <p className="mt-3">
        <a
          href={builtWithUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-blue-900 hover:underline dark:text-blue-300"
        >
          View technology profile on BuiltWith
        </a>
      </p>
      <p className="mt-2 text-xs text-text-secondary">
        External reference only — not affiliated with Commerce Optimizer.
      </p>
    </div>
  );
}

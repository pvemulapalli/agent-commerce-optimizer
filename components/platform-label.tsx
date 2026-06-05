import {
  formatPlatformDisplay,
  isPlatformNotIdentified,
  OTHER_PLATFORM_TOOLTIP,
} from "@/lib/platform-labels";

export function PlatformLabel({
  platform,
  className = "",
  truncate = false,
}: {
  platform: string | null | undefined;
  className?: string;
  truncate?: boolean;
}) {
  const label = formatPlatformDisplay(platform);
  const layoutClass = truncate
    ? "inline-flex min-w-0 max-w-full items-center gap-1.5"
    : "inline-flex items-center gap-1.5 whitespace-nowrap";

  if (isPlatformNotIdentified(platform)) {
    return (
      <span
        className={`${layoutClass} ${className}`}
        title={OTHER_PLATFORM_TOOLTIP}
      >
        <span
          className={`font-semibold text-text-secondary ${truncate ? "truncate" : ""}`}
        >
          {label}
        </span>
        <span
          className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-100"
          aria-label={OTHER_PLATFORM_TOOLTIP}
        >
          i
        </span>
      </span>
    );
  }

  return (
    <span
      className={`font-semibold text-text-primary ${truncate ? "block truncate" : "whitespace-nowrap"} ${className}`}
    >
      {label}
    </span>
  );
}

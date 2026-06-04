import {
  formatPlatformDisplay,
  isPlatformNotIdentified,
  PLATFORM_NOT_IDENTIFIED_TOOLTIP,
} from "@/lib/platform-labels";

export function PlatformLabel({
  platform,
  className = "",
}: {
  platform: string | null | undefined;
  className?: string;
}) {
  const label = formatPlatformDisplay(platform);

  if (isPlatformNotIdentified(platform)) {
    return (
      <span
        className={`inline-flex items-center gap-1 ${className}`}
        title={PLATFORM_NOT_IDENTIFIED_TOOLTIP}
      >
        <span>{label}</span>
        <span
          className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-200"
          aria-label={PLATFORM_NOT_IDENTIFIED_TOOLTIP}
        >
          i
        </span>
      </span>
    );
  }

  return <span className={className}>{label}</span>;
}

import {
  formatPlatformDisplay,
  isPlatformNotIdentified,
  OTHER_PLATFORM_TOOLTIP,
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
        className={`inline-flex items-center gap-1.5 whitespace-nowrap ${className}`}
        title={OTHER_PLATFORM_TOOLTIP}
      >
        <span className="font-semibold text-text-secondary">{label}</span>
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
    <span className={`font-semibold whitespace-nowrap text-text-primary ${className}`}>
      {label}
    </span>
  );
}

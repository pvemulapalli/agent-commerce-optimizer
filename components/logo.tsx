import { APP_VERSION_LABEL } from "@/lib/app-version";

export function Logo({
  className = "h-8 w-8",
  showWordmark = false,
}: {
  className?: string;
  showWordmark?: boolean;
}) {
  return (
    <span className="inline-flex min-w-0 items-center gap-3">
      <svg
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-hidden
      >
        <rect
          x="3"
          y="3"
          width="26"
          height="26"
          rx="5"
          stroke="#0f172a"
          strokeWidth="2"
        />
        <rect x="8" y="9" width="16" height="2" fill="#0f172a" />
        <rect x="8" y="14" width="11" height="2" fill="#1e3a8a" />
        <rect x="8" y="19" width="14" height="2" fill="#0f172a" />
        <rect x="21" y="21" width="4" height="4" rx="1" fill="#1e3a8a" />
      </svg>

      {showWordmark && (
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold tracking-tight text-slate-900">
            Commerce Optimizer
          </span>
          <span className="block text-xs text-slate-500">{APP_VERSION_LABEL}</span>
        </span>
      )}
    </span>
  );
}

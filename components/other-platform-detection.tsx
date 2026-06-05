import { PlatformLabel } from "@/components/platform-label";
import { getBuiltWithProfileUrl } from "@/lib/builtwith-url";

export const OTHER_PLATFORM_DETECTION_EXPLANATION =
  "Commerce platform could not be confidently identified from storefront signals.";

export function OtherPlatformDetectionDetails({ auditUrl }: { auditUrl: string }) {
  const builtWithUrl = getBuiltWithProfileUrl(auditUrl);

  return (
    <div className="mt-6 rounded-xl border border-card-border bg-card-muted p-4">
      <p className="text-sm leading-6 text-text-secondary">{OTHER_PLATFORM_DETECTION_EXPLANATION}</p>
      <p className="mt-3">
        <a
          href={builtWithUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-blue-900 hover:underline dark:text-blue-300"
        >
          Check BuiltWith technology profile
        </a>
      </p>
      <p className="mt-2 text-xs text-text-secondary">
        External reference only — not affiliated with Commerce Optimizer.
      </p>
    </div>
  );
}

export function PlatformValue({ platform }: { platform: string | null | undefined }) {
  return <PlatformLabel platform={platform} />;
}

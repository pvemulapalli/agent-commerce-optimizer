import { PlatformLabel } from "@/components/platform-label";
import { UnknownPlatformHelp } from "@/components/unknown-platform-help";
import { isPlatformNotIdentified } from "@/lib/platform-labels";

export function PlatformDisplay({
  platform,
  auditUrl,
  helpVariant = "compact",
}: {
  platform: string | null | undefined;
  auditUrl?: string | null;
  helpVariant?: "compact" | "full";
}) {
  const showHelp = isPlatformNotIdentified(platform) && Boolean(auditUrl);

  return (
    <div className={helpVariant === "full" ? "min-w-0" : "inline-block min-w-0 max-w-full"}>
      <PlatformLabel platform={platform} />
      {showHelp && auditUrl ? (
        <UnknownPlatformHelp auditUrl={auditUrl} variant={helpVariant} />
      ) : null}
    </div>
  );
}

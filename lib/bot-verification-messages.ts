import { BOT_VERIFICATION_SCAN_STATUS } from "./bot-verification";
import type { BotVerificationDiagnostic } from "./bot-verification-diagnostics";

export function isBotVerificationScanResponse(
  data: unknown,
): data is BotVerificationDiagnostic & { scanStatus: typeof BOT_VERIFICATION_SCAN_STATUS } {
  if (!data || typeof data !== "object") {
    return false;
  }

  const record = data as Record<string, unknown>;
  return (
    record.scanStatus === BOT_VERIFICATION_SCAN_STATUS &&
    typeof record.message === "string" &&
    typeof record.meaning === "string"
  );
}

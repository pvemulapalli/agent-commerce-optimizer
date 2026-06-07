import { BOT_VERIFICATION_SCAN_STATUS } from "./bot-verification";

export function isBotVerificationScanResponse(
  data: unknown,
): data is { scanStatus: typeof BOT_VERIFICATION_SCAN_STATUS; message: string } {
  if (!data || typeof data !== "object") {
    return false;
  }

  const record = data as Record<string, unknown>;
  return (
    record.scanStatus === BOT_VERIFICATION_SCAN_STATUS &&
    typeof record.message === "string"
  );
}

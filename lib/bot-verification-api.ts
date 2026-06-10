import {
  BOT_VERIFICATION_SCAN_STATUS,
  type BotVerificationBlockedError,
} from "./bot-verification";
import type { BotVerificationDiagnostic } from "./bot-verification-diagnostics";
import { NextResponse } from "next/server";

export interface BotVerificationScanResponse extends BotVerificationDiagnostic {
  scanStatus: typeof BOT_VERIFICATION_SCAN_STATUS;
}

export function createBotVerificationResponse(
  error?: BotVerificationBlockedError,
): NextResponse<BotVerificationScanResponse> {
  const diagnostic = error?.diagnostic;

  return NextResponse.json(
    {
      scanStatus: BOT_VERIFICATION_SCAN_STATUS,
      title: diagnostic?.title ?? "Bot Verification Detected",
      message:
        diagnostic?.message ??
        "This storefront is actively challenging automated scanners.",
      meaning:
        diagnostic?.meaning ??
        "This storefront is actively challenging automated scanners. Merchant Signals is not necessarily at fault—the site is protecting itself from automated traffic.",
      confidence: diagnostic?.confidence ?? "high",
      provider: diagnostic?.provider ?? "unknown",
      httpStatus: diagnostic?.httpStatus ?? null,
    },
    { status: 503 },
  );
}

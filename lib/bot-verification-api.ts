import {
  BOT_VERIFICATION_MESSAGE,
  BOT_VERIFICATION_SCAN_STATUS,
} from "./bot-verification";
import { NextResponse } from "next/server";

export interface BotVerificationScanResponse {
  scanStatus: typeof BOT_VERIFICATION_SCAN_STATUS;
  message: string;
}

export function createBotVerificationResponse(): NextResponse<BotVerificationScanResponse> {
  return NextResponse.json(
    {
      scanStatus: BOT_VERIFICATION_SCAN_STATUS,
      message: BOT_VERIFICATION_MESSAGE,
    },
    { status: 503 },
  );
}

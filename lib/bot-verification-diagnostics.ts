import type { ConfidenceLevel } from "./types";

export interface BotVerificationDiagnostic {
  title: string;
  message: string;
  meaning: string;
  confidence: ConfidenceLevel;
  provider: "cloudflare" | "enterprise_waf" | "unknown";
  httpStatus?: number | null;
}

export const BOT_VERIFICATION_ACTIONS = [
  "Retry later if you believe the storefront should allow automated review.",
  "Scan a different storefront URL on the same domain, such as the homepage.",
  "Contact the site owner if you need Merchant Signals access for ongoing monitoring.",
  "Review the BuiltWith profile to understand the underlying commerce stack.",
] as const;

import type { ConfidenceLevel } from "./types";

export const STOREFRONT_PASSWORD_ACTIONS = [
  "Enter the storefront password from your Shopify admin (Online Store → Preferences → Password protection).",
  "Merchant Signals uses the password only for this scan request and does not store it in reports or cache.",
  "After a successful unlock, the scan runs the same readiness assessment as a public storefront.",
] as const;

export interface StorefrontPasswordDiagnostic {
  title: string;
  message: string;
  meaning: string;
  confidence: ConfidenceLevel;
  provider: "shopify";
  invalidPassword: boolean;
}

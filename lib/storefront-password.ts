import type { StorefrontPasswordDiagnostic } from "./storefront-password-diagnostics";

export const STOREFRONT_PASSWORD_SCAN_STATUS = "storefront_password_required";

export const STOREFRONT_PASSWORD_MESSAGE =
  "This Shopify development storefront is password protected.";

export class StorefrontPasswordRequiredError extends Error {
  diagnostic: StorefrontPasswordDiagnostic;

  constructor(diagnostic?: Partial<StorefrontPasswordDiagnostic>) {
    const invalidPassword = diagnostic?.invalidPassword ?? false;

    super(
      invalidPassword
        ? "The storefront password was not accepted."
        : STOREFRONT_PASSWORD_MESSAGE,
    );
    this.name = "StorefrontPasswordRequiredError";
    this.diagnostic = {
      title: invalidPassword ? "Storefront password not accepted" : "Storefront password required",
      message: invalidPassword
        ? "The password you entered did not unlock this Shopify storefront."
        : STOREFRONT_PASSWORD_MESSAGE,
      meaning: invalidPassword
        ? "Shopify still returned the password gate after unlock. Double-check the password from Online Store → Preferences in Shopify admin."
        : "This store is in pre-launch mode. Enter the storefront password so Merchant Signals can crawl the site the same way a visitor would after unlocking.",
      confidence: "high",
      provider: "shopify",
      invalidPassword,
      ...diagnostic,
    };
  }
}

export function buildStorefrontPasswordRequiredDiagnostic(
  invalidPassword = false,
): StorefrontPasswordDiagnostic {
  return new StorefrontPasswordRequiredError({ invalidPassword }).diagnostic;
}

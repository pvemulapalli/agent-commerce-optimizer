import { STOREFRONT_PASSWORD_SCAN_STATUS } from "./storefront-password";
import type { StorefrontPasswordDiagnostic } from "./storefront-password-diagnostics";

export function isStorefrontPasswordScanResponse(
  data: unknown,
): data is StorefrontPasswordDiagnostic & {
  scanStatus: typeof STOREFRONT_PASSWORD_SCAN_STATUS;
} {
  if (!data || typeof data !== "object") {
    return false;
  }

  const record = data as Record<string, unknown>;
  return (
    record.scanStatus === STOREFRONT_PASSWORD_SCAN_STATUS &&
    typeof record.message === "string" &&
    typeof record.meaning === "string"
  );
}

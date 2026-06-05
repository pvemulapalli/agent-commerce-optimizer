import { INVALID_NON_ECOMMERCE_SCAN_STATUS } from "./ecommerce-eligibility";

export function isNonEcommerceScanResponse(
  data: unknown,
): data is {
  scanStatus: typeof INVALID_NON_ECOMMERCE_SCAN_STATUS;
  message: string;
  ecommerceConfidence: number;
  reason: string;
} {
  if (!data || typeof data !== "object") {
    return false;
  }

  const record = data as Record<string, unknown>;
  return (
    record.scanStatus === INVALID_NON_ECOMMERCE_SCAN_STATUS &&
    typeof record.message === "string"
  );
}

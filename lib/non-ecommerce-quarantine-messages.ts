export const QUARANTINED_NON_ECOMMERCE_MESSAGE =
  "This domain appears to be a content, informational, service, or non-commerce website rather than an ecommerce storefront.\n\nMerchant Signals currently analyzes ecommerce storefronts.\n\nIf you believe this classification is incorrect, please contact us and we will review the domain.";

export const QUARANTINED_NON_ECOMMERCE_SCAN_STATUS = "quarantined_non_ecommerce_site";

export function isQuarantinedNonEcommerceScanResponse(
  data: unknown,
): data is { scanStatus: typeof QUARANTINED_NON_ECOMMERCE_SCAN_STATUS; message: string } {
  if (!data || typeof data !== "object") {
    return false;
  }

  const record = data as Record<string, unknown>;
  return (
    record.scanStatus === QUARANTINED_NON_ECOMMERCE_SCAN_STATUS &&
    typeof record.message === "string"
  );
}

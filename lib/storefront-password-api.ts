import {
  buildStorefrontPasswordRequiredDiagnostic,
  STOREFRONT_PASSWORD_SCAN_STATUS,
  type StorefrontPasswordRequiredError,
} from "./storefront-password";
import type { StorefrontPasswordDiagnostic } from "./storefront-password-diagnostics";
import { NextResponse } from "next/server";

export interface StorefrontPasswordScanResponse extends StorefrontPasswordDiagnostic {
  scanStatus: typeof STOREFRONT_PASSWORD_SCAN_STATUS;
}

export function createStorefrontPasswordResponse(
  error?: StorefrontPasswordRequiredError,
  overrides?: Partial<StorefrontPasswordDiagnostic>,
): NextResponse<StorefrontPasswordScanResponse> {
  const invalidPassword =
    overrides?.invalidPassword ?? error?.diagnostic.invalidPassword ?? false;
  const diagnostic: StorefrontPasswordDiagnostic = {
    ...buildStorefrontPasswordRequiredDiagnostic(invalidPassword),
    ...error?.diagnostic,
    ...overrides,
    invalidPassword,
  };

  return NextResponse.json(
    {
      scanStatus: STOREFRONT_PASSWORD_SCAN_STATUS,
      ...diagnostic,
    },
    { status: invalidPassword ? 401 : 403 },
  );
}

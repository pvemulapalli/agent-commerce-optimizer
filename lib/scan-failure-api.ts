import {
  buildScanFailureDiagnostic,
  SCAN_FAILED_STATUS,
  type ScanFailureDiagnostic,
} from "./scan-failure-diagnostics";
import { NextResponse } from "next/server";
import type { DomainUnreachableError } from "./domain-reachability";

export interface ScanFailureResponse extends ScanFailureDiagnostic {
  scanStatus: typeof SCAN_FAILED_STATUS;
}

export function createScanFailureResponse(
  diagnostic: ScanFailureDiagnostic,
): NextResponse<ScanFailureResponse> {
  return NextResponse.json(
    {
      scanStatus: SCAN_FAILED_STATUS,
      ...diagnostic,
    },
    { status: 400 },
  );
}

export function createScanFailureResponseFromError(
  error: DomainUnreachableError,
): NextResponse<ScanFailureResponse> {
  const diagnostic =
    error.diagnostic ??
    buildScanFailureDiagnostic("site_unreachable", { message: error.message });

  return createScanFailureResponse(diagnostic);
}

import {
  INVALID_NON_ECOMMERCE_SCAN_STATUS,
  type EcommerceEligibilityAssessment,
} from "./ecommerce-eligibility";
import { NextResponse } from "next/server";

export interface IneligibleEcommerceScanResponse {
  scanStatus: typeof INVALID_NON_ECOMMERCE_SCAN_STATUS;
  ecommerceConfidence: number;
  reason: string;
  message: string;
}

export function createIneligibleEcommerceResponse(
  assessment: EcommerceEligibilityAssessment,
): NextResponse<IneligibleEcommerceScanResponse> {
  return NextResponse.json(
    {
      scanStatus: INVALID_NON_ECOMMERCE_SCAN_STATUS,
      ecommerceConfidence: assessment.ecommerceConfidence,
      reason: assessment.reason,
      message: assessment.message,
    },
    { status: 422 },
  );
}

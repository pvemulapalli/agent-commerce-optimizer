import {
  INVALID_NON_ECOMMERCE_SCAN_STATUS,
  type EcommerceEligibilityAssessment,
} from "./ecommerce-eligibility";
import { QUARANTINED_NON_ECOMMERCE_MESSAGE } from "./non-ecommerce-quarantine-messages";
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
      message: QUARANTINED_NON_ECOMMERCE_MESSAGE,
    },
    { status: 422 },
  );
}

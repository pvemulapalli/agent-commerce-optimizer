import {
  formatValidationReport,
  validateAllMerchantFixtures,
} from "@/lib/merchant-fixtures";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET() {
  try {
    const { results, summary } = await validateAllMerchantFixtures();

    return NextResponse.json({
      summary,
      report: formatValidationReport(results),
      results,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Validation failed unexpectedly";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

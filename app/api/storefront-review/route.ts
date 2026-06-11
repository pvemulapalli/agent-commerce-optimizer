import { shouldOfferStorefrontReviewRequest } from "@/lib/storefront-review-eligibility";
import {
  createStorefrontReviewRequest,
  STOREFRONT_REVIEW_RELATIONSHIPS,
} from "@/lib/storefront-review-requests";
import type { StorefrontReviewRelationship } from "@/lib/storefront-review-types";
import { isRedisConfigured } from "@/lib/redis";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const relationshipSchema = z.enum(
  STOREFRONT_REVIEW_RELATIONSHIPS as [string, ...string[]],
);

const submitSchema = z.object({
  storefrontUrl: z.string().trim().min(1, "Storefront URL is required."),
  email: z.string().trim().email("A valid email address is required."),
  companyName: z.string().trim().nullable().optional(),
  relationship: relationshipSchema,
  comments: z.string().trim().nullable().optional(),
  failureType: z.string().trim().min(1, "Failure type is required."),
});

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = submitSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  if (!shouldOfferStorefrontReviewRequest(parsed.data.failureType)) {
    return NextResponse.json(
      { error: "Storefront review requests are not available for this scan result." },
      { status: 400 },
    );
  }

  if (!isRedisConfigured()) {
    return NextResponse.json(
      { error: "Storefront review requests are temporarily unavailable." },
      { status: 503 },
    );
  }

  try {
    const record = await createStorefrontReviewRequest({
      storefrontUrl: parsed.data.storefrontUrl,
      email: parsed.data.email,
      companyName: parsed.data.companyName ?? null,
      relationship: parsed.data.relationship as StorefrontReviewRelationship,
      comments: parsed.data.comments ?? null,
      failureType: parsed.data.failureType,
    });

    return NextResponse.json({
      status: "ok",
      id: record.id,
      message:
        "Your storefront review request has been received. Merchant Signals will evaluate whether support can be improved for this storefront in a future release.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to submit request.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

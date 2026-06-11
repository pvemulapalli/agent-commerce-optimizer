import { validateAdminRequest } from "@/lib/admin-auth";
import { isRedisConfigured } from "@/lib/redis";
import {
  listStorefrontReviewRequests,
  STOREFRONT_REVIEW_STATUSES,
  updateStorefrontReviewRequestNotes,
  updateStorefrontReviewRequestStatus,
} from "@/lib/storefront-review-requests";
import type { StorefrontReviewRequestStatus } from "@/lib/storefront-review-types";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const statusSchema = z.enum(STOREFRONT_REVIEW_STATUSES as [string, ...string[]]);

const actionSchema = z.discriminatedUnion("action", [
  z.object({
    token: z.string().trim().min(1),
    action: z.literal("status"),
    id: z.string().trim().min(1),
    status: statusSchema,
  }),
  z.object({
    token: z.string().trim().min(1),
    action: z.literal("notes"),
    id: z.string().trim().min(1),
    reviewNotes: z.string().trim().nullable(),
  }),
  z.object({
    token: z.string().trim().min(1),
    action: z.literal("mark_supported"),
    id: z.string().trim().min(1),
  }),
  z.object({
    token: z.string().trim().min(1),
    action: z.literal("mark_not_supported"),
    id: z.string().trim().min(1),
  }),
  z.object({
    token: z.string().trim().min(1),
    action: z.literal("close"),
    id: z.string().trim().min(1),
  }),
]);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const authError = validateAdminRequest(request, token);

  if (authError) {
    return authError;
  }

  const search = url.searchParams.get("search") ?? undefined;
  const requests = await listStorefrontReviewRequests(search);

  return NextResponse.json({
    status: "ok",
    requests,
    redisConfigured: isRedisConfigured(),
  });
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = actionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  const authError = validateAdminRequest(request, parsed.data.token);

  if (authError) {
    return authError;
  }

  if (!isRedisConfigured()) {
    return NextResponse.json(
      { error: "Redis is not configured. Storefront Review Requests require Redis." },
      { status: 503 },
    );
  }

  try {
    switch (parsed.data.action) {
      case "status": {
        const record = await updateStorefrontReviewRequestStatus({
          id: parsed.data.id,
          status: parsed.data.status as StorefrontReviewRequestStatus,
          reviewedBy: "admin",
        });
        if (!record) {
          return NextResponse.json({ error: "Request not found." }, { status: 404 });
        }
        return NextResponse.json({ status: "ok", request: record });
      }
      case "notes": {
        const record = await updateStorefrontReviewRequestNotes({
          id: parsed.data.id,
          reviewNotes: parsed.data.reviewNotes,
          reviewedBy: "admin",
        });
        if (!record) {
          return NextResponse.json({ error: "Request not found." }, { status: 404 });
        }
        return NextResponse.json({ status: "ok", request: record });
      }
      case "mark_supported": {
        const record = await updateStorefrontReviewRequestStatus({
          id: parsed.data.id,
          status: "SUPPORTED",
          reviewedBy: "admin",
        });
        if (!record) {
          return NextResponse.json({ error: "Request not found." }, { status: 404 });
        }
        return NextResponse.json({ status: "ok", request: record });
      }
      case "mark_not_supported": {
        const record = await updateStorefrontReviewRequestStatus({
          id: parsed.data.id,
          status: "NOT_SUPPORTED",
          reviewedBy: "admin",
        });
        if (!record) {
          return NextResponse.json({ error: "Request not found." }, { status: 404 });
        }
        return NextResponse.json({ status: "ok", request: record });
      }
      case "close": {
        const record = await updateStorefrontReviewRequestStatus({
          id: parsed.data.id,
          status: "CLOSED",
          reviewedBy: "admin",
        });
        if (!record) {
          return NextResponse.json({ error: "Request not found." }, { status: 404 });
        }
        return NextResponse.json({ status: "ok", request: record });
      }
      default:
        return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Action failed unexpectedly";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}

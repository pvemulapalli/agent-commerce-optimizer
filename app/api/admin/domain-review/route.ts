import { validateAdminRequest } from "@/lib/admin-auth";
import type { DomainReviewType } from "@/lib/domain-review-types";
import {
  DOMAIN_REVIEW_TYPES,
  getDomainReviewQueue,
  normalizeDomainReviewInput,
  reclassifyDomainReview,
  removeDomainReviewRecord,
  updateDomainReviewNotes,
  updateDomainReviewStatus,
  upsertDomainReviewRecord,
} from "@/lib/domain-review-queue";
import { isRedisConfigured } from "@/lib/redis";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const reviewTypeSchema = z.enum(DOMAIN_REVIEW_TYPES as [string, ...string[]]);

const actionSchema = z.discriminatedUnion("action", [
  z.object({
    token: z.string().trim().min(1),
    action: z.literal("add"),
    domain: z.string().trim().min(1),
    type: reviewTypeSchema.optional(),
    notes: z.string().trim().nullable().optional(),
  }),
  z.object({
    token: z.string().trim().min(1),
    action: z.literal("remove"),
    domain: z.string().trim().min(1),
  }),
  z.object({
    token: z.string().trim().min(1),
    action: z.literal("allow_scans"),
    domain: z.string().trim().min(1),
    notes: z.string().trim().nullable().optional(),
  }),
  z.object({
    token: z.string().trim().min(1),
    action: z.literal("block_scans"),
    domain: z.string().trim().min(1),
    notes: z.string().trim().nullable().optional(),
  }),
  z.object({
    token: z.string().trim().min(1),
    action: z.literal("notes"),
    domain: z.string().trim().min(1),
    notes: z.string().trim().nullable(),
  }),
  z.object({
    token: z.string().trim().min(1),
    action: z.literal("reclassify"),
    domain: z.string().trim().min(1),
    type: reviewTypeSchema,
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
  const domains = await getDomainReviewQueue(search);

  return NextResponse.json({
    status: "ok",
    domains,
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
      { error: "Redis is not configured. Domain Review Queue requires Redis." },
      { status: 503 },
    );
  }

  try {
    const domain = normalizeDomainReviewInput(parsed.data.domain);

    if (!domain) {
      return NextResponse.json({ error: "Domain is required." }, { status: 400 });
    }

    switch (parsed.data.action) {
      case "add": {
        const record = await upsertDomainReviewRecord({
          domain,
          type: (parsed.data.type ?? "MANUAL_BLOCK") as DomainReviewType,
          reason: "manual_admin_add",
          source: "admin",
          status: "APPROVED",
          retryAfter: null,
        });

        if (parsed.data.notes) {
          await updateDomainReviewNotes({ domain, notes: parsed.data.notes });
        }

        return NextResponse.json({ status: "ok", domain: record });
      }
      case "remove": {
        const removed = await removeDomainReviewRecord(domain);
        if (!removed) {
          return NextResponse.json({ error: "Domain not found." }, { status: 404 });
        }
        return NextResponse.json({ status: "ok" });
      }
      case "allow_scans": {
        const record = await updateDomainReviewStatus({
          domain,
          status: "WHITELISTED",
          reviewedBy: "admin",
          notes: parsed.data.notes ?? null,
        });
        if (!record) {
          return NextResponse.json({ error: "Domain not found." }, { status: 404 });
        }
        return NextResponse.json({ status: "ok", domain: record });
      }
      case "block_scans": {
        const record = await updateDomainReviewStatus({
          domain,
          status: "APPROVED",
          reviewedBy: "admin",
          notes: parsed.data.notes ?? null,
        });
        if (!record) {
          return NextResponse.json({ error: "Domain not found." }, { status: 404 });
        }
        return NextResponse.json({ status: "ok", domain: record });
      }
      case "notes": {
        const record = await updateDomainReviewNotes({
          domain,
          notes: parsed.data.notes,
        });
        if (!record) {
          return NextResponse.json({ error: "Domain not found." }, { status: 404 });
        }
        return NextResponse.json({ status: "ok", domain: record });
      }
      case "reclassify": {
        const record = await reclassifyDomainReview({
          domain,
          type: parsed.data.type as DomainReviewType,
          reviewedBy: "admin",
          retryAfter: null,
        });
        if (!record) {
          return NextResponse.json({ error: "Domain not found." }, { status: 404 });
        }
        return NextResponse.json({ status: "ok", domain: record });
      }
      default:
        return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Action failed unexpectedly";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}

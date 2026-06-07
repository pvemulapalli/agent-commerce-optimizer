import { validateAdminRequest } from "@/lib/admin-auth";
import {
  addNonEcommerceDomain,
  approveNonEcommerceDomain,
  getNonEcommerceDomains,
  normalizeNonEcommerceDomainInput,
  removeNonEcommerceDomain,
  updateNonEcommerceDomainNotes,
} from "@/lib/non-ecommerce-domains";
import { isRedisConfigured } from "@/lib/redis";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const actionSchema = z.discriminatedUnion("action", [
  z.object({
    token: z.string().trim().min(1),
    action: z.literal("add"),
    domain: z.string().trim().min(1),
    reason: z.string().trim().optional(),
    notes: z.string().trim().nullable().optional(),
  }),
  z.object({
    token: z.string().trim().min(1),
    action: z.literal("remove"),
    domain: z.string().trim().min(1),
  }),
  z.object({
    token: z.string().trim().min(1),
    action: z.literal("approve"),
    domain: z.string().trim().min(1),
    notes: z.string().trim().nullable().optional(),
  }),
  z.object({
    token: z.string().trim().min(1),
    action: z.literal("notes"),
    domain: z.string().trim().min(1),
    notes: z.string().trim().nullable(),
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
  const domains = await getNonEcommerceDomains(search);

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
      { error: "Redis is not configured. Non-ecommerce domain quarantine requires Redis." },
      { status: 503 },
    );
  }

  try {
    const domain = normalizeNonEcommerceDomainInput(parsed.data.domain);

    if (!domain) {
      return NextResponse.json({ error: "Domain is required." }, { status: 400 });
    }

    if (parsed.data.action === "add") {
      const record = await addNonEcommerceDomain({
        domain,
        reason: parsed.data.reason ?? "manual_admin_add",
      });

      if (parsed.data.notes) {
        await updateNonEcommerceDomainNotes({
          domain,
          notes: parsed.data.notes,
        });
      }

      return NextResponse.json({ status: "ok", domain: record });
    }

    if (parsed.data.action === "remove") {
      const removed = await removeNonEcommerceDomain(domain);

      if (!removed) {
        return NextResponse.json({ error: "Domain not found." }, { status: 404 });
      }

      return NextResponse.json({ status: "ok" });
    }

    if (parsed.data.action === "approve") {
      const record = await approveNonEcommerceDomain({
        domain,
        reviewedBy: "admin",
        notes: parsed.data.notes ?? null,
      });

      if (!record) {
        return NextResponse.json({ error: "Domain not found." }, { status: 404 });
      }

      return NextResponse.json({ status: "ok", domain: record });
    }

    const record = await updateNonEcommerceDomainNotes({
      domain,
      notes: parsed.data.notes,
    });

    if (!record) {
      return NextResponse.json({ error: "Domain not found." }, { status: 404 });
    }

    return NextResponse.json({ status: "ok", domain: record });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Action failed unexpectedly";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}

import { validateAdminRequest } from "@/lib/admin-auth";
import {
  getContributorsContent,
  saveContributorsContent,
  type ContributorEntry,
} from "@/lib/contributors";
import { isRedisConfigured } from "@/lib/redis";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const contributorSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  linkedinUrl: z.string().trim().optional().default(""),
  companyName: z.string().trim().optional(),
  companyUrl: z.string().trim().optional(),
  note: z.string().trim().optional(),
  active: z.boolean().optional(),
});

const saveSchema = z.object({
  token: z.string().trim().min(1, "Token is required"),
  intro: z.string().trim().optional(),
  contributors: z.array(contributorSchema),
});

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  const authError = validateAdminRequest(request, token);
  if (authError) {
    return authError;
  }

  const content = await getContributorsContent();

  return NextResponse.json({
    status: "ok",
    ...content,
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

  const parsed = saveSchema.safeParse(body);

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

  try {
    const contributors: ContributorEntry[] = parsed.data.contributors.map((entry) => ({
      name: entry.name,
      linkedinUrl: entry.linkedinUrl,
      companyName: entry.companyName,
      companyUrl: entry.companyUrl,
      note: entry.note,
      active: entry.active,
    }));

    const saved = await saveContributorsContent({
      intro: parsed.data.intro ?? "",
      contributors,
    });

    return NextResponse.json({
      status: "ok",
      ...saved,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Save failed unexpectedly";

    return NextResponse.json({ error: message }, { status: 503 });
  }
}

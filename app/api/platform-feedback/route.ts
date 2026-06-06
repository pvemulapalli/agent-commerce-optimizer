import { recordPlatformFeedback } from "@/lib/platform-feedback";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const record = body as {
    domain?: unknown;
    platform?: unknown;
    comments?: unknown;
  };

  const domain = typeof record.domain === "string" ? record.domain.trim() : "";

  if (!domain) {
    return NextResponse.json({ error: "Domain is required." }, { status: 400 });
  }

  try {
    await recordPlatformFeedback({
      domain,
      platform: typeof record.platform === "string" ? record.platform : null,
      comments: typeof record.comments === "string" ? record.comments : null,
    });

    return NextResponse.json({
      status: "ok",
      message: "Thanks! Your feedback helps improve platform detection.",
    });
  } catch {
    return NextResponse.json({ error: "Unable to submit feedback." }, { status: 500 });
  }
}

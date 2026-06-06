import {
  isValidSubscriberEmail,
  recordEmailSubscriber,
} from "@/lib/email-subscribers";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const email =
    typeof body === "object" && body && "email" in body
      ? String((body as { email: unknown }).email ?? "")
      : "";

  if (!isValidSubscriberEmail(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  try {
    const result = await recordEmailSubscriber(email);

    return NextResponse.json({
      status: "ok",
      message:
        result === "duplicate"
          ? "You are already subscribed for updates."
          : "Thanks! We will notify you about updates.",
    });
  } catch {
    return NextResponse.json({ error: "Unable to subscribe right now." }, { status: 500 });
  }
}

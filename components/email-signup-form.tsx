"use client";

import { useState } from "react";

export const EMAIL_SIGNUP_PRIVACY =
  "We won't spam you or sell your information. Unsubscribe anytime.";

export function EmailSignupForm({
  idPrefix = "email-signup",
  compact = false,
}: {
  idPrefix?: string;
  compact?: boolean;
}) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const response = await fetch("/api/email-subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = (await response.json()) as { message?: string; error?: string };

      if (!response.ok) {
        setStatus("error");
        setMessage(data.error ?? "Unable to subscribe right now.");
        return;
      }

      setStatus("success");
      setMessage(data.message ?? "Thanks! We will notify you about updates.");
      setEmail("");
    } catch {
      setStatus("error");
      setMessage("Unable to subscribe right now.");
    }
  }

  return (
    <div>
      {!compact ? (
        <p className="text-sm leading-6 text-text-secondary">
          Stay updated on new platform support, benchmarks, and product releases.
        </p>
      ) : null}
      <form
        onSubmit={handleSubmit}
        className={`flex flex-col gap-3 ${compact ? "" : "mt-3"} sm:flex-row sm:items-center`}
      >
        <label className="sr-only" htmlFor={`${idPrefix}-email`}>
          Email Address
        </label>
        <input
          id={`${idPrefix}-email`}
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Email Address"
          className="min-w-0 flex-1 rounded-lg border border-card-border bg-background px-3 py-2 text-sm text-text-primary"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="rounded-lg bg-blue-900 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-60 dark:bg-blue-700 dark:hover:bg-blue-600"
        >
          {status === "loading" ? "Saving…" : "Notify Me"}
        </button>
      </form>
      <p className="mt-2 text-xs leading-5 text-text-secondary">{EMAIL_SIGNUP_PRIVACY}</p>
      {message ? (
        <p
          className={`mt-2 text-sm ${
            status === "error"
              ? "text-rose-700 dark:text-rose-300"
              : "text-emerald-700 dark:text-emerald-300"
          }`}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}

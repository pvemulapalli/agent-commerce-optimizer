"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";

export function PlatformFeedbackModal({
  domain,
  defaultPlatform = "",
}: {
  domain: string;
  defaultPlatform?: string;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [platform, setPlatform] = useState(defaultPlatform);
  const [comments, setComments] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const response = await fetch("/api/platform-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain, platform: platform || null, comments: comments || null }),
      });

      const data = (await response.json()) as { message?: string; error?: string };

      if (!response.ok) {
        setStatus("error");
        setMessage(data.error ?? "Unable to submit feedback.");
        return;
      }

      setStatus("success");
      setMessage(data.message ?? "Thanks! Your feedback helps improve detection.");
      setComments("");
    } catch {
      setStatus("error");
      setMessage("Unable to submit feedback.");
    }
  }

  const modal =
    open && mounted ? (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
        role="presentation"
        onClick={() => setOpen(false)}
      >
        <div
          role="dialog"
          aria-labelledby="platform-feedback-title"
          aria-modal="true"
          className="w-full max-w-md rounded-2xl border border-card-border bg-card p-6 shadow-xl"
          onClick={(event) => event.stopPropagation()}
        >
          <h2 id="platform-feedback-title" className="text-lg font-semibold text-text-primary">
            Improve platform detection
          </h2>
          <p className="mt-2 text-sm text-text-secondary">
            Share what platform this storefront uses so we can improve future detection.
          </p>

          <form onSubmit={handleSubmit} className="mt-4 space-y-3">
            <div>
              <label htmlFor="feedback-domain" className="text-sm font-medium text-text-secondary">
                Domain
              </label>
              <input
                id="feedback-domain"
                type="text"
                readOnly
                value={domain}
                className="mt-1 w-full rounded-lg border border-card-border bg-card-muted px-3 py-2 text-sm text-text-primary"
              />
            </div>
            <div>
              <label htmlFor="feedback-platform" className="text-sm font-medium text-text-secondary">
                Platform (optional)
              </label>
              <input
                id="feedback-platform"
                type="text"
                value={platform}
                onChange={(event) => setPlatform(event.target.value)}
                placeholder="e.g. VTEX, Adobe Commerce"
                className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm text-text-primary"
              />
            </div>
            <div>
              <label htmlFor="feedback-comments" className="text-sm font-medium text-text-secondary">
                Comments (optional)
              </label>
              <textarea
                id="feedback-comments"
                rows={3}
                value={comments}
                onChange={(event) => setComments(event.target.value)}
                className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm text-text-primary"
              />
            </div>

            {message ? (
              <p
                className={`text-sm ${
                  status === "error"
                    ? "text-rose-700 dark:text-rose-300"
                    : "text-emerald-700 dark:text-emerald-300"
                }`}
              >
                {message}
              </p>
            ) : null}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-card-border px-3 py-2 text-sm font-medium text-text-primary"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={status === "loading" || status === "success"}
                className="rounded-lg bg-blue-900 px-3 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-60 dark:bg-blue-700 dark:hover:bg-blue-600"
              >
                {status === "loading" ? "Submitting…" : "Submit"}
              </button>
            </div>
          </form>
        </div>
      </div>
    ) : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm font-medium text-blue-900 hover:underline dark:text-blue-300"
      >
        Platform not identified? Help improve platform detection
      </button>
      {modal && typeof document !== "undefined" ? createPortal(modal, document.body) : null}
    </>
  );
}

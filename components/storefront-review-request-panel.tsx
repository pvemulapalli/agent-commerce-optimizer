"use client";

import {
  trackStorefrontReviewRequested,
  trackStorefrontReviewSubmitted,
} from "@/lib/analytics-events";
import { shouldOfferStorefrontReviewRequest } from "@/lib/storefront-review-eligibility";
import {
  STOREFRONT_REVIEW_RELATIONSHIPS,
  STOREFRONT_REVIEW_RELATIONSHIP_LABELS,
} from "@/lib/storefront-review-requests";
import type { StorefrontReviewRelationship } from "@/lib/storefront-review-types";
import { createPortal } from "react-dom";
import { useEffect, useState } from "react";

export function StorefrontReviewRequestPanel({
  storefrontUrl,
  failureType,
}: {
  storefrontUrl: string;
  failureType: string;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!shouldOfferStorefrontReviewRequest(failureType)) {
    return null;
  }

  function handleOpen() {
    trackStorefrontReviewRequested({
      domain: storefrontUrl,
      failureType,
    });
    setOpen(true);
  }

  const modal =
    open && mounted ? (
      <StorefrontReviewRequestModal
        storefrontUrl={storefrontUrl}
        failureType={failureType}
        onClose={() => setOpen(false)}
      />
    ) : null;

  return (
    <>
      <div className="mt-6 rounded-xl border border-slate-200 bg-white/80 p-5 dark:border-slate-600/40 dark:bg-slate-950/30">
        <h3 className="text-base font-semibold text-text-primary">Need Help With This Storefront?</h3>
        <p className="mt-2 text-sm leading-6 text-text-secondary">
          Merchant Signals was unable to complete a readiness audit for this storefront.
        </p>
        <p className="mt-2 text-sm leading-6 text-text-secondary">
          If you own, manage, or support this site, you may request a storefront review. We&apos;ll
          evaluate whether support can be improved in a future release and notify you of significant
          updates.
        </p>
        <button
          type="button"
          onClick={handleOpen}
          className="mt-4 inline-flex items-center justify-center rounded-lg border border-blue-900 bg-blue-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-950 dark:border-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600"
        >
          Request Storefront Review
        </button>
      </div>
      {modal && typeof document !== "undefined" ? createPortal(modal, document.body) : null}
    </>
  );
}

function StorefrontReviewRequestModal({
  storefrontUrl,
  failureType,
  onClose,
}: {
  storefrontUrl: string;
  failureType: string;
  onClose: () => void;
}) {
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [relationship, setRelationship] = useState<StorefrontReviewRelationship>("STORE_OWNER");
  const [comments, setComments] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const response = await fetch("/api/storefront-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storefrontUrl,
          email,
          companyName: companyName || null,
          relationship,
          comments: comments || null,
          failureType,
        }),
      });

      const data = (await response.json()) as { message?: string; error?: string };

      if (!response.ok) {
        setStatus("error");
        setMessage(data.error ?? "Unable to submit your request.");
        return;
      }

      setStatus("success");
      setMessage(
        data.message ??
          "Your storefront review request has been received. Merchant Signals will evaluate whether support can be improved for this storefront in a future release.",
      );
      trackStorefrontReviewSubmitted({
        domain: storefrontUrl,
        failureType,
        relationship,
      });
    } catch {
      setStatus("error");
      setMessage("Unable to submit your request.");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-labelledby="storefront-review-title"
        aria-modal="true"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-card-border bg-card p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        {status === "success" ? (
          <>
            <h2 id="storefront-review-title" className="text-lg font-semibold text-text-primary">
              Thank You
            </h2>
            <p className="mt-3 text-sm leading-6 text-text-secondary">{message}</p>
            <p className="mt-3 text-sm leading-6 text-text-secondary">
              If meaningful progress is made, we may notify you using the email address provided.
            </p>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg bg-blue-900 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 dark:bg-blue-700 dark:hover:bg-blue-600"
              >
                Close
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 id="storefront-review-title" className="text-lg font-semibold text-text-primary">
              Request Storefront Review
            </h2>
            <p className="mt-2 text-sm text-text-secondary">
              Tell us about this storefront so we can evaluate future support improvements.
            </p>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label htmlFor="review-storefront-url" className="text-sm font-medium text-text-secondary">
                  Storefront URL
                </label>
                <input
                  id="review-storefront-url"
                  type="text"
                  readOnly
                  value={storefrontUrl}
                  className="mt-1 w-full rounded-lg border border-card-border bg-card-muted px-3 py-2 text-sm text-text-primary"
                />
              </div>

              <div>
                <label htmlFor="review-email" className="text-sm font-medium text-text-secondary">
                  Email Address <span className="text-rose-600">*</span>
                </label>
                <input
                  id="review-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm text-text-primary"
                />
              </div>

              <div>
                <label htmlFor="review-company" className="text-sm font-medium text-text-secondary">
                  Company Name
                </label>
                <input
                  id="review-company"
                  type="text"
                  value={companyName}
                  onChange={(event) => setCompanyName(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm text-text-primary"
                />
              </div>

              <div>
                <label htmlFor="review-relationship" className="text-sm font-medium text-text-secondary">
                  Relationship To Storefront <span className="text-rose-600">*</span>
                </label>
                <select
                  id="review-relationship"
                  required
                  value={relationship}
                  onChange={(event) =>
                    setRelationship(event.target.value as StorefrontReviewRelationship)
                  }
                  className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm text-text-primary"
                >
                  {STOREFRONT_REVIEW_RELATIONSHIPS.map((option) => (
                    <option key={option} value={option}>
                      {STOREFRONT_REVIEW_RELATIONSHIP_LABELS[option]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="review-comments" className="text-sm font-medium text-text-secondary">
                  Comments
                </label>
                <textarea
                  id="review-comments"
                  rows={4}
                  value={comments}
                  onChange={(event) => setComments(event.target.value)}
                  placeholder="Share platform details, access constraints, or context that may help us evaluate support."
                  className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm text-text-primary"
                />
              </div>

              {message ? (
                <p
                  className={`text-sm ${
                    status === "error"
                      ? "text-rose-700 dark:text-rose-300"
                      : "text-text-secondary"
                  }`}
                >
                  {message}
                </p>
              ) : null}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-card-border px-3 py-2 text-sm font-medium text-text-primary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="rounded-lg bg-blue-900 px-3 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-60 dark:bg-blue-700 dark:hover:bg-blue-600"
                >
                  {status === "loading" ? "Submitting…" : "Submit Request"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

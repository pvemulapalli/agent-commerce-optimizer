"use client";

import { EmailSignupForm } from "@/components/email-signup-form";
import { useState } from "react";

function MailIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="none" stroke="currentColor" strokeWidth="2">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 6h16v12H4V6zm0 0 8 7 8-7"
      />
    </svg>
  );
}

export function HeaderNewsletterButton({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          compact
            ? "inline-flex items-center gap-2 rounded-lg px-3 py-3 text-base font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
            : "inline-flex items-center justify-center rounded-md p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
        }
        aria-label="Subscribe for product updates"
        title="Subscribe for updates"
      >
        <MailIcon className="h-5 w-5" />
        {compact ? <span>Product updates</span> : null}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4"
          role="presentation"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-labelledby="newsletter-dialog-title"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl border border-card-border bg-card p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="newsletter-dialog-title" className="text-lg font-semibold text-text-primary">
              Get product updates
            </h2>
            <div className="mt-4">
              <EmailSignupForm idPrefix="header-newsletter" />
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-card-border px-3 py-2 text-sm font-medium text-text-primary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

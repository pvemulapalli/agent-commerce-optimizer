"use client";

import type { StorefrontPasswordDiagnostic } from "@/lib/storefront-password-diagnostics";
import { STOREFRONT_PASSWORD_ACTIONS } from "@/lib/storefront-password-diagnostics";
import { inputClass } from "@/lib/theme-classes";
import { useState } from "react";

export function StorefrontPasswordNotice({
  diagnostic,
  loading,
  onSubmitPassword,
  onScanAnother,
}: {
  diagnostic: StorefrontPasswordDiagnostic;
  loading: boolean;
  onSubmitPassword: (password: string) => void;
  onScanAnother: () => void;
}) {
  const [password, setPassword] = useState("");

  return (
    <div className="mt-6 rounded-2xl border border-violet-200 bg-violet-50/80 p-6 dark:border-violet-500/30 dark:bg-violet-950/40">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="text-lg font-semibold text-violet-950 dark:text-violet-100">
          {diagnostic.title}
        </h2>
        <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-violet-900 dark:bg-violet-900/60 dark:text-violet-100">
          Shopify pre-launch
        </span>
      </div>

      <p className="mt-3 text-sm leading-7 text-violet-900 dark:text-violet-100/90">
        {diagnostic.meaning}
      </p>

      <dl className="mt-4 space-y-4 text-sm">
        <div>
          <dt className="font-semibold text-violet-950 dark:text-violet-100">What you can do</dt>
          <dd className="mt-2">
            <ul className="space-y-2 leading-7 text-violet-900 dark:text-violet-100/90">
              {STOREFRONT_PASSWORD_ACTIONS.map((action) => (
                <li key={action} className="flex gap-2">
                  <span aria-hidden>•</span>
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          </dd>
        </div>
      </dl>

      <form
        className="mt-6 space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (password.trim()) {
            onSubmitPassword(password.trim());
          }
        }}
      >
        <label className="block text-sm font-medium text-violet-950 dark:text-violet-100">
          Storefront password
          <input
            type="password"
            autoComplete="off"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={loading}
            className={`mt-2 w-full max-w-md py-3 ${inputClass}`}
            placeholder="Enter Shopify storefront password"
          />
        </label>
        {diagnostic.invalidPassword ? (
          <p className="text-sm text-rose-700 dark:text-rose-300">{diagnostic.message}</p>
        ) : null}
        <div className="flex flex-wrap gap-3 pt-1">
          <button
            type="submit"
            disabled={loading || !password.trim()}
            className="inline-flex items-center justify-center rounded-lg bg-violet-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-950 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-violet-700 dark:hover:bg-violet-600"
          >
            {loading ? "Unlocking & assessing…" : "Continue assessment"}
          </button>
          <button
            type="button"
            onClick={onScanAnother}
            disabled={loading}
            className="inline-flex items-center justify-center rounded-lg border border-violet-300 px-5 py-2.5 text-sm font-semibold text-violet-900 hover:bg-violet-100 disabled:opacity-60 dark:border-violet-600 dark:text-violet-100 dark:hover:bg-violet-900/40"
          >
            Try Another Site
          </button>
        </div>
      </form>
    </div>
  );
}

"use client";

import { ScanningRestrictedNotice } from "@/components/scanning-restricted-notice";
import {
  TurnstileWidget,
  shouldShowTurnstileWidget,
  getClientTurnstileSiteKey,
} from "@/components/turnstile-widget";
import { isBannedDomainError } from "@/lib/banned-domain-messages";
import { inputClass } from "@/lib/theme-classes";

const BENEFITS = [
  "Live storefront crawl analysis",
  "Evidence-backed optimization findings",
  "Structured data and policy review",
  "Prioritized improvement recommendations",
  "Downloadable fix files",
];

export function AuditHero({
  url,
  loading,
  error,
  turnstileToken,
  onUrlChange,
  onSubmit,
  onTurnstileTokenChange,
  onScanAnother,
}: {
  url: string;
  loading: boolean;
  error: string | null;
  turnstileToken: string | null;
  onUrlChange: (url: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onTurnstileTokenChange: (token: string | null) => void;
  onScanAnother: () => void;
}) {
  const turnstileEnabled = shouldShowTurnstileWidget();
  const turnstileSiteKey = getClientTurnstileSiteKey();
  const turnstileRequired = turnstileEnabled && Boolean(turnstileSiteKey);
  const submitDisabled =
    loading || !url.trim() || (turnstileRequired && !turnstileToken);
  const restrictedDomain = isBannedDomainError(error);

  return (
    <section className="overflow-hidden rounded-2xl border border-card-border bg-card shadow-sm">
      <div className="border-b border-card-border bg-card-muted px-6 py-4 sm:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-text-secondary">
          AI Commerce Optimization Platform
        </p>
      </div>

      <div className="px-6 py-10 sm:px-8 sm:py-12 lg:px-10">
        <h1 className="text-3xl font-semibold tracking-tight text-text-primary sm:text-4xl lg:text-[2.125rem] lg:leading-tight xl:text-5xl">
          Optimize Your Store For AI Commerce
        </h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-text-secondary">
          Commerce Optimizer helps merchants understand how AI systems and shopping
          agents discover, interpret, and interact with their storefronts. Analyze
          machine-readable signals, uncover optimization opportunities, and receive
          evidence-backed recommendations to improve AI commerce visibility.
        </p>
        <p className="mt-4 max-w-3xl text-base leading-7 text-text-secondary">
          Most tools tell you whether you&apos;re visible. Commerce Optimizer helps
          you understand why and shows you how to improve.
        </p>

        <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map((benefit) => (
            <li
              key={benefit}
              className="flex items-start gap-2 rounded-lg border border-card-border bg-card-muted px-4 py-3 text-sm text-text-secondary"
            >
              <span className="mt-0.5 text-emerald-600 dark:text-emerald-400" aria-hidden>
                ✓
              </span>
              <span>{benefit}</span>
            </li>
          ))}
        </ul>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <label htmlFor="website-url" className="block text-sm font-medium text-text-primary">
            Store URL
          </label>
          <p className="mt-1 text-sm text-text-secondary">
            Enter a domain like <span className="font-mono">mystore.com</span> or a full URL with{" "}
            <span className="font-mono">https://mystore.com</span>
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              id="website-url"
              type="text"
              inputMode="url"
              autoComplete="url"
              placeholder="yourstore.com"
              value={url}
              onChange={(event) => onUrlChange(event.target.value)}
              required
              className={`min-w-0 flex-1 py-3.5 text-base ${inputClass}`}
            />
            <button
              type="submit"
              disabled={submitDisabled}
              className="inline-flex shrink-0 items-center justify-center rounded-lg bg-blue-900 px-8 py-3.5 text-base font-semibold text-white hover:bg-blue-950 disabled:cursor-not-allowed disabled:bg-slate-400 dark:disabled:bg-slate-600"
            >
              {loading ? "Running Audit…" : "Run Audit"}
            </button>
          </div>

          {turnstileRequired && turnstileSiteKey && (
            <TurnstileWidget
              siteKey={turnstileSiteKey}
              onTokenChange={onTurnstileTokenChange}
            />
          )}
        </form>

        {loading && (
          <div className="mt-6 rounded-lg border border-card-border bg-card-muted px-4 py-3 text-sm text-text-secondary">
            Crawling discovery files, parsing sitemaps, and analyzing storefront
            signals…
          </div>
        )}

        {restrictedDomain ? (
          <ScanningRestrictedNotice onScanAnother={onScanAnother} />
        ) : null}

        {error && !restrictedDomain ? (
          <div className="mt-6 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-500/40 dark:bg-rose-950/50 dark:text-rose-200">
            {error}
          </div>
        ) : null}
      </div>
    </section>
  );
}

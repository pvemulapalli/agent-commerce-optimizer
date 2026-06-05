"use client";

import { NonEcommerceNotice } from "@/components/non-ecommerce-notice";
import { ScanningRestrictedNotice } from "@/components/scanning-restricted-notice";
import {
  TurnstileWidget,
  shouldShowTurnstileWidget,
  getClientTurnstileSiteKey,
} from "@/components/turnstile-widget";
import { isBannedDomainError } from "@/lib/banned-domain-messages";
import { FREE_SCAN_PRIMARY, FREE_SCAN_SECONDARY } from "@/lib/scan-messaging";
import { inputClass } from "@/lib/theme-classes";

const BENEFITS = [
  "Live storefront crawl",
  "Evidence-backed findings",
  "Generated fix files",
];

function ScanForm({
  url,
  loading,
  turnstileToken,
  onUrlChange,
  onSubmit,
  onTurnstileTokenChange,
  inputId = "website-url",
  ctaLabel = "Run Free Audit",
}: {
  url: string;
  loading: boolean;
  turnstileToken: string | null;
  onUrlChange: (url: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onTurnstileTokenChange: (token: string | null) => void;
  inputId?: string;
  ctaLabel?: string;
}) {
  const turnstileEnabled = shouldShowTurnstileWidget();
  const turnstileSiteKey = getClientTurnstileSiteKey();
  const turnstileRequired = turnstileEnabled && Boolean(turnstileSiteKey);
  const submitDisabled =
    loading || !url.trim() || (turnstileRequired && !turnstileToken);

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <label htmlFor={inputId} className="sr-only">
        Enter ecommerce URL
      </label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          id={inputId}
          type="text"
          inputMode="url"
          autoComplete="url"
          placeholder="Enter ecommerce URL"
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
          {loading ? "Running Audit…" : ctaLabel}
        </button>
      </div>

      <p className="text-sm text-text-secondary">
        <span className="font-medium text-text-primary">{FREE_SCAN_PRIMARY}</span>{" "}
        {FREE_SCAN_SECONDARY}
      </p>

      {turnstileRequired && turnstileSiteKey && (
        <TurnstileWidget siteKey={turnstileSiteKey} onTokenChange={onTurnstileTokenChange} />
      )}
    </form>
  );
}

export function AuditHero({
  url,
  loading,
  error,
  nonEcommerceMessage,
  turnstileToken,
  onUrlChange,
  onSubmit,
  onTurnstileTokenChange,
  onScanAnother,
}: {
  url: string;
  loading: boolean;
  error: string | null;
  nonEcommerceMessage: string | null;
  turnstileToken: string | null;
  onUrlChange: (url: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onTurnstileTokenChange: (token: string | null) => void;
  onScanAnother: () => void;
}) {
  const restrictedDomain = isBannedDomainError(error);

  return (
    <section className="overflow-hidden rounded-2xl border border-card-border bg-card shadow-sm">
      <div className="border-b border-card-border bg-card-muted px-6 py-4 sm:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-text-secondary">
          AI Commerce Optimization Platform
        </p>
      </div>

      <div className="px-6 py-6 sm:px-8 sm:py-10 lg:px-10">
        {/* Mobile: scan-first above the fold */}
        <div className="lg:hidden">
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
            Optimize Your Store for AI Commerce
          </h1>
          <p className="mt-3 text-base leading-7 text-text-secondary">
            See whether AI systems can discover and understand your catalog, policies,
            and merchant information.
          </p>

          <div className="mt-5">
            <ScanForm
              url={url}
              loading={loading}
              turnstileToken={turnstileToken}
              onUrlChange={onUrlChange}
              onSubmit={onSubmit}
              onTurnstileTokenChange={onTurnstileTokenChange}
              inputId="website-url-mobile"
            />
          </div>
        </div>

        {/* Desktop: richer hero, CTA still prominent */}
        <div className="hidden lg:block">
          <h1 className="text-4xl font-semibold tracking-tight text-text-primary xl:text-5xl">
            Optimize Your Store For AI Commerce
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-text-secondary">
            Live storefront crawl with evidence-backed findings, recommended fixes, and
            downloadable assets — free to try, no signup required.
          </p>
          <p className="mt-4 max-w-3xl text-base leading-7 text-text-secondary">
            Most tools tell you whether you&apos;re visible. Commerce Optimizer helps you
            understand why and what to fix on your storefront.
          </p>

          <div className="mt-8">
            <ScanForm
              url={url}
              loading={loading}
              turnstileToken={turnstileToken}
              onUrlChange={onUrlChange}
              onSubmit={onSubmit}
              onTurnstileTokenChange={onTurnstileTokenChange}
            />
          </div>

          <ul className="mt-8 flex flex-wrap gap-3">
            {BENEFITS.map((benefit) => (
              <li
                key={benefit}
                className="flex items-center gap-2 rounded-lg border border-card-border bg-card-muted px-4 py-2.5 text-sm text-text-secondary"
              >
                <span className="text-emerald-600 dark:text-emerald-400" aria-hidden>
                  ✓
                </span>
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
        </div>

        {loading && (
          <div className="mt-6 rounded-lg border border-card-border bg-card-muted px-4 py-3 text-sm text-text-secondary">
            Crawling discovery files, parsing sitemaps, and analyzing storefront
            signals…
          </div>
        )}

        {restrictedDomain ? (
          <ScanningRestrictedNotice onScanAnother={onScanAnother} />
        ) : null}

        {nonEcommerceMessage ? (
          <NonEcommerceNotice
            message={nonEcommerceMessage}
            onScanAnother={onScanAnother}
          />
        ) : null}

        {error && !restrictedDomain && !nonEcommerceMessage ? (
          <div className="mt-6 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-500/40 dark:bg-rose-950/50 dark:text-rose-200">
            {error}
          </div>
        ) : null}
      </div>
    </section>
  );
}

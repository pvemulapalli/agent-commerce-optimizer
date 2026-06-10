"use client";

import { AuditProgressBar } from "@/components/audit-progress";
import { BotVerificationNotice } from "@/components/bot-verification-notice";
import { NonEcommerceNotice } from "@/components/non-ecommerce-notice";
import { ScanFailureNotice } from "@/components/scan-failure-notice";
import { ScanningRestrictedNotice } from "@/components/scanning-restricted-notice";
import {
  TurnstileWidget,
  shouldShowTurnstileWidget,
  getClientTurnstileSiteKey,
} from "@/components/turnstile-widget";
import { isBannedDomainError } from "@/lib/banned-domain-messages";
import type { BotVerificationDiagnostic } from "@/lib/bot-verification-diagnostics";
import { HERO_HEADLINE, HERO_SUPPORTING_COPY, PARENT_BRAND } from "@/lib/brand";
import { FREE_SCAN_PRIMARY, FREE_SCAN_SECONDARY } from "@/lib/scan-messaging";
import type { ScanFailureDiagnostic } from "@/lib/scan-failure-diagnostics";
import { inputClass } from "@/lib/theme-classes";

const BENEFITS = [
  "Live storefront crawl",
  "Evidence-backed findings",
  "Downloadable fixes",
];

function ScanForm({
  url,
  loading,
  turnstileToken,
  onUrlChange,
  onSubmit,
  onTurnstileTokenChange,
  inputId = "website-url",
  ctaLabel = "Run Free Scan",
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
          {loading ? "Running Scan…" : ctaLabel}
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
  botVerificationDiagnostic,
  scanFailureDiagnostic,
  turnstileToken,
  scanStartedAt,
  onUrlChange,
  onSubmit,
  onTurnstileTokenChange,
  onScanAnother,
}: {
  url: string;
  loading: boolean;
  error: string | null;
  nonEcommerceMessage: string | null;
  botVerificationDiagnostic: BotVerificationDiagnostic | null;
  scanFailureDiagnostic: ScanFailureDiagnostic | null;
  turnstileToken: string | null;
  scanStartedAt: number | null;
  onUrlChange: (url: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onTurnstileTokenChange: (token: string | null) => void;
  onScanAnother: () => void;
}) {
  const restrictedDomain = isBannedDomainError(error);

  return (
    <section className="overflow-hidden rounded-2xl border border-card-border bg-card shadow-sm">
      <div className="px-6 py-6 sm:px-8 lg:px-10">
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-text-secondary/70">
          {PARENT_BRAND}
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-text-primary sm:text-3xl lg:text-4xl">
          {HERO_HEADLINE}
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-6 text-text-secondary">
          {HERO_SUPPORTING_COPY}
        </p>

        <div className="mt-5 lg:mt-6">
          <ScanForm
            url={url}
            loading={loading}
            turnstileToken={turnstileToken}
            onUrlChange={onUrlChange}
            onSubmit={onSubmit}
            onTurnstileTokenChange={onTurnstileTokenChange}
          />
        </div>

        <ul className="mt-5 flex flex-wrap gap-2.5">
          {BENEFITS.map((benefit) => (
            <li
              key={benefit}
              className="flex items-center gap-2 rounded-lg border border-card-border bg-card-muted px-3.5 py-2 text-sm text-text-secondary"
            >
              <span className="text-emerald-600 dark:text-emerald-400" aria-hidden>
                ✓
              </span>
              <span>{benefit}</span>
            </li>
          ))}
        </ul>

        {loading ? <AuditProgressBar startedAt={scanStartedAt} /> : null}

        {restrictedDomain ? (
          <ScanningRestrictedNotice onScanAnother={onScanAnother} />
        ) : null}

        {botVerificationDiagnostic ? (
          <BotVerificationNotice
            diagnostic={botVerificationDiagnostic}
            onScanAnother={onScanAnother}
          />
        ) : null}

        {scanFailureDiagnostic ? (
          <ScanFailureNotice
            diagnostic={scanFailureDiagnostic}
            onScanAnother={onScanAnother}
          />
        ) : null}

        {nonEcommerceMessage ? (
          <NonEcommerceNotice
            message={nonEcommerceMessage}
            onScanAnother={onScanAnother}
          />
        ) : null}

        {error &&
        !restrictedDomain &&
        !nonEcommerceMessage &&
        !botVerificationDiagnostic &&
        !scanFailureDiagnostic ? (
          <div className="mt-5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-500/40 dark:bg-rose-950/50 dark:text-rose-200">
            {error}
          </div>
        ) : null}
      </div>
    </section>
  );
}

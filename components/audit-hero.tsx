"use client";

import {
  TurnstileWidget,
  shouldShowTurnstileWidget,
  getClientTurnstileSiteKey,
} from "@/components/turnstile-widget";

const EXAMPLE_MERCHANTS = [
  { name: "Gymshark", url: "https://www.gymshark.com" },
  { name: "Allbirds", url: "https://www.allbirds.com" },
  { name: "SKIMS", url: "https://skims.com" },
];

export function AuditHero({
  url,
  loading,
  error,
  turnstileToken,
  onUrlChange,
  onSubmit,
  onExampleSelect,
  onTurnstileTokenChange,
}: {
  url: string;
  loading: boolean;
  error: string | null;
  turnstileToken: string | null;
  onUrlChange: (url: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onExampleSelect: (url: string) => void;
  onTurnstileTokenChange: (token: string | null) => void;
}) {
  const turnstileEnabled = shouldShowTurnstileWidget();
  const turnstileSiteKey = getClientTurnstileSiteKey();
  const turnstileRequired = turnstileEnabled && Boolean(turnstileSiteKey);
  const submitDisabled =
    loading || !url.trim() || (turnstileRequired && !turnstileToken);

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-6 py-4 sm:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
          Merchant audit
        </p>
      </div>

      <div className="px-6 py-10 sm:px-8 sm:py-12 lg:px-10">
        <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
          Will AI agents find your products?
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
          SEO helps search engines discover content. AIO (AI Optimization) helps AI
          systems like ChatGPT, Claude, Gemini, and Perplexity discover and
          understand products, catalogs, merchant information, and policies.
        </p>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
          This tool audits ecommerce websites for AI discoverability — evidence-backed
          signals that show how easily agents can find and interpret your storefront.
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <label htmlFor="website-url" className="block text-sm font-medium text-slate-700">
            Store URL
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              id="website-url"
              type="url"
              inputMode="url"
              placeholder="https://yourstore.com"
              value={url}
              onChange={(event) => onUrlChange(event.target.value)}
              required
              className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-4 py-3.5 text-base text-slate-900 outline-none focus:border-blue-900 focus:ring-2 focus:ring-blue-900/10"
            />
            <button
              type="submit"
              disabled={submitDisabled}
              className="inline-flex shrink-0 items-center justify-center rounded-lg bg-blue-900 px-8 py-3.5 text-base font-semibold text-white hover:bg-blue-950 disabled:cursor-not-allowed disabled:bg-slate-400"
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

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <span className="text-sm text-slate-500">Examples:</span>
          {EXAMPLE_MERCHANTS.map((merchant) => (
            <button
              key={merchant.url}
              type="button"
              disabled={loading || (turnstileRequired && !turnstileToken)}
              onClick={() => onExampleSelect(merchant.url)}
              className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-slate-300 hover:bg-white disabled:opacity-50"
            >
              {merchant.name}
            </button>
          ))}
        </div>

        {loading && (
          <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            Crawling discovery files, parsing sitemaps, and analyzing storefront
            signals…
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {error}
          </div>
        )}
      </div>
    </section>
  );
}

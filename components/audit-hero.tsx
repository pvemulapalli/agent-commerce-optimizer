"use client";

import {
  TurnstileWidget,
  shouldShowTurnstileWidget,
  getClientTurnstileSiteKey,
} from "@/components/turnstile-widget";

const BENEFITS = [
  "AI Discoverability Analysis",
  "AI Commerce Readiness Score",
  "Structured Data Review",
  "AI Agent Readiness Roadmap",
  "Downloadable Fix Files",
];

export function AuditHero({
  url,
  loading,
  error,
  turnstileToken,
  onUrlChange,
  onSubmit,
  onTurnstileTokenChange,
}: {
  url: string;
  loading: boolean;
  error: string | null;
  turnstileToken: string | null;
  onUrlChange: (url: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onTurnstileTokenChange: (token: string | null) => void;
}) {
  const turnstileEnabled = shouldShowTurnstileWidget();
  const turnstileSiteKey = getClientTurnstileSiteKey();
  const turnstileRequired = turnstileEnabled && Boolean(turnstileSiteKey);
  const submitDisabled =
    loading || !url.trim() || (turnstileRequired && !turnstileToken);

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-slate-50/70 px-6 py-4 sm:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
          AI Commerce Discoverability — not SEO
        </p>
      </div>

      <div className="px-6 py-10 sm:px-8 sm:py-12 lg:px-10">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl lg:text-[2.125rem] lg:leading-tight lg:whitespace-nowrap xl:text-5xl">
          Can AI Shopping Agents Discover Your Store?
        </h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">
          Analyze your ecommerce site and discover how easily ChatGPT, Claude, Gemini,
          Perplexity, Copilot, and AI shopping agents can understand your products,
          catalog, policies, and merchant information.
        </p>

        <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map((benefit) => (
            <li
              key={benefit}
              className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
            >
              <span className="mt-0.5 text-emerald-600" aria-hidden>
                ✓
              </span>
              <span>{benefit}</span>
            </li>
          ))}
        </ul>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <label htmlFor="website-url" className="block text-sm font-medium text-slate-700">
            Store URL
          </label>
          <p className="mt-1 text-sm text-slate-500">
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

"use client";

const EXAMPLE_MERCHANTS = [
  { name: "Gymshark", url: "https://www.gymshark.com" },
  { name: "Allbirds", url: "https://www.allbirds.com" },
  { name: "SKIMS", url: "https://skims.com" },
];

export function AuditHero({
  url,
  loading,
  error,
  onUrlChange,
  onSubmit,
  onExampleSelect,
}: {
  url: string;
  loading: boolean;
  error: string | null;
  onUrlChange: (url: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onExampleSelect: (url: string) => void;
}) {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-zinc-200/80 bg-white shadow-lg shadow-zinc-200/50">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(99,102,241,0.12),_transparent_55%),radial-gradient(ellipse_at_bottom_left,_rgba(139,92,246,0.1),_transparent_50%)]"
      />

      <div className="relative px-6 py-12 sm:px-10 sm:py-14 lg:px-14 lg:py-16">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-600">
          AI Commerce Discoverability
        </p>
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-zinc-900 sm:text-5xl lg:text-[3.25rem] lg:leading-[1.1]">
          Will AI agents find your products?
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-zinc-600">
          Audit your ecommerce site and discover how easily AI systems can
          understand your catalog, policies, products, and merchant information.
        </p>

        <form onSubmit={onSubmit} className="mt-10 space-y-4">
          <label htmlFor="website-url" className="sr-only">
            Website URL
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
              className="min-w-0 flex-1 rounded-xl border border-zinc-300 bg-white px-4 py-3.5 text-base text-zinc-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
            />
            <button
              type="submit"
              disabled={loading || !url.trim()}
              className="inline-flex shrink-0 items-center justify-center rounded-xl bg-indigo-600 px-8 py-3.5 text-base font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-zinc-400"
            >
              {loading ? "Running Audit…" : "Run Audit"}
            </button>
          </div>
        </form>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <span className="text-sm text-zinc-500">Try an example:</span>
          {EXAMPLE_MERCHANTS.map((merchant) => (
            <button
              key={merchant.url}
              type="button"
              disabled={loading}
              onClick={() => onExampleSelect(merchant.url)}
              className="rounded-full border border-zinc-200 bg-zinc-50 px-3.5 py-1.5 text-sm font-medium text-zinc-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-800 disabled:opacity-50"
            >
              {merchant.name}
            </button>
          ))}
        </div>

        {loading && (
          <div className="mt-6 rounded-xl border border-indigo-100 bg-indigo-50/80 px-4 py-3 text-sm text-indigo-900">
            Crawling discovery files, parsing sitemaps (up to 20 prioritized
            URLs), following trusted support subdomains (up to 10), and
            analyzing storefront signals…
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {error}
          </div>
        )}

        <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-zinc-500">
          <li className="flex items-center gap-2">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Evidence-backed findings
          </li>
          <li className="flex items-center gap-2">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            No LLM or scoring
          </li>
          <li className="flex items-center gap-2">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Free API access
          </li>
        </ul>
      </div>
    </section>
  );
}

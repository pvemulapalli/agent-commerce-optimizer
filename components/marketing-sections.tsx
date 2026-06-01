const AUDIT_ITEMS = [
  {
    title: "Product discovery",
    description:
      "Product pages, collections, pricing signals, and catalog URLs agents need to browse your inventory.",
  },
  {
    title: "Merchant identity",
    description:
      "Organization schema, brand signals, and homepage metadata that establish who you are.",
  },
  {
    title: "Returns policies",
    description:
      "Return and refund pages linked from your storefront or support domains.",
  },
  {
    title: "Shipping information",
    description:
      "Shipping policy pages and delivery details agents use to answer fulfillment questions.",
  },
  {
    title: "FAQ availability",
    description:
      "Help center and FAQ content — plus whether FAQ structured data is present.",
  },
  {
    title: "Structured data",
    description:
      "JSON-LD for products, offers, organization, and FAQPage across crawled pages.",
  },
  {
    title: "AI-readable assets",
    description:
      "llms.txt, robots.txt, sitemaps, and other machine-readable discovery files.",
  },
];

const GENERATED_ASSETS = [
  {
    name: "llms.txt",
    description:
      "A machine-readable index of key merchant URLs — policies, products, and discovery files — for AI crawlers.",
  },
  {
    name: "Schema markup",
    description:
      "Organization, product, and FAQ JSON-LD templates extracted from your site or drafted with TODO placeholders.",
  },
  {
    name: "Merchant profile",
    description:
      "A structured markdown summary of platform signals, support links, and catalog evidence from the crawl.",
  },
  {
    name: "AI-ready files",
    description:
      "Downloadable assets you can review, copy, or publish to improve agent discoverability.",
  },
];

export function MarketingSections() {
  return (
    <div className="space-y-12">
      <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
          Why This Matters
        </p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          AI shopping is growing — visibility depends on machine-readable signals
        </h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <article className="rounded-xl border border-slate-200 bg-slate-50 p-5">
            <h3 className="font-semibold text-slate-900">
              AI shopping is increasing
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              More consumers discover and evaluate products through AI assistants
              and agentic shopping experiences — not just traditional search
              results.
            </p>
          </article>
          <article className="rounded-xl border border-slate-200 bg-slate-50 p-5">
            <h3 className="font-semibold text-slate-900">
              Agents need structured data
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              AI systems rely on machine-readable merchant information — schema
              markup, policy pages, product URLs, and discovery files — to
              understand your catalog accurately.
            </p>
          </article>
          <article className="rounded-xl border border-slate-200 bg-slate-50 p-5">
            <h3 className="font-semibold text-slate-900">Gaps limit visibility</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Missing discoverability signals can limit how confidently agents
              surface your products, policies, and brand in AI-driven commerce
              flows.
            </p>
          </article>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
          What We Audit
        </p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          Evidence-backed checks across your storefront
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          Every finding includes crawled evidence and source URLs — no scores, no
          guesswork, no LLM-generated claims.
        </p>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {AUDIT_ITEMS.map((item) => (
            <li
              key={item.title}
              className="flex gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4"
            >
              <span
                aria-hidden
                className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-900"
              />
              <div className="min-w-0">
                <h3 className="font-medium text-slate-900">{item.title}</h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  {item.description}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
          Generated Assets
        </p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          Turn audit evidence into actionable files
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          After each audit, download drafts built only from crawled evidence.
          TODO placeholders mark facts that were not found — nothing is invented.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {GENERATED_ASSETS.map((asset) => (
            <article
              key={asset.name}
              className="rounded-xl border border-slate-200 bg-slate-50 p-5"
            >
              <h3 className="font-mono text-sm font-semibold text-slate-900">
                {asset.name}
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {asset.description}
              </p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

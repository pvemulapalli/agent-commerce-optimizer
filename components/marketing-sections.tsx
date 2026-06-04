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

const DIFFERENTIATOR_CARDS = [
  {
    title: "Live Store Crawl",
    description:
      "We analyze your actual storefront, product pages, policies, catalog structure, and machine-readable signals.",
  },
  {
    title: "Evidence-Backed Findings",
    description:
      "Every finding includes technical evidence and source URLs from the crawl. No AI-generated assumptions.",
  },
  {
    title: "Actionable Fixes",
    description:
      "See exactly what is missing, why it matters, and how to improve it. Not just a score.",
  },
];

export function MarketingSections() {
  return (
    <div className="space-y-12">
      <section className="rounded-2xl border border-card-border bg-card p-8 shadow-sm sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-text-secondary">
          Why This Matters
        </p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-text-primary sm:text-3xl">
          AI shopping is growing — visibility depends on machine-readable signals
        </h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            {
              title: "AI shopping is increasing",
              body: "More consumers discover and evaluate products through AI assistants and agentic shopping experiences — not just traditional search results.",
            },
            {
              title: "Agents need structured data",
              body: "AI systems rely on machine-readable merchant information — schema markup, policy pages, product URLs, and discovery files — to understand your catalog accurately.",
            },
            {
              title: "Gaps limit visibility",
              body: "Missing discoverability signals can limit how confidently agents surface your products, policies, and brand in AI-driven commerce flows.",
            },
          ].map((item) => (
            <article key={item.title} className="rounded-xl border border-card-border bg-card-muted p-5">
              <h3 className="font-semibold text-text-primary">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-text-secondary">{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-card-border bg-card p-8 shadow-sm sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-text-secondary">
          Platform Differentiator
        </p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-text-primary sm:text-3xl">
          Why Commerce Optimizer Is Different
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-text-secondary sm:text-base">
          Most AI visibility platforms tell you whether you are visible. Commerce
          Optimizer shows exactly why you are not and what to do next.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {DIFFERENTIATOR_CARDS.map((card) => (
            <article key={card.title} className="rounded-xl border border-card-border bg-card-muted p-5">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-text-primary">
                {card.title}
              </h3>
              <p className="mt-3 text-sm leading-6 text-text-secondary">{card.description}</p>
            </article>
          ))}
        </div>
        <div className="mt-8 rounded-xl border border-blue-200 bg-blue-50/70 p-6 dark:border-blue-500/30 dark:bg-blue-950/40">
          <p className="text-sm leading-7 text-blue-950 dark:text-blue-100">
            Most AI visibility tools focus on monitoring visibility. Commerce Optimizer
            focuses on optimization.
          </p>
          <p className="mt-3 text-sm leading-7 text-blue-900 dark:text-blue-100/90">
            We don&apos;t just tell you what is wrong. We show you the evidence and
            recommended fixes.
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-card-border bg-card p-8 shadow-sm sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-text-secondary">
          What We Audit
        </p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-text-primary sm:text-3xl">
          Evidence-backed checks across your storefront
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-text-secondary">
          Every finding includes crawled evidence and source URLs — no guesswork, no
          LLM-generated claims.
        </p>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {AUDIT_ITEMS.map((item) => (
            <li
              key={item.title}
              className="flex gap-3 rounded-xl border border-card-border bg-card-muted p-4"
            >
              <span
                aria-hidden
                className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-900 dark:bg-blue-400"
              />
              <div className="min-w-0">
                <h3 className="font-medium text-text-primary">{item.title}</h3>
                <p className="mt-1 text-sm leading-6 text-text-secondary">
                  {item.description}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-card-border bg-card p-8 shadow-sm sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-text-secondary">
          Generated Assets
        </p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-text-primary sm:text-3xl">
          Turn audit evidence into actionable files
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-text-secondary">
          After each audit, download drafts built only from crawled evidence. TODO
          placeholders mark facts that were not found — nothing is invented.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {GENERATED_ASSETS.map((asset) => (
            <article
              key={asset.name}
              className="rounded-xl border border-card-border bg-card-muted p-5"
            >
              <h3 className="font-mono text-sm font-semibold text-text-primary">
                {asset.name}
              </h3>
              <p className="mt-2 text-sm leading-6 text-text-secondary">
                {asset.description}
              </p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

import { DIFFERENTIATOR_INTRO_COPY } from "@/lib/brand";

const AUDIT_ITEMS = [
  { title: "Product discovery", description: "Catalog URLs, pricing, and product pages." },
  { title: "Merchant identity", description: "Organization schema and homepage metadata." },
  { title: "Policies", description: "Returns, shipping, and support pages linked from the storefront." },
  { title: "FAQ content", description: "Help center pages and FAQ structured data." },
  { title: "Structured data", description: "JSON-LD for products, offers, and organization." },
  { title: "Discovery files", description: "llms.txt, robots.txt, and sitemaps." },
];

const GENERATED_ASSETS = [
  { name: "llms.txt", description: "Machine-readable index of key merchant URLs." },
  { name: "Schema templates", description: "Organization, product, and FAQ JSON-LD drafts." },
  { name: "Merchant profile", description: "Structured summary from crawl evidence." },
  { name: "Readiness report", description: "Downloadable markdown with findings and scores." },
];

const DIFFERENTIATOR_CARDS = [
  {
    title: "Live Storefront Crawl",
    description:
      "We analyze public storefront pages, policies, catalog structure, and machine-readable signals.",
  },
  {
    title: "Evidence You Can Inspect",
    description:
      "Every finding includes the source URLs and crawl evidence behind it.",
  },
  {
    title: "Fixes You Can Use",
    description:
      "Generate llms.txt, merchant profiles, schema templates, and readiness recommendations.",
  },
];

export function MarketingSections() {
  return (
    <div className="space-y-10">
      <section className="rounded-2xl border border-card-border bg-card p-8 shadow-sm sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-text-secondary">
          Differentiator
        </p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-text-primary sm:text-3xl">
          Not Just Visibility. Optimization.
        </h2>
        <p className="mt-4 text-base font-medium leading-7 text-text-primary">
          {DIFFERENTIATOR_INTRO_COPY}
        </p>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-text-secondary sm:text-base">
          Many AI visibility tools monitor whether brands appear in AI answers. Commerce
          Optimizer focuses on the merchant storefront itself: what AI systems can crawl,
          understand, and use.
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
      </section>

      <section className="rounded-2xl border border-card-border bg-card p-8 shadow-sm sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-text-secondary">
          What We Scan
        </p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-text-primary sm:text-3xl">
          Evidence-backed storefront checks
        </h2>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {AUDIT_ITEMS.map((item) => (
            <li
              key={item.title}
              className="rounded-xl border border-card-border bg-card-muted px-4 py-3"
            >
              <h3 className="font-medium text-text-primary">{item.title}</h3>
              <p className="mt-1 text-sm text-text-secondary">{item.description}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-card-border bg-card p-8 shadow-sm sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-text-secondary">
          Generated Assets
        </p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-text-primary sm:text-3xl">
          Downloadable fixes from crawl evidence
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {GENERATED_ASSETS.map((asset) => (
            <article
              key={asset.name}
              className="rounded-xl border border-card-border bg-card-muted p-5"
            >
              <h3 className="font-mono text-sm font-semibold text-text-primary">{asset.name}</h3>
              <p className="mt-2 text-sm text-text-secondary">{asset.description}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

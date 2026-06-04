import { PageHeader } from "@/components/page-header";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About",
  description:
    "Learn about the AI Commerce Optimization Platform — live storefront analysis, evidence-backed findings, and actionable recommendations.",
};

const AUDIT_TOPICS = [
  "Product discovery — pages, pricing, and catalog URLs",
  "Merchant identity — organization schema and homepage metadata",
  "Returns and shipping policies linked from the storefront",
  "FAQ and help center availability, including structured FAQ data",
  "JSON-LD structured data for products, offers, and organization",
  "AI-readable discovery files such as llms.txt, robots.txt, and sitemaps",
];

export default function AboutPage() {
  return (
    <main className="mx-auto w-full min-w-0 max-w-3xl overflow-x-hidden px-6 py-10 lg:px-8 lg:py-14">
      <PageHeader
        eyebrow="About"
        title="AI Commerce Optimization Platform"
        description="Commerce Optimizer helps merchants understand how AI systems discover, interpret, and interact with their storefronts — with evidence-backed findings and recommended fixes."
      />

      <div className="mt-10 space-y-10">
        <section className="rounded-2xl border border-card-border bg-card p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-text-primary">
            What is AI Commerce Optimization?
          </h2>
          <p className="mt-4 text-sm leading-7 text-text-secondary">
            AI Commerce Optimization measures how well an ecommerce site exposes the
            signals AI systems need to find products, understand policies, and
            represent a merchant accurately. As agentic shopping experiences grow,
            visibility depends on structured, machine-readable information — not
            just human-friendly storefront design.
          </p>
        </section>

        <section className="rounded-2xl border border-card-border bg-card p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-text-primary">
            Why machine-readable commerce matters
          </h2>
          <p className="mt-4 text-sm leading-7 text-text-secondary">
            AI assistants and shopping agents crawl public pages, parse schema
            markup, and follow discovery files to answer product, policy, and
            fulfillment questions. When those signals are missing or incomplete,
            agents may skip your catalog, answer incorrectly, or surface
            competitors with clearer machine-readable data.
          </p>
          <p className="mt-4 text-sm leading-7 text-text-secondary">
            Machine-readable commerce is not a replacement for great merchandising
            — it is the layer that lets automated systems participate in the
            discovery process with confidence.
          </p>
        </section>

        <section className="rounded-2xl border border-card-border bg-card p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-text-primary">
            What the platform evaluates
          </h2>
          <p className="mt-4 text-sm leading-7 text-text-secondary">
            Each optimization run crawls public discovery files and prioritized
            storefront pages, then reports evidence-backed findings — Detected,
            Missing, or Needs Review — with source URLs and recommended fixes.
          </p>
          <ul className="mt-6 space-y-3">
            {AUDIT_TOPICS.map((topic) => (
              <li
                key={topic}
                className="flex gap-3 text-sm leading-6 text-text-secondary"
              >
                <span
                  aria-hidden
                  className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-900 dark:bg-blue-400"
                />
                {topic}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <p className="mt-10">
        <Link
          href="/"
          className="text-sm font-medium text-blue-900 hover:underline dark:text-blue-300"
        >
          ← Run an optimization audit
        </Link>
      </p>
    </main>
  );
}

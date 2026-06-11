import { CrawlerPageAnalytics } from "@/components/crawler-page-analytics";
import { PageHeader } from "@/components/page-header";
import {
  CRAWLER_BOT_NAME,
  CRAWLER_CONTACT_EMAIL,
  MERCHANT_SIGNALS_CRAWLER_USER_AGENT,
  SITE_CONTACT_EMAIL,
} from "@/lib/crawler-identity";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: {
    absolute: "Merchant Signals Crawler | MerchantSignalsBot",
  },
  description:
    "Information about MerchantSignalsBot, the crawler used by Merchant Signals to analyze ecommerce storefront readiness for AI commerce and agent discovery.",
  openGraph: {
    title: "Merchant Signals Crawler | MerchantSignalsBot",
    description:
      "Information about MerchantSignalsBot, the crawler used by Merchant Signals to analyze ecommerce storefront readiness for AI commerce and agent discovery.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Merchant Signals Crawler | MerchantSignalsBot",
    description:
      "Information about MerchantSignalsBot, the crawler used by Merchant Signals to analyze ecommerce storefront readiness for AI commerce and agent discovery.",
  },
};

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-8 rounded-2xl border border-card-border bg-card p-6 shadow-sm sm:p-8">
      <h2 className="text-xl font-semibold text-text-primary">{title}</h2>
      <div className="mt-4 space-y-4 text-sm leading-7 text-text-secondary">{children}</div>
    </section>
  );
}

export default function CrawlerPage() {
  return (
    <main className="mx-auto w-full min-w-0 max-w-3xl overflow-x-hidden px-6 py-10 lg:px-8 lg:py-14">
      <CrawlerPageAnalytics />

      <PageHeader eyebrow="Crawler" title="Merchant Signals Crawler" />

      <Section title={`About ${CRAWLER_BOT_NAME}`}>
        <p>
          {CRAWLER_BOT_NAME} is the crawler used by Merchant Signals to analyze ecommerce
          storefronts for AI Commerce Readiness, Agentic Commerce Readiness, storefront
          discoverability, and machine-readable commerce signals.
        </p>
        <p>
          User-Agent:{" "}
          <code className="break-all rounded bg-card-muted px-1.5 py-0.5 font-mono text-xs text-text-primary">
            {MERCHANT_SIGNALS_CRAWLER_USER_AGENT}
          </code>
        </p>
      </Section>

      <Section title="Purpose">
        <p>
          Merchant Signals evaluates public ecommerce storefront content to help merchants
          understand how AI systems, search engines, and commerce agents may discover and
          interpret their storefront.
        </p>
      </Section>

      <Section title={`What ${CRAWLER_BOT_NAME} Does`}>
        <ul className="list-disc space-y-2 pl-5">
          <li>Analyzes publicly accessible storefront pages</li>
          <li>Evaluates structured data</li>
          <li>Evaluates product discoverability</li>
          <li>Evaluates sitemap and robots configuration</li>
          <li>Evaluates AI commerce readiness signals</li>
          <li>Evaluates storefront technology platforms</li>
        </ul>
      </Section>

      <Section title={`What ${CRAWLER_BOT_NAME} Does NOT Do`}>
        <ul className="list-disc space-y-2 pl-5">
          <li>Create accounts</li>
          <li>Log in</li>
          <li>Make purchases</li>
          <li>Submit orders</li>
          <li>Modify carts</li>
          <li>Complete checkout</li>
          <li>Access private systems</li>
          <li>Bypass security controls</li>
        </ul>
      </Section>

      <Section title="Crawler Behavior">
        <ul className="list-disc space-y-2 pl-5">
          <li>Read-only analysis</li>
          <li>Respectful crawl rates</li>
          <li>Public storefront content only</li>
          <li>No automated purchases</li>
          <li>No account creation</li>
        </ul>
      </Section>

      <Section title="Robots and Site Controls">
        <p>
          {CRAWLER_BOT_NAME} respects publicly available site controls and does not attempt to
          circumvent security measures or access restrictions.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          For crawler-related questions, contact{" "}
          <a
            href={`mailto:${CRAWLER_CONTACT_EMAIL}`}
            className="font-medium text-blue-900 hover:underline dark:text-blue-300"
          >
            {CRAWLER_CONTACT_EMAIL}
          </a>
          .
        </p>
        <p>
          For general inquiries, contact{" "}
          <a
            href={`mailto:${SITE_CONTACT_EMAIL}`}
            className="font-medium text-blue-900 hover:underline dark:text-blue-300"
          >
            {SITE_CONTACT_EMAIL}
          </a>
          .
        </p>
      </Section>

      <Section title="Opt-Out">
        <p>
          If you do not wish {CRAWLER_BOT_NAME} to access your storefront, contact us at{" "}
          <a
            href={`mailto:${CRAWLER_CONTACT_EMAIL}`}
            className="font-medium text-blue-900 hover:underline dark:text-blue-300"
          >
            {CRAWLER_CONTACT_EMAIL}
          </a>{" "}
          or{" "}
          <a
            href={`mailto:${SITE_CONTACT_EMAIL}`}
            className="font-medium text-blue-900 hover:underline dark:text-blue-300"
          >
            {SITE_CONTACT_EMAIL}
          </a>
          .
        </p>
      </Section>

      <Section title="Future Verification Information">
        <p>Verification information may be published here in the future.</p>
        <p className="text-text-secondary">
          This may include crawler IP ranges, crawler verification methods, and support
          documentation for merchants and platform vendors.
        </p>
      </Section>

      <p className="mt-10">
        <Link
          href="/"
          className="text-sm font-medium text-blue-900 hover:underline dark:text-blue-300"
        >
          ← Back to Commerce Optimizer
        </Link>
      </p>
    </main>
  );
}

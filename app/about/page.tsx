import { PageHeader } from "@/components/page-header";
import {
  ABOUT_MERCHANT_SIGNALS_INTRO,
  ABOUT_PRODUCT_INTRO,
  PARENT_BRAND,
  PRODUCT_NAME,
} from "@/lib/brand";
import { PROJECT_DISCLAIMER } from "@/lib/disclaimer";
import {
  FREE_SCAN_PRIMARY,
  FREE_SCAN_SECONDARY,
  FUTURE_AUTOMATION_NOTE,
  LOW_SCORE_SCOPE_NOTE,
  LOW_SCORE_SCOPE_NOTE_SECONDARY,
} from "@/lib/scan-messaging";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About",
  description:
    "About Merchant Signals and Commerce Optimizer — machine-readable commerce signals, storefront discoverability, and AI commerce readiness.",
};

const AUDIT_DOES = [
  "Crawls public storefront pages and discovery files",
  "Checks catalog discoverability and product URL signals",
  "Reviews structured data on crawled pages",
  "Checks policy and support page discoverability",
  "Evaluates agent access signals such as robots.txt and llms.txt",
  "Generates downloadable fix drafts from observed evidence",
];

const AUDIT_DOES_NOT = [
  "Does not measure brand authority or reputation",
  "Does not measure how often ChatGPT, Gemini, or other assistants recommend a brand",
  "Does not measure paid search, SEO rankings, reviews, or social signals",
  "Does not replace enterprise monitoring or visibility platforms",
];

export default function AboutPage() {
  return (
    <main className="mx-auto w-full min-w-0 max-w-3xl overflow-x-hidden px-6 py-10 lg:px-8 lg:py-14">
      <PageHeader
        eyebrow="About"
        title={`About ${PARENT_BRAND}`}
        description={
          <>
            <span className="block">{ABOUT_MERCHANT_SIGNALS_INTRO}</span>
            <span className="mt-4 block">{ABOUT_PRODUCT_INTRO}</span>
          </>
        }
      />

      <section className="mt-10 rounded-2xl border border-card-border bg-card p-6 shadow-sm sm:p-8">
        <h2 className="text-xl font-semibold text-text-primary">About {PRODUCT_NAME}</h2>
        <p className="mt-4 text-sm leading-7 text-text-secondary">
          {PRODUCT_NAME} is a focused storefront audit that crawls public pages and discovery
          files to show whether AI systems can discover catalog structure, policies, schema, and
          merchant facts — based on observed evidence, not visibility hype.
        </p>
      </section>

      <section className="mt-8 rounded-2xl border border-card-border bg-card p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <Image
            src="/about/creator-headshot.jpg"
            alt="Praveen Vemulapalli"
            width={240}
            height={240}
            className="h-28 w-28 shrink-0 rounded-full border border-card-border bg-card-muted object-cover"
            priority
          />
          <div className="min-w-0">
            <h2 className="text-xl font-semibold text-text-primary">About the Creator</h2>
            <p className="mt-1 text-sm font-medium text-text-secondary">Praveen Vemulapalli</p>
            <div className="mt-4 space-y-3 text-sm leading-7 text-text-secondary">
              <p>
                I have spent years working on payments infrastructure, ecommerce platforms, and
                merchant acceptance — the systems that move money, onboard sellers, and connect
                storefronts to how customers actually pay and buy.
              </p>
              <p>
                Commerce Optimizer grew out of a practical question in the AI commerce shift: when
                assistants and agents try to discover products, policies, and merchant facts from a
                public site, what can they actually crawl and understand?
              </p>
              <p>
                This project applies that merchant and platform background to a focused storefront
                audit — evidence from live crawls, not visibility hype — so operators can see what
                is machine-readable today and what to improve next.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-8 rounded-xl border border-card-border bg-card-muted px-5 py-4 text-sm leading-7 text-text-secondary">
        <p className="font-medium text-text-primary">{FREE_SCAN_PRIMARY}</p>
        <p className="mt-2">{FREE_SCAN_SECONDARY}</p>
      </div>

      <div className="mt-10 space-y-10">
        <section className="rounded-2xl border border-card-border bg-card p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-text-primary">Why I Built This</h2>
          <p className="mt-4 text-sm leading-7 text-text-secondary">
            AI commerce is creating a new discovery path for merchants. I built Commerce
            Optimizer to understand whether storefronts expose the machine-readable signals
            AI systems need — catalog structure, policies, schema, and discovery files —
            based on what can actually be crawled from the public site.
          </p>
        </section>

        <section className="rounded-2xl border border-card-border bg-card p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-text-primary">What The Audit Does</h2>
          <ul className="mt-6 space-y-3">
            {AUDIT_DOES.map((item) => (
              <li key={item} className="flex gap-3 text-sm leading-6 text-text-secondary">
                <span
                  aria-hidden
                  className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-900 dark:bg-blue-400"
                />
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-card-border bg-card p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-text-primary">What The Audit Does Not Do</h2>
          <ul className="mt-6 space-y-3">
            {AUDIT_DOES_NOT.map((item) => (
              <li key={item} className="flex gap-3 text-sm leading-6 text-text-secondary">
                <span
                  aria-hidden
                  className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400 dark:bg-slate-500"
                />
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-card-border bg-card p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-text-primary">Evidence-Backed Approach</h2>
          <p className="mt-4 text-sm leading-7 text-text-secondary">
            Every score is derived from observed crawl evidence, not guesses. Findings
            include source URLs and technical evidence you can inspect. Generated assets
            use TODO placeholders when facts were not found — nothing is invented.
          </p>
        </section>

        <section className="rounded-2xl border border-amber-200 bg-amber-50/80 p-8 dark:border-amber-500/40 dark:bg-amber-950/40">
          <h2 className="text-xl font-semibold text-amber-950 dark:text-amber-100">
            Why popular brands can score low
          </h2>
          <p className="mt-4 text-sm leading-7 text-amber-950 dark:text-amber-100">
            {LOW_SCORE_SCOPE_NOTE}
          </p>
          <p className="mt-3 text-sm leading-7 text-amber-900 dark:text-amber-100/90">
            {LOW_SCORE_SCOPE_NOTE_SECONDARY}
          </p>
        </section>

        <section className="rounded-2xl border border-card-border bg-card p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-text-primary">Future direction</h2>
          <p className="mt-4 text-sm leading-7 text-text-secondary">{FUTURE_AUTOMATION_NOTE}</p>
          <p className="mt-3 text-sm leading-7 text-text-secondary">
            Commerce Optimizer does not modify merchant sites and does not promise
            automated remediation.
          </p>
        </section>

        <section className="rounded-2xl border border-card-border bg-card-muted p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">
            Personal project disclaimer
          </h2>
          <p className="mt-3 text-sm leading-7 text-text-secondary">{PROJECT_DISCLAIMER}</p>
        </section>
      </div>

      <p className="mt-10">
        <Link
          href="/"
          className="text-sm font-medium text-blue-900 hover:underline dark:text-blue-300"
        >
          ← Run a free audit
        </Link>
      </p>
    </main>
  );
}

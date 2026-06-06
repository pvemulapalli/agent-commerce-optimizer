import { PageHeader } from "@/components/page-header";
import {
  ABOUT_CREATOR_BIO,
  ABOUT_PRODUCT_BODY,
  ABOUT_PRODUCT_INTRO,
  PARENT_BRAND,
  PRODUCT_NAME,
} from "@/lib/brand";
import { PROJECT_DISCLAIMER } from "@/lib/disclaimer";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About",
  description:
    "About Merchant Signals and Commerce Optimizer: LLM discoverability and evidence-backed storefront optimization.",
};

export default function AboutPage() {
  return (
    <main className="mx-auto w-full min-w-0 max-w-3xl overflow-x-hidden px-6 py-10 lg:px-8 lg:py-14">
      <PageHeader
        eyebrow="About"
        title={PARENT_BRAND}
        description={`${PRODUCT_NAME} by ${PARENT_BRAND}`}
      />

      <section className="mt-10 rounded-2xl border border-card-border bg-card p-6 shadow-sm sm:p-8">
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
            <div className="mt-4 space-y-4 text-sm leading-7 text-text-secondary">
              {ABOUT_CREATOR_BIO.map((paragraph) => (
                <p key={paragraph.slice(0, 48)}>{paragraph}</p>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-card-border bg-card p-6 shadow-sm sm:p-8">
        <h2 className="text-xl font-semibold text-text-primary">
          Why I Built {PARENT_BRAND}
        </h2>
        <div className="mt-4 space-y-4 text-sm leading-7 text-text-secondary">
          <p>
            AI systems are increasingly shaping how shoppers discover products, compare options,
            and decide what to buy. That shift puts new pressure on merchants to expose
            machine-readable storefront signals, not just polished marketing pages.
          </p>
          <p>
            Most existing tools focus on whether a brand shows up in AI answers. Merchants also
            need to know whether their public sites expose catalog structure, policies, schema,
            and discovery files in ways automated systems can actually crawl and interpret.
          </p>
          <p>
            {PARENT_BRAND} focuses on evidence-backed optimization: live crawls, inspectable
            findings, and practical fixes, so operators can improve readiness for AI-driven
            commerce without guessing.
          </p>
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-card-border bg-card p-6 shadow-sm sm:p-8">
        <h2 className="text-xl font-semibold text-text-primary">About {PRODUCT_NAME}</h2>
        <div className="mt-4 space-y-4 text-sm leading-7 text-text-secondary">
          <p>{ABOUT_PRODUCT_INTRO}</p>
          {ABOUT_PRODUCT_BODY.map((paragraph) => (
            <p key={paragraph.slice(0, 48)}>{paragraph}</p>
          ))}
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-card-border bg-card-muted p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">
          Disclaimer
        </h2>
        <p className="mt-3 text-sm leading-7 text-text-secondary">{PROJECT_DISCLAIMER}</p>
      </section>

      <p className="mt-10">
        <Link
          href="/"
          className="text-sm font-medium text-blue-900 hover:underline dark:text-blue-300"
        >
          ← Run a Commerce Optimizer scan
        </Link>
      </p>
    </main>
  );
}

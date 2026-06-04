import { PageHeader } from "@/components/page-header";
import { PROJECT_DISCLAIMER } from "@/lib/disclaimer";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact Praveen Vemulapalli, creator of the AI Commerce Optimization Platform.",
};

export default function ContactPage() {
  return (
    <main className="mx-auto w-full min-w-0 max-w-3xl overflow-x-hidden px-6 py-10 lg:px-8 lg:py-14">
      <PageHeader
        eyebrow="Contact"
        title="Get in touch"
        description={
          <>
            Questions, feedback, or ideas about AI commerce discoverability — reach
            out to{" "}
            <a
              href="https://www.linkedin.com/in/praveenvemulapalli/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-blue-900 hover:underline dark:text-blue-300"
            >
              Praveen Vemulapalli
            </a>
            .
          </>
        }
      />

      <section className="mt-10 rounded-2xl border border-card-border bg-card p-8 shadow-sm">
        <h2 className="text-xl font-semibold text-text-primary">
          <a
            href="https://www.linkedin.com/in/praveenvemulapalli/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >
            Praveen Vemulapalli
          </a>
        </h2>

        <dl className="mt-6 space-y-5 text-sm">
          <div>
            <dt className="font-medium text-text-secondary">X</dt>
            <dd className="mt-1">
              <a
                href="https://x.com/PraveenVem"
                target="_blank"
                rel="noopener noreferrer"
          className="break-all text-blue-900 hover:underline dark:text-blue-300"
              >
                https://x.com/PraveenVem
              </a>
            </dd>
          </div>

          <div>
            <dt className="font-medium text-text-secondary">LinkedIn</dt>
            <dd className="mt-1">
              <a
                href="https://www.linkedin.com/in/praveenvemulapalli/"
                target="_blank"
                rel="noopener noreferrer"
          className="break-all text-blue-900 hover:underline dark:text-blue-300"
              >
                https://www.linkedin.com/in/praveenvemulapalli/
              </a>
            </dd>
          </div>

          <div>
            <dt className="font-medium text-text-secondary">GitHub</dt>
            <dd className="mt-1">
              <a
                href="https://github.com/pvemulapalli"
                target="_blank"
                rel="noopener noreferrer"
          className="break-all text-blue-900 hover:underline dark:text-blue-300"
              >
                https://github.com/pvemulapalli
              </a>
            </dd>
          </div>
        </dl>
      </section>

      <p className="mt-8 rounded-xl border border-card-border bg-card-muted px-5 py-4 text-sm leading-7 text-text-secondary">
        {PROJECT_DISCLAIMER}
      </p>

      <p className="mt-8">
        <Link
          href="/"
          className="text-sm font-medium text-blue-900 hover:underline dark:text-blue-300"
        >
          ← Back to audit
        </Link>
      </p>
    </main>
  );
}

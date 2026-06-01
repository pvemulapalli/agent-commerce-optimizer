import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact the creator of the AI Commerce Discoverability Optimizer.",
};

export default function ContactPage() {
  return (
    <main className="mx-auto w-full min-w-0 max-w-3xl overflow-x-hidden px-6 py-10 lg:px-8 lg:py-14">
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
        Contact
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
        Get in touch
      </h1>
      <p className="mt-4 text-base leading-7 text-slate-600">
        Questions, feedback, or ideas about AI commerce discoverability — reach
        out through the links below.
      </p>

      <section className="mt-10 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Praveen Vemulapalli</h2>

        <dl className="mt-6 space-y-5 text-sm">
          <div>
            <dt className="font-medium text-slate-500">X</dt>
            <dd className="mt-1">
              <a
                href="https://x.com/PraveenVem"
                target="_blank"
                rel="noopener noreferrer"
                className="break-all text-blue-900 hover:underline"
              >
                https://x.com/PraveenVem
              </a>
            </dd>
          </div>

          <div>
            <dt className="font-medium text-slate-500">LinkedIn</dt>
            <dd className="mt-1">
              <a
                href="https://www.linkedin.com/in/praveenvemulapalli/"
                target="_blank"
                rel="noopener noreferrer"
                className="break-all text-blue-900 hover:underline"
              >
                https://www.linkedin.com/in/praveenvemulapalli/
              </a>
            </dd>
          </div>

          <div>
            <dt className="font-medium text-slate-500">GitHub</dt>
            <dd className="mt-1">
              <a
                href="https://github.com/pvemulapalli"
                target="_blank"
                rel="noopener noreferrer"
                className="break-all text-blue-900 hover:underline"
              >
                https://github.com/pvemulapalli
              </a>
            </dd>
          </div>
        </dl>
      </section>

      <p className="mt-8 rounded-xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm leading-7 text-slate-600">
        Personal educational project. Not affiliated with, endorsed by, or
        supported by Visa.
      </p>

      <p className="mt-8">
        <Link
          href="/"
          className="text-sm font-medium text-blue-900 hover:underline"
        >
          ← Back to audit
        </Link>
      </p>
    </main>
  );
}

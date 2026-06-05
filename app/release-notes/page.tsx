import { PageHeader } from "@/components/page-header";
import { APP_VERSION } from "@/lib/app-version";
import { getReleases, type ReleaseCategory } from "@/lib/releases";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Release Notes",
  description: "Version history and release notes for Commerce Optimizer.",
};

const CATEGORY_STYLES: Record<ReleaseCategory, string> = {
  UX: "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-500/40 dark:bg-blue-950/50 dark:text-blue-100",
  API: "border-indigo-200 bg-indigo-50 text-indigo-900 dark:border-indigo-500/40 dark:bg-indigo-950/50 dark:text-indigo-100",
  Admin:
    "border-violet-200 bg-violet-50 text-violet-900 dark:border-violet-500/40 dark:bg-violet-950/50 dark:text-violet-100",
  Scoring:
    "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-950/50 dark:text-emerald-100",
  Fixes:
    "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/50 dark:text-amber-100",
};

export default function ReleaseNotesPage() {
  const releases = getReleases();

  return (
    <main className="mx-auto w-full min-w-0 max-w-3xl overflow-x-hidden px-6 py-10 lg:px-8 lg:py-14">
      <PageHeader
        eyebrow="Changelog"
        title="Release Notes"
        description={`Current version: ${APP_VERSION}. Summaries of each shipped release.`}
      />

      <div className="mt-10 space-y-8">
        {releases.map((release) => (
          <article
            key={release.version}
            id={`v${release.version.replace(/\./g, "-")}`}
            className="scroll-mt-28 rounded-2xl border border-card-border bg-card p-6 shadow-sm sm:p-8"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="text-xl font-semibold text-text-primary">
                Version {release.version}
                {release.version === APP_VERSION ? (
                  <span className="ml-2 text-sm font-medium text-emerald-700 dark:text-emerald-300">
                    Current
                  </span>
                ) : null}
              </h2>
              <time className="text-sm text-text-secondary" dateTime={release.date}>
                {release.date}
              </time>
            </div>
            <p className="mt-2 text-lg font-medium text-text-primary">{release.title}</p>
            <p className="mt-2 text-sm leading-7 text-text-secondary">{release.summary}</p>

            <div className="mt-4 flex flex-wrap gap-2">
              {release.categories.map((category) => (
                <span
                  key={category}
                  className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${CATEGORY_STYLES[category]}`}
                >
                  {category}
                </span>
              ))}
            </div>

            <ul className="mt-5 list-disc space-y-2 pl-5 text-sm leading-6 text-text-secondary">
              {release.changes.map((change) => (
                <li key={change}>{change}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      <p className="mt-10 text-sm text-text-secondary">
        Also see <code className="rounded bg-card-muted px-1.5 py-0.5 font-mono text-xs">CHANGELOG.md</code>{" "}
        in the repository. Add a release with{" "}
        <code className="rounded bg-card-muted px-1.5 py-0.5 font-mono text-xs">npm run release:add</code>
        .
      </p>

      <p className="mt-6">
        <Link
          href="/"
          className="text-sm font-medium text-blue-900 hover:underline dark:text-blue-300"
        >
          ← Back to homepage
        </Link>
      </p>
    </main>
  );
}

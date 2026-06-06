"use client";

import { APP_VERSION } from "@/lib/app-version";
import type { ReleaseCategory, ReleaseEntry } from "@/lib/releases";
import { groupReleasesByVersionFamily } from "@/lib/releases";

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

function ReleaseArticleBody({ release }: { release: ReleaseEntry }) {
  return (
    <>
      {release.historical ? (
        <p className="mt-2 text-xs font-medium uppercase tracking-wide text-amber-700 dark:text-amber-300">
          Historical reconstruction
        </p>
      ) : null}
      <p className="mt-2 font-medium text-text-primary">{release.title}</p>
      <p className="mt-1 text-sm leading-6 text-text-secondary">{release.summary}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {release.categories.map((category) => (
          <span
            key={category}
            className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${CATEGORY_STYLES[category]}`}
          >
            {category}
          </span>
        ))}
      </div>
      <ul className="mt-4 list-disc space-y-1.5 pl-5 text-sm leading-6 text-text-secondary">
        {release.changes.map((change) => (
          <li key={change}>{change}</li>
        ))}
      </ul>
    </>
  );
}

function ReleaseArticle({ release, expanded = false }: { release: ReleaseEntry; expanded?: boolean }) {
  if (expanded) {
    return (
      <article
        id={`v${release.version.replace(/\./g, "-")}`}
        className="scroll-mt-28 rounded-xl border border-card-border bg-card-muted p-5"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h3 className="text-lg font-semibold text-text-primary">
            Version {release.version}
            {release.version === APP_VERSION ? (
              <span className="ml-2 text-sm font-medium text-emerald-700 dark:text-emerald-300">
                Current
              </span>
            ) : null}
          </h3>
          <time className="text-sm text-text-secondary" dateTime={release.date}>
            {release.date}
          </time>
        </div>
        <ReleaseArticleBody release={release} />
      </article>
    );
  }

  return (
    <details className="group rounded-xl border border-card-border bg-card-muted">
      <summary className="cursor-pointer list-none px-5 py-4 marker:content-none">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base font-semibold text-text-primary">
            Version {release.version}
            <span className="ml-2 text-sm font-normal text-text-secondary">{release.date}</span>
          </h3>
          <span className="text-sm text-text-secondary transition-transform group-open:rotate-180">
            ▾
          </span>
        </div>
      </summary>
      <div
        id={`v${release.version.replace(/\./g, "-")}`}
        className="scroll-mt-28 border-t border-card-border px-5 py-4"
      >
        <ReleaseArticleBody release={release} />
      </div>
    </details>
  );
}

export function ReleaseNotesAccordion({ releases }: { releases: ReleaseEntry[] }) {
  const [latest, ...older] = releases;
  const olderGroups = groupReleasesByVersionFamily(older);

  return (
    <div className="mt-10 space-y-4">
      {latest ? <ReleaseArticle release={latest} expanded /> : null}

      {olderGroups.length > 0 ? (
        <div className="space-y-4">
          {olderGroups.map((group) => (
            <details
              key={group.versionFamily}
              className="group rounded-2xl border border-card-border bg-card shadow-sm"
            >
              <summary className="cursor-pointer list-none px-6 py-4 marker:content-none sm:px-8">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold text-text-primary">
                    v{group.versionFamily}.x
                    <span className="ml-2 text-sm font-normal text-text-secondary">
                      ({group.releases.length} release{group.releases.length === 1 ? "" : "s"})
                    </span>
                  </h2>
                  <span className="text-sm text-text-secondary transition-transform group-open:rotate-180">
                    ▾
                  </span>
                </div>
              </summary>
              <div className="space-y-3 border-t border-card-border px-6 py-5 sm:px-8">
                {group.releases.map((release) => (
                  <ReleaseArticle key={release.version} release={release} />
                ))}
              </div>
            </details>
          ))}
        </div>
      ) : null}
    </div>
  );
}

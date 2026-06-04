import { getContributorsContent } from "@/lib/contributors";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Special Thanks",
  description: "Contributors who helped improve the Commerce Optimizer project.",
};

export const revalidate = 60;

export default async function ContributorsPage() {
  const content = await getContributorsContent();

  return (
    <div className="mx-auto max-w-3xl px-6 py-12 lg:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
        Special Thanks
      </p>
      <h1 className="mt-3 text-3xl font-semibold text-slate-900 dark:text-slate-100">
        Contributors
      </h1>
      <p className="mt-4 text-base leading-7 text-slate-600 dark:text-slate-300">
        {content.intro}
      </p>

      {content.contributors.length === 0 ? (
        <p className="mt-8 rounded-xl border border-dashed border-slate-300 px-6 py-8 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
          Contributor names will appear here as they are added.
        </p>
      ) : (
        <ul className="mt-8 space-y-4">
          {content.contributors.map((contributor) => (
            <li
              key={`${contributor.name}-${contributor.linkedinUrl}`}
              className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"
            >
              <p className="font-semibold text-slate-900 dark:text-slate-100">
                {contributor.name}
              </p>
              {contributor.linkedinUrl ? (
                <a
                  href={contributor.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-block text-sm font-medium text-blue-900 hover:underline dark:text-blue-300"
                >
                  LinkedIn
                </a>
              ) : (
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">LinkedIn</p>
              )}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-10 text-sm text-slate-500 dark:text-slate-400">
        <Link href="/" className="font-medium text-blue-900 hover:underline dark:text-blue-300">
          Back to homepage
        </Link>
      </p>
    </div>
  );
}

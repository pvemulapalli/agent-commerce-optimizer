import { getActiveContributors, getContributorsContent } from "@/lib/contributors";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Community Contributors",
  description: "Community contributors who helped improve Commerce Optimizer.",
};

export const revalidate = 60;

export default async function ContributorsPage() {
  const content = await getContributorsContent();
  const contributors = getActiveContributors(content);

  return (
    <div className="mx-auto max-w-3xl px-6 py-12 lg:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">
        Community
      </p>
      <h1 className="mt-3 text-3xl font-semibold text-text-primary">Community Contributors</h1>
      <p className="mt-4 text-base leading-7 text-text-secondary">{content.intro}</p>

      {contributors.length === 0 ? (
        <p className="mt-8 rounded-xl border border-dashed border-card-border bg-card-muted px-6 py-8 text-sm text-text-secondary">
          Contributor names will appear here as they are added.
        </p>
      ) : (
        <ul className="mt-8 space-y-4">
          {contributors.map((contributor) => (
            <li
              key={`${contributor.name}-${contributor.linkedinUrl}`}
              className="rounded-xl border border-card-border bg-card px-5 py-4 shadow-sm"
            >
              <p className="font-semibold text-text-primary">{contributor.name}</p>

              {contributor.companyName ? (
                <p className="mt-1 text-sm text-text-secondary">
                  {contributor.companyUrl ? (
                    <a
                      href={contributor.companyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-blue-900 hover:underline dark:text-blue-300"
                    >
                      {contributor.companyName}
                    </a>
                  ) : (
                    contributor.companyName
                  )}
                </p>
              ) : null}

              {contributor.linkedinUrl ? (
                <a
                  href={contributor.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-sm font-medium text-blue-900 hover:underline dark:text-blue-300"
                >
                  LinkedIn
                </a>
              ) : (
                <p className="mt-2 text-sm text-text-secondary">LinkedIn</p>
              )}

              {contributor.note ? (
                <blockquote className="mt-3 border-l-2 border-card-border pl-3 text-sm italic leading-6 text-text-secondary">
                  &ldquo;{contributor.note}&rdquo;
                </blockquote>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-10 text-sm text-text-secondary">
        <Link href="/" className="font-medium text-blue-900 hover:underline dark:text-blue-300">
          Back to homepage
        </Link>
      </p>
    </div>
  );
}

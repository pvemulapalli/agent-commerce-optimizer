import { PageHeader } from "@/components/page-header";
import { ReleaseNotesAccordion } from "@/components/release-notes-accordion";
import { APP_VERSION } from "@/lib/app-version";
import { getReleases } from "@/lib/releases";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Release Notes",
  description: "Version history and release notes for Commerce Optimizer.",
};

export default function ReleaseNotesPage() {
  const releases = getReleases();

  return (
    <main className="mx-auto w-full min-w-0 max-w-3xl overflow-x-hidden px-6 py-10 lg:px-8 lg:py-14">
      <PageHeader
        eyebrow="Changelog"
        title="Release Notes"
        description={`Current version: ${APP_VERSION}. Newest releases first, grouped by version family (3.3.x, 3.2.x, …).`}
      />

      <ReleaseNotesAccordion releases={releases} />

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

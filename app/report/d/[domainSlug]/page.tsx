import { DomainSharedReportView } from "./report-client";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Shared Report",
  description: "Shared Merchant Signals audit report.",
  robots: { index: false, follow: false },
};

export default async function DomainSharedReportPage({
  params,
}: {
  params: Promise<{ domainSlug: string }>;
}) {
  const { domainSlug } = await params;

  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full min-w-0 max-w-6xl px-6 py-10 lg:px-8 lg:py-14">
          <p className="text-sm text-text-secondary">Loading shared report…</p>
        </main>
      }
    >
      <DomainSharedReportView domainSlug={domainSlug} />
    </Suspense>
  );
}

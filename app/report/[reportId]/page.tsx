import { SharedReportView } from "./report-client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shared Report",
  description: "Shared Merchant Signals audit report.",
  robots: { index: false, follow: false },
};

export default async function SharedReportPage({
  params,
}: {
  params: Promise<{ reportId: string }>;
}) {
  const { reportId } = await params;

  return <SharedReportView reportId={reportId} />;
}

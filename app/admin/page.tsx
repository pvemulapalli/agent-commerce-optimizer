import { PageHeader } from "@/components/page-header";
import AdminClient from "./admin-client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminPage() {
  return (
    <main className="mx-auto w-full min-w-0 max-w-4xl px-6 py-10 lg:px-8 lg:py-14">
      <PageHeader
        eyebrow="Maintenance"
        title="Admin Tools"
        description="Server-verified maintenance tools for Commerce Optimizer Redis data. This page is not linked from the public site."
      />

      <div className="mt-10">
        <AdminClient />
      </div>
    </main>
  );
}

import { PageHeader } from "@/components/page-header";
import { resolveAdminPagePath } from "@/lib/admin-route";
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
    <main className="mx-auto w-full min-w-0 max-w-[96rem] px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <PageHeader eyebrow="Maintenance" title="Admin Tools" />

      <div className="mt-10">
        <AdminClient adminRoutePath={resolveAdminPagePath()} />
      </div>
    </main>
  );
}

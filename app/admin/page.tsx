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
      <div className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
          Maintenance
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          Admin Tools
        </h1>
        <p className="mt-4 text-base leading-7 text-slate-600">
          Server-verified maintenance tools for Commerce Optimizer Redis data.
          This page is not linked from the public site.
        </p>
      </div>

      <div className="mt-10">
        <AdminClient />
      </div>
    </main>
  );
}

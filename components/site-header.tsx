import { APP_VERSION_LABEL } from "@/lib/app-version";
import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200/70 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4 lg:px-8">
        <Link href="/" className="group min-w-0">
          <span className="block truncate text-sm font-semibold tracking-tight text-zinc-900 group-hover:text-indigo-700">
            AI Commerce Optimizer
          </span>
          <span className="block text-xs text-zinc-500">{APP_VERSION_LABEL}</span>
        </Link>

        <nav className="flex shrink-0 items-center gap-1 sm:gap-2">
          <Link
            href="/"
            className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900"
          >
            Audit
          </Link>
          <Link
            href="/docs"
            className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900"
          >
            API Docs
          </Link>
        </nav>
      </div>
    </header>
  );
}

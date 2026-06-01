import Link from "next/link";
import { Logo } from "./logo";

const NAV_LINKS = [
  { href: "/about", label: "About" },
  { href: "/recent", label: "Recent Audits" },
  { href: "/docs", label: "API Docs" },
  { href: "/contact", label: "Contact" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4 lg:px-8">
        <Link href="/" className="min-w-0 shrink">
          <Logo showWordmark className="h-9 w-9" />
        </Link>

        <nav
          aria-label="Primary"
          className="flex shrink-0 items-center gap-1 sm:gap-2"
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-2.5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 sm:px-3"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

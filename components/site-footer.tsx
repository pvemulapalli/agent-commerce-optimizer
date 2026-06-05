import {
  DEFAULT_SITE_DESCRIPTION,
  FOOTER_COPYRIGHT,
  FOOTER_TAGLINE,
} from "@/lib/brand";
import Link from "next/link";
import { Logo } from "./logo";

const FOOTER_LINKS = [
  { href: "/", label: "Home" },
  { href: "/recent", label: "Recent Audits" },
  { href: "/docs", label: "API Docs" },
  { href: "/release-notes", label: "Release Notes" },
  { href: "/contributors", label: "Contributors" },
  { href: "/contact", label: "Contact" },
];

const ATTRIBUTION_LINKS = [
  {
    href: "https://www.linkedin.com/in/praveenvemulapalli/",
    label: "Praveen Vemulapalli",
  },
  { href: "https://x.com/PraveenVem", label: "X" },
  { href: "https://github.com/pvemulapalli", label: "GitHub" },
];

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-card-border bg-background">
      <div className="mx-auto max-w-6xl px-6 py-10 lg:px-8">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <Logo showWordmark className="h-8 w-8" />
            <p className="mt-4 max-w-md text-sm leading-7 text-text-secondary">
              {DEFAULT_SITE_DESCRIPTION}
            </p>
          </div>

          <nav aria-label="Footer" className="flex flex-wrap gap-x-8 gap-y-3">
            {FOOTER_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 border-t border-slate-100 pt-8 text-sm dark:border-slate-800">
          {ATTRIBUTION_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-blue-900 hover:underline dark:text-blue-300"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="mt-6 max-w-3xl space-y-2 text-sm leading-7 text-slate-500 dark:text-slate-400">
          <p className="font-medium text-slate-700 dark:text-slate-300">{FOOTER_COPYRIGHT}</p>
          <p>{FOOTER_TAGLINE}</p>
        </div>
      </div>
    </footer>
  );
}

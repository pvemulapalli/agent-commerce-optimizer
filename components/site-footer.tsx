import { PROJECT_DISCLAIMER } from "@/lib/disclaimer";
import Link from "next/link";
import { Logo } from "./logo";

const FOOTER_LINKS = [
  { href: "/", label: "Home" },
  { href: "/recent", label: "Recent Audits" },
  { href: "/docs", label: "API Docs" },
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
    <footer className="mt-auto border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-6xl px-6 py-10 lg:px-8">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <Logo showWordmark className="h-8 w-8" />
            <p className="mt-4 max-w-md text-sm leading-7 text-slate-600">
              Evidence-backed audits and generated assets for AI commerce
              discoverability research.
            </p>
          </div>

          <nav aria-label="Footer" className="flex flex-wrap gap-x-8 gap-y-3">
            {FOOTER_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-slate-700 hover:text-slate-900"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 border-t border-slate-100 pt-8 text-sm">
          {ATTRIBUTION_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-blue-900 hover:underline"
            >
              {link.label}
            </a>
          ))}
        </div>

        <p className="mt-6 max-w-3xl text-sm leading-7 text-slate-500">
          {PROJECT_DISCLAIMER}
        </p>
      </div>
    </footer>
  );
}

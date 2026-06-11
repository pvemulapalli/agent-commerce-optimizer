import { DEFAULT_SITE_DESCRIPTION, FOOTER_COPYRIGHT, PRODUCT_BYLINE } from "@/lib/brand";
import { EmailSignupForm } from "@/components/email-signup-form";
import { ContactLink } from "@/components/contact-link";
import { PROJECT_DISCLAIMER } from "@/lib/disclaimer";
import { APP_VERSION_LABEL } from "@/lib/app-version";
import Link from "next/link";
import { Logo } from "./logo";

const FOOTER_LINKS = [
  { href: "/", label: "Home" },
  { href: "/recent", label: "Recent Scans" },
  { href: "/docs", label: "API Docs" },
  { href: "/release-notes", label: "Release Notes" },
  { href: "/contributors", label: "Contributors" },
  { href: "/crawler", label: "Crawler" },
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
          <div className="min-w-0 max-w-lg">
            <Logo showWordmark className="h-8 w-8" />
            <p className="mt-3 text-sm font-medium text-text-primary">{PRODUCT_BYLINE}</p>
            <p className="mt-3 text-sm leading-7 text-text-secondary">
              {DEFAULT_SITE_DESCRIPTION}
            </p>
          </div>

          <div className="w-full shrink-0 lg:max-w-md">
            <p className="text-sm font-medium text-text-primary">Stay updated</p>
            <p className="mt-1 text-sm text-text-secondary">
              Platform support, benchmarks, and releases.
            </p>
            <div className="mt-3">
              <EmailSignupForm idPrefix="footer-newsletter" compact />
            </div>
          </div>
        </div>

        <nav
          aria-label="Footer"
          className="mt-8 flex gap-x-5 gap-y-2 overflow-x-auto border-t border-card-border pt-6 [-ms-overflow-style:none] [scrollbar-width:none] sm:gap-x-6 [&::-webkit-scrollbar]:hidden"
        >
          {FOOTER_LINKS.map((link) =>
            link.href === "/contact" ? (
              <ContactLink
                key={link.href}
                href={link.href}
                location="footer"
                className="shrink-0 text-sm font-medium text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
              >
                {link.label}
              </ContactLink>
            ) : (
              <Link
                key={link.href}
                href={link.href}
                className="shrink-0 text-sm font-medium text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
              >
                {link.label}
              </Link>
            ),
          )}
        </nav>

        <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm">
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

        <div className="mt-6 space-y-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
          <p className="font-medium text-slate-700 dark:text-slate-300">{FOOTER_COPYRIGHT}</p>
          <p>{APP_VERSION_LABEL}</p>
          <p>{PROJECT_DISCLAIMER}</p>
        </div>
      </div>
    </footer>
  );
}

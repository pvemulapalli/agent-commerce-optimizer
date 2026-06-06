import type { ComponentType } from "react";

/** Stylized local wordmarks — text treatments, not third-party trademark assets. */

type LogoProps = { className?: string };

export function ShopifyWordmark({ className = "" }: LogoProps) {
  return (
    <svg viewBox="0 0 120 28" className={`h-6 w-auto ${className}`} aria-hidden>
      <text x="0" y="21" fill="currentColor" className="fill-emerald-700 dark:fill-emerald-300" fontSize="18" fontWeight="700" fontFamily="system-ui, sans-serif">
        shopify
      </text>
    </svg>
  );
}

export function BigCommerceWordmark({ className = "" }: LogoProps) {
  return (
    <svg viewBox="0 0 150 28" className={`h-6 w-auto ${className}`} aria-hidden>
      <text x="0" y="21" fill="currentColor" className="fill-blue-800 dark:fill-blue-300" fontSize="16" fontWeight="700" fontFamily="system-ui, sans-serif">
        BigCommerce
      </text>
    </svg>
  );
}

export function SalesforceCommerceWordmark({ className = "" }: LogoProps) {
  return (
    <svg viewBox="0 0 220 36" className={`h-8 w-auto max-w-[13rem] ${className}`} aria-hidden>
      <text x="0" y="16" fill="currentColor" className="fill-sky-700 dark:fill-sky-300" fontSize="14" fontWeight="700" fontFamily="system-ui, sans-serif">
        Salesforce
      </text>
      <text x="0" y="32" fill="currentColor" className="fill-sky-600 dark:fill-sky-400" fontSize="12" fontWeight="600" fontFamily="system-ui, sans-serif">
        Commerce Cloud
      </text>
    </svg>
  );
}

export function WooCommerceWordmark({ className = "" }: LogoProps) {
  return (
    <svg viewBox="0 0 150 28" className={`h-6 w-auto ${className}`} aria-hidden>
      <text x="0" y="21" fill="currentColor" className="fill-purple-800 dark:fill-purple-300" fontSize="16" fontWeight="700" fontFamily="system-ui, sans-serif">
        Woo
      </text>
      <text x="44" y="21" fill="currentColor" className="fill-slate-600 dark:fill-slate-300" fontSize="16" fontWeight="600" fontFamily="system-ui, sans-serif">
        Commerce
      </text>
    </svg>
  );
}

export function WixWordmark({ className = "" }: LogoProps) {
  return (
    <svg viewBox="0 0 60 28" className={`h-6 w-auto ${className}`} aria-hidden>
      <text x="0" y="22" fill="currentColor" className="fill-slate-900 dark:fill-slate-100" fontSize="22" fontWeight="800" fontFamily="system-ui, sans-serif" fontStyle="italic">
        Wix
      </text>
    </svg>
  );
}

export function SquarespaceWordmark({ className = "" }: LogoProps) {
  return (
    <svg viewBox="0 0 150 28" className={`h-6 w-auto ${className}`} aria-hidden>
      <text x="0" y="21" fill="currentColor" className="fill-slate-800 dark:fill-slate-200" fontSize="15" fontWeight="600" fontFamily="Georgia, serif">
        Squarespace
      </text>
    </svg>
  );
}

export function CommercetoolsWordmark({ className = "" }: LogoProps) {
  return (
    <svg viewBox="0 0 150 28" className={`h-6 w-auto ${className}`} aria-hidden>
      <text x="0" y="21" fill="currentColor" className="fill-rose-800 dark:fill-rose-300" fontSize="15" fontWeight="700" fontFamily="system-ui, sans-serif">
        commercetools
      </text>
    </svg>
  );
}

export function AdobeCommerceWordmark({ className = "" }: LogoProps) {
  return (
    <svg viewBox="0 0 150 28" className={`h-6 w-auto ${className}`} aria-hidden>
      <text x="0" y="21" fill="currentColor" className="fill-red-700 dark:fill-red-300" fontSize="15" fontWeight="700" fontFamily="system-ui, sans-serif">
        Adobe Commerce
      </text>
    </svg>
  );
}

export function VtexWordmark({ className = "" }: LogoProps) {
  return (
    <svg viewBox="0 0 80 28" className={`h-6 w-auto ${className}`} aria-hidden>
      <text x="0" y="21" fill="currentColor" className="fill-pink-700 dark:fill-pink-300" fontSize="18" fontWeight="700" fontFamily="system-ui, sans-serif">
        VTEX
      </text>
    </svg>
  );
}

export function FenicioWordmark({ className = "" }: LogoProps) {
  return (
    <svg viewBox="0 0 100 28" className={`h-6 w-auto ${className}`} aria-hidden>
      <text x="0" y="21" fill="currentColor" className="fill-orange-700 dark:fill-orange-300" fontSize="16" fontWeight="700" fontFamily="system-ui, sans-serif">
        Fenicio
      </text>
    </svg>
  );
}

export function OtherPlatformsWordmark({ className = "" }: LogoProps) {
  return (
    <svg viewBox="0 0 130 28" className={`h-6 w-auto ${className}`} aria-hidden>
      <text x="0" y="21" fill="currentColor" className="fill-slate-600 dark:fill-slate-300" fontSize="14" fontWeight="600" fontFamily="system-ui, sans-serif">
        Other Platforms
      </text>
    </svg>
  );
}

const PLATFORM_LOGOS: Record<string, ComponentType<LogoProps>> = {
  Shopify: ShopifyWordmark,
  BigCommerce: BigCommerceWordmark,
  "Salesforce Commerce Cloud": SalesforceCommerceWordmark,
  WooCommerce: WooCommerceWordmark,
  Wix: WixWordmark,
  Squarespace: SquarespaceWordmark,
  CommerceTools: CommercetoolsWordmark,
  Magento: AdobeCommerceWordmark,
  VTEX: VtexWordmark,
  Fenicio: FenicioWordmark,
  Unknown: OtherPlatformsWordmark,
};

const PLATFORM_ACCENT: Record<string, string> = {
  Shopify: "border-l-emerald-500",
  BigCommerce: "border-l-blue-700",
  "Salesforce Commerce Cloud": "border-l-sky-600",
  WooCommerce: "border-l-purple-700",
  Wix: "border-l-slate-900 dark:border-l-slate-100",
  Squarespace: "border-l-slate-700 dark:border-l-slate-300",
  CommerceTools: "border-l-rose-700",
  Magento: "border-l-red-600",
  VTEX: "border-l-pink-600",
  Fenicio: "border-l-orange-600",
  Unknown: "border-l-slate-400",
};

function cardLogoClassName(platformKey: string): string {
  if (platformKey === "Salesforce Commerce Cloud") {
    return "h-10 max-w-[14rem]";
  }

  return "h-7";
}

export function PlatformWordmark({
  platformKey,
  className = "",
  variant = "default",
}: {
  platformKey: string;
  className?: string;
  variant?: "default" | "card";
}) {
  const Logo = PLATFORM_LOGOS[platformKey];
  if (!Logo) {
    return null;
  }

  const sizeClass = variant === "card" ? cardLogoClassName(platformKey) : "";
  return <Logo className={`${sizeClass} ${className}`.trim()} />;
}

/** Branded platform mark for leaderboard rows — wordmark + accent stripe. */
export function PlatformTableMark({
  platformKey,
  label,
}: {
  platformKey: string;
  label: string;
}) {
  const Logo = PLATFORM_LOGOS[platformKey];
  const accent = PLATFORM_ACCENT[platformKey] ?? "border-l-slate-400";

  return (
    <div
      className={`flex min-h-[2.75rem] min-w-[9.5rem] items-center rounded-lg border border-card-border/80 bg-card-muted/70 py-1.5 pl-2.5 ${accent} border-l-4`}
    >
      {Logo ? (
        <PlatformWordmark platformKey={platformKey} variant="card" />
      ) : (
        <span className="text-sm font-semibold text-text-primary">{label}</span>
      )}
      <span className="sr-only">{label}</span>
    </div>
  );
}

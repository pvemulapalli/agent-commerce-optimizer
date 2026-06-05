import type { ComponentType } from "react";

/** Stylized local wordmarks — text treatments, not third-party trademark assets. */

type LogoProps = { className?: string };

export function ShopifyWordmark({ className = "" }: LogoProps) {
  return (
    <svg viewBox="0 0 120 28" className={`h-5 w-auto ${className}`} aria-hidden>
      <text x="0" y="21" fill="currentColor" className="fill-emerald-700 dark:fill-emerald-300" fontSize="18" fontWeight="700" fontFamily="system-ui, sans-serif">
        shopify
      </text>
    </svg>
  );
}

export function BigCommerceWordmark({ className = "" }: LogoProps) {
  return (
    <svg viewBox="0 0 150 28" className={`h-5 w-auto ${className}`} aria-hidden>
      <text x="0" y="21" fill="currentColor" className="fill-blue-800 dark:fill-blue-300" fontSize="16" fontWeight="700" fontFamily="system-ui, sans-serif">
        BigCommerce
      </text>
    </svg>
  );
}

export function SalesforceCommerceWordmark({ className = "" }: LogoProps) {
  return (
    <svg viewBox="0 0 200 32" className={`h-5 w-auto max-w-[9rem] ${className}`} aria-hidden>
      <text x="0" y="14" fill="currentColor" className="fill-sky-700 dark:fill-sky-300" fontSize="11" fontWeight="700" fontFamily="system-ui, sans-serif">
        Salesforce
      </text>
      <text x="0" y="28" fill="currentColor" className="fill-sky-600 dark:fill-sky-400" fontSize="10" fontWeight="600" fontFamily="system-ui, sans-serif">
        Commerce Cloud
      </text>
    </svg>
  );
}

export function WooCommerceWordmark({ className = "" }: LogoProps) {
  return (
    <svg viewBox="0 0 150 28" className={`h-5 w-auto ${className}`} aria-hidden>
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
    <svg viewBox="0 0 60 28" className={`h-5 w-auto ${className}`} aria-hidden>
      <text x="0" y="22" fill="currentColor" className="fill-slate-900 dark:fill-slate-100" fontSize="22" fontWeight="800" fontFamily="system-ui, sans-serif" fontStyle="italic">
        Wix
      </text>
    </svg>
  );
}

export function SquarespaceWordmark({ className = "" }: LogoProps) {
  return (
    <svg viewBox="0 0 150 28" className={`h-5 w-auto ${className}`} aria-hidden>
      <text x="0" y="21" fill="currentColor" className="fill-slate-800 dark:fill-slate-200" fontSize="15" fontWeight="600" fontFamily="Georgia, serif">
        Squarespace
      </text>
    </svg>
  );
}

export function CommercetoolsWordmark({ className = "" }: LogoProps) {
  return (
    <svg viewBox="0 0 150 28" className={`h-5 w-auto ${className}`} aria-hidden>
      <text x="0" y="21" fill="currentColor" className="fill-rose-800 dark:fill-rose-300" fontSize="15" fontWeight="700" fontFamily="system-ui, sans-serif">
        commercetools
      </text>
    </svg>
  );
}

export function AdobeCommerceWordmark({ className = "" }: LogoProps) {
  return (
    <svg viewBox="0 0 150 28" className={`h-5 w-auto ${className}`} aria-hidden>
      <text x="0" y="21" fill="currentColor" className="fill-red-700 dark:fill-red-300" fontSize="15" fontWeight="700" fontFamily="system-ui, sans-serif">
        Adobe Commerce
      </text>
    </svg>
  );
}

export function PlatformWordmark({
  platformKey,
  className = "",
}: {
  platformKey: string;
  className?: string;
}) {
  const logos: Record<string, ComponentType<LogoProps>> = {
    Shopify: ShopifyWordmark,
    BigCommerce: BigCommerceWordmark,
    "Salesforce Commerce Cloud": SalesforceCommerceWordmark,
    WooCommerce: WooCommerceWordmark,
    Wix: WixWordmark,
    Squarespace: SquarespaceWordmark,
    CommerceTools: CommercetoolsWordmark,
    Magento: AdobeCommerceWordmark,
  };

  const Logo = logos[platformKey];
  if (!Logo) {
    return null;
  }

  return <Logo className={className} />;
}

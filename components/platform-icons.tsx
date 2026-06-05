type PlatformIconKey =
  | "shopify"
  | "bigcommerce"
  | "salesforce"
  | "woocommerce"
  | "wix"
  | "squarespace"
  | "commercetools"
  | "adobe-commerce"
  | "other";

const ICON_META: Record<
  PlatformIconKey,
  { label: string; bg: string; text: string; darkBg: string; darkText: string }
> = {
  shopify: {
    label: "S",
    bg: "bg-emerald-100",
    text: "text-emerald-800",
    darkBg: "dark:bg-emerald-950/60",
    darkText: "dark:text-emerald-200",
  },
  bigcommerce: {
    label: "BC",
    bg: "bg-blue-100",
    text: "text-blue-900",
    darkBg: "dark:bg-blue-950/60",
    darkText: "dark:text-blue-200",
  },
  salesforce: {
    label: "SF",
    bg: "bg-sky-100",
    text: "text-sky-900",
    darkBg: "dark:bg-sky-950/60",
    darkText: "dark:text-sky-200",
  },
  woocommerce: {
    label: "W",
    bg: "bg-purple-100",
    text: "text-purple-900",
    darkBg: "dark:bg-purple-950/60",
    darkText: "dark:text-purple-200",
  },
  wix: {
    label: "Wx",
    bg: "bg-amber-100",
    text: "text-amber-900",
    darkBg: "dark:bg-amber-950/60",
    darkText: "dark:text-amber-200",
  },
  squarespace: {
    label: "Sq",
    bg: "bg-slate-200",
    text: "text-slate-800",
    darkBg: "dark:bg-slate-800",
    darkText: "dark:text-slate-100",
  },
  commercetools: {
    label: "CT",
    bg: "bg-rose-100",
    text: "text-rose-900",
    darkBg: "dark:bg-rose-950/60",
    darkText: "dark:text-rose-200",
  },
  "adobe-commerce": {
    label: "A",
    bg: "bg-red-100",
    text: "text-red-900",
    darkBg: "dark:bg-red-950/60",
    darkText: "dark:text-red-200",
  },
  other: {
    label: "•",
    bg: "bg-slate-100",
    text: "text-slate-700",
    darkBg: "dark:bg-slate-800",
    darkText: "dark:text-slate-200",
  },
};

export function platformKeyToIconKey(platformKey: string): PlatformIconKey {
  const map: Record<string, PlatformIconKey> = {
    Shopify: "shopify",
    BigCommerce: "bigcommerce",
    "Salesforce Commerce Cloud": "salesforce",
    WooCommerce: "woocommerce",
    Wix: "wix",
    Squarespace: "squarespace",
    CommerceTools: "commercetools",
    Magento: "adobe-commerce",
    Unknown: "other",
  };

  return map[platformKey] ?? "other";
}

export function PlatformIcon({
  platformKey,
  className = "",
}: {
  platformKey: string;
  className?: string;
}) {
  const iconKey = platformKeyToIconKey(platformKey);
  const meta = ICON_META[iconKey];

  return (
    <span
      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-card-border text-xs font-bold ${meta.bg} ${meta.text} ${meta.darkBg} ${meta.darkText} ${className}`}
      aria-hidden
    >
      {meta.label}
    </span>
  );
}

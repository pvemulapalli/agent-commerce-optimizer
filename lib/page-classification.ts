/** Coarse page-type classification from URL + light HTML cues (no keyword-only catalog detection). */

export type CoarsePageClass =
  | "product"
  | "collection"
  | "category"
  | "catalog"
  | "policy"
  | "faq"
  | "help"
  | "contact"
  | "cart_checkout"
  | "return_portal"
  | "developer_docs"
  | "other";

const POLICY_PATH =
  /\/policies?\/|\/privacy|\/terms|\/refund|\/shipping-policy|\/cookie|\/legal\b|\/disclaimer/i;

export function isPolicyOrLegalUrl(url: string): boolean {
  try {
    const path = new URL(url).pathname.toLowerCase();
    return POLICY_PATH.test(path) || POLICY_PATH.test(url.toLowerCase());
  } catch {
    return POLICY_PATH.test(url.toLowerCase());
  }
}

/** Shopify (and similar) collection PLP paths — not `/collections` index alone. */
export function isCollectionPlpUrl(url: string): boolean {
  try {
    const path = new URL(url).pathname;
    if (/\/collections\/all\/?$/i.test(path)) return false;
    return /\/collections\/[^/?#]+/i.test(path);
  } catch {
    return /\/collections\/[^/?#]+/i.test(url) && !/\/collections\/all(?:\/|$|\?)/i.test(url);
  }
}

export function isCollectionsAllUrl(url: string): boolean {
  try {
    return /\/collections\/all\/?$/i.test(new URL(url).pathname);
  } catch {
    return /\/collections\/all(?:\/|$|\?)/i.test(url);
  }
}

export function isProductPageUrl(url: string): boolean {
  return (
    /\/products\/[^/?#]+/i.test(url) ||
    /\/product\/[^/?#]+/i.test(url) ||
    /\/p\/[^/?#]+/i.test(url) ||
    /\/catalogo\/[^/?#]+/i.test(url)
  );
}

export function isFaqUrl(url: string): boolean {
  return /\/faq\b|\/faqs\b|frequently[-_]?asked/i.test(url);
}

export function isHelpCenterUrl(url: string): boolean {
  return /help\.|support\.|\/help-center|\/help\b|\/support\b/i.test(url) && !isPolicyOrLegalUrl(url);
}

export function isReturnPortalUrl(url: string): boolean {
  return /loopreturns|return-portal|make-a-return|returns\./i.test(url);
}

export function isDeveloperDocsUrl(url: string): boolean {
  if (isPolicyOrLegalUrl(url)) return false;
  return /\/developers?\b|\/api\/docs|\/docs\/api|developer\.|docs\./i.test(url);
}

export function classifyPageUrl(url: string): CoarsePageClass {
  const lower = url.toLowerCase();

  if (isPolicyOrLegalUrl(url)) return "policy";
  if (isReturnPortalUrl(url)) return "return_portal";
  if (isDeveloperDocsUrl(url)) return "developer_docs";
  if (isFaqUrl(url)) return "faq";
  if (isHelpCenterUrl(url)) return "help";
  if (/\/cart\b|\/checkout\b|\/bag\b/i.test(lower)) return "cart_checkout";
  if (/\/contact\b/i.test(lower)) return "contact";
  if (isProductPageUrl(url)) return "product";
  if (isCollectionPlpUrl(url) || isCollectionsAllUrl(url)) return "collection";
  if (/\/categor(y|ies)\//i.test(lower)) return "category";
  if (/\/catalog\b|\/catalogo\b|\/shop\b/i.test(lower)) return "catalog";
  return "other";
}

export function classifyPage(input: {
  url: string;
  title?: string | null;
}): CoarsePageClass {
  const fromUrl = classifyPageUrl(input.url);
  if (fromUrl !== "other") return fromUrl;

  const title = (input.title ?? "").toLowerCase();
  if (/privacy|terms of service|refund policy|shipping policy|cookie/i.test(title)) {
    return "policy";
  }
  if (/\bfaq\b|frequently asked/i.test(title)) return "faq";
  return "other";
}

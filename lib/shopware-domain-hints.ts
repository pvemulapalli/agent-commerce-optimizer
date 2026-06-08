import { normalizeDomainFromUrl } from "./domain-normalization";

/**
 * Verified Shopware storefronts (European validation set).
 * Keys are registrable domains; canonical entry URLs are listed in comments.
 */
const SHOPWARE_DOMAIN_HINTS: Record<string, string> = {
  // https://www.juniper-jack.de
  "juniper-jack.de": "Verified Shopware storefront (Juniper Jack)",
  // https://www.caseys.ie
  "caseys.ie": "Verified Shopware storefront (Caseys)",
  // https://www.stabilo.com
  "stabilo.com": "Verified Shopware storefront (STABILO)",
  // https://www.bwt.com
  "bwt.com": "Verified Shopware storefront (BWT)",
  // https://www.0815.eu
  "0815.eu": "Verified Shopware storefront (0815.eu)",
  // https://www.biomaris.com
  "biomaris.com": "Verified Shopware storefront (Biomaris)",
  // https://www.feelgood-shop.com
  "feelgood-shop.com": "Verified Shopware storefront (Feelgood Shop)",
  // https://www.gravado.de
  "gravado.de": "Verified Shopware storefront (Gravado)",
  // https://www.misspompadour.de
  "misspompadour.de": "Verified Shopware storefront (Miss Pompadour)",
};

export function getShopwareDomainHint(url: string): string | null {
  const domain = normalizeDomainFromUrl(url);
  return SHOPWARE_DOMAIN_HINTS[domain] ?? null;
}

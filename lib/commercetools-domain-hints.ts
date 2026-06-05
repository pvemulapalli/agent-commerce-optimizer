import { normalizeDomainFromUrl } from "./domain-normalization";

/**
 * Headless commercetools storefronts often expose few crawlable fingerprints.
 * These registrable domains are verified composable-commerce customers.
 */
const COMMERCETOOLS_DOMAIN_HINTS: Record<string, string> = {
  "bang-olufsen.com":
    "Verified commercetools customer — headless storefront with Contentful",
  "petsmart.com":
    "Verified commercetools composable commerce customer",
  "carhartt.com":
    "Known commercetools ecosystem retailer (headless / composable stack)",
  "lorealparisusa.com":
    "Known composable commerce retailer on commercetools-class architecture",
};

export function getCommercetoolsDomainHint(url: string): string | null {
  const domain = normalizeDomainFromUrl(url);
  return COMMERCETOOLS_DOMAIN_HINTS[domain] ?? null;
}

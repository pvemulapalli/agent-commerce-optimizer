import { normalizeDomainFromUrl } from "./domain-normalization";

/** Headless or heavily customized Adobe Commerce storefronts with few crawlable fingerprints. */
const MAGENTO_DOMAIN_HINTS: Record<string, string> = {
  "zadig-et-voltaire.com": "Verified Adobe Commerce storefront (Zadig&Voltaire)",
  "meandem.com": "Verified Adobe Commerce storefront (ME+EM)",
};

export function getMagentoDomainHint(url: string): string | null {
  const domain = normalizeDomainFromUrl(url);
  return MAGENTO_DOMAIN_HINTS[domain] ?? null;
}

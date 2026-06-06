import { normalizeDomainFromUrl } from "./domain-normalization";

/** Verified VTEX storefronts used to validate detection coverage. */
const VTEX_DOMAIN_HINTS: Record<string, string> = {
  "cea.com.br": "Verified VTEX storefront (C&A Brazil)",
  "aramis.com.br": "Verified VTEX storefront (Aramis)",
  "tokstok.com.br": "Verified VTEX storefront (Tok&Stok)",
  "novomundo.com.br": "Verified VTEX storefront (Novo Mundo)",
  "hsm.com.br": "Verified VTEX storefront (HSM Store)",
  "juleriaque.com.ar": "Verified VTEX storefront (Juleriaque)",
  "loungerie.com.br": "Verified VTEX storefront (Loungerie)",
  "elektra.mx": "Verified VTEX storefront (Elektra Mexico)",
  "oceane.com.br": "Verified VTEX storefront (Océane)",
  "flormel.com.br": "Verified VTEX storefront (Flormel)",
};

export function getVtexDomainHint(url: string): string | null {
  const domain = normalizeDomainFromUrl(url);
  return VTEX_DOMAIN_HINTS[domain] ?? null;
}

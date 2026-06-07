import { normalizeDomainFromUrl } from "./domain-normalization";

/** Verified VTEX storefronts (official test set). */
const VTEX_DOMAIN_HINTS: Record<string, string> = {
  // https://www.cea.com.br
  "cea.com.br": "Verified VTEX storefront (C&A Brazil)",
  // https://www.aramis.com.br
  "aramis.com.br": "Verified VTEX storefront (Aramis)",
  // https://www.tokstok.com.br
  "tokstok.com.br": "Verified VTEX storefront (Tok&Stok)",
  // https://www.novomundo.com.br
  "novomundo.com.br": "Verified VTEX storefront (Novo Mundo)",
  // https://www.hsm.com.br
  "hsm.com.br": "Verified VTEX storefront (HSM Store)",
  // https://www.juleriaque.com.ar
  "juleriaque.com.ar": "Verified VTEX storefront (Juleriaque)",
  // https://www.loungerie.com.br
  "loungerie.com.br": "Verified VTEX storefront (Loungerie)",
  // https://www.elektra.mx
  "elektra.mx": "Verified VTEX storefront (Elektra Mexico)",
  // https://www.oceane.com.br
  "oceane.com.br": "Verified VTEX storefront (Océane)",
  // https://www.flormel.com.br
  "flormel.com.br": "Verified VTEX storefront (Flormel)",
};

export function getVtexDomainHint(url: string): string | null {
  const domain = normalizeDomainFromUrl(url);
  return VTEX_DOMAIN_HINTS[domain] ?? null;
}

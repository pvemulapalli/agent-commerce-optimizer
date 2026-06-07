import { normalizeDomainFromUrl } from "./domain-normalization";

/**
 * Verified Fenicio storefronts (official test set + Divino).
 * Keys are registrable domains; canonical entry URLs are listed in comments.
 */
const FENICIO_DOMAIN_HINTS: Record<string, string> = {
  // https://www.toms.pe
  "toms.pe": "Verified Fenicio storefront (TOMS Peru)",
  // https://uy.todomoda.com
  "todomoda.com": "Verified Fenicio storefront (Todo Moda Uruguay)",
  // https://www.timberland.com.pe
  "timberland.com.pe": "Verified Fenicio storefront (Timberland Peru)",
  // https://www.rolling.com.uy
  "rolling.com.uy": "Verified Fenicio storefront (Rolling Uruguay)",
  // https://www.pricebox.pe
  "pricebox.pe": "Verified Fenicio storefront (PriceBox Peru)",
  // https://tienda.portoservicios.com.uy
  "portoservicios.com.uy": "Verified Fenicio storefront (Porto Servicios Uruguay)",
  // https://www.pamperouruguay.com
  "pamperouruguay.com": "Verified Fenicio storefront (Pampers Uruguay)",
  // https://www.newbalance.com.uy
  "newbalance.com.uy": "Verified Fenicio storefront (New Balance Uruguay)",
  // https://matiasgonzalez.com.uy
  "matiasgonzalez.com.uy": "Verified Fenicio storefront (Matías González)",
  // https://www.muar.com.py
  "muar.com.py": "Verified Fenicio storefront (Muar Paraguay)",
  // https://www.divino.com.uy
  "divino.com.uy": "Verified Fenicio storefront (Divino Uruguay)",
};

export function getFenicioDomainHint(url: string): string | null {
  const domain = normalizeDomainFromUrl(url);
  return FENICIO_DOMAIN_HINTS[domain] ?? null;
}

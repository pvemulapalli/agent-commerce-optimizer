import { normalizeDomainFromUrl } from "./domain-normalization";

/** Verified Fenicio storefronts used to validate detection coverage. */
const FENICIO_DOMAIN_HINTS: Record<string, string> = {
  "toms.pe": "Verified Fenicio storefront (TOMS Peru)",
  "todomoda.com": "Verified Fenicio storefront (Todo Moda Uruguay)",
  "timberland.com.pe": "Verified Fenicio storefront (Timberland Peru)",
  "rolling.com.uy": "Verified Fenicio storefront (Rolling Uruguay)",
  "pricebox.pe": "Verified Fenicio storefront (PriceBox Peru)",
  "portoservicios.com.uy": "Verified Fenicio storefront (Porto Servicios Uruguay)",
  "pamperouruguay.com": "Verified Fenicio storefront (Pampers Uruguay)",
  "newbalance.com.uy": "Verified Fenicio storefront (New Balance Uruguay)",
  "matiasgonzalez.com.uy": "Verified Fenicio storefront (Matías González)",
  "muar.com.py": "Verified Fenicio storefront (Muar Paraguay)",
};

export function getFenicioDomainHint(url: string): string | null {
  const domain = normalizeDomainFromUrl(url);
  return FENICIO_DOMAIN_HINTS[domain] ?? null;
}

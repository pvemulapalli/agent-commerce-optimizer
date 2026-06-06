import { BRAND_OVERRIDES } from "./brand-overrides";
import { getRegistrableDomain } from "./domains";

const LOCALE_SUBDOMAIN_PATTERN =
  /^(?:[a-z]{2}(?:[-_][a-z]{2})?|[a-z]{2}[-_][a-z]{2})$/i;

/** Strip www, country, and locale subdomains → registrable domain (e.g. louisvuitton.com). */
export function normalizeDomain(hostname: string): string {
  return getRegistrableDomain(hostname.trim().toLowerCase());
}

export function normalizeDomainFromUrl(url: string): string {
  try {
    return normalizeDomain(new URL(url).hostname);
  } catch {
    return url.trim().toLowerCase();
  }
}

function getDomainLabel(normalizedDomain: string): string {
  const parts = normalizedDomain.split(".");
  // First label of registrable domain: juleriaque.com.ar → juleriaque
  return parts[0] ?? normalizedDomain;
}

function capitalizeWord(word: string): string {
  if (!word) {
    return word;
  }
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

function labelToFriendlyBrand(label: string): string {
  const compactKey = label.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (BRAND_OVERRIDES[compactKey]) {
    return BRAND_OVERRIDES[compactKey];
  }

  if (BRAND_OVERRIDES[label.toLowerCase()]) {
    return BRAND_OVERRIDES[label.toLowerCase()];
  }

  if (label.includes("-")) {
    return label.split("-").filter(Boolean).map(capitalizeWord).join(" ");
  }

  return capitalizeWord(label);
}

/** Convert a URL or hostname into a friendly merchant display name. */
export function getMerchantDisplayName(input: string): string {
  try {
    const hostname = input.includes("://")
      ? new URL(input).hostname
      : input.replace(/^www\./i, "");
    const normalized = normalizeDomain(hostname);
    const label = getDomainLabel(normalized);
    return labelToFriendlyBrand(label);
  } catch {
    return input;
  }
}

export function isLocaleOrCountrySubdomain(label: string): boolean {
  return LOCALE_SUBDOMAIN_PATTERN.test(label);
}

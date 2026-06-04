import { normalizeDomain, normalizeDomainFromUrl } from "./domain-normalization";

/** External BuiltWith profile URL for a merchant root domain (not affiliated with Commerce Optimizer). */
export function getBuiltWithProfileUrl(urlOrHostname: string): string {
  const domain = urlOrHostname.includes("://")
    ? normalizeDomainFromUrl(urlOrHostname)
    : normalizeDomain(urlOrHostname.replace(/^www\./i, ""));

  return `https://builtwith.com/${domain}`;
}

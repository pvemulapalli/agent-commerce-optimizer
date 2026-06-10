import { normalizeDomainFromUrl } from "./domain-normalization";

const MULTI_PART_TLDS = new Set(["co", "com", "org", "net", "ac", "gov"]);

export function normalizeReportDomain(domainOrUrl: string): string {
  const input = domainOrUrl.includes("://")
    ? domainOrUrl
    : `https://${domainOrUrl.replace(/^www\./, "")}/`;

  return normalizeDomainFromUrl(input);
}

export function encodeDomainReportSlug(domainOrUrl: string): string {
  return normalizeReportDomain(domainOrUrl).replace(/\./g, "-");
}

export function decodeDomainReportSlug(slug: string): string {
  const parts = slug.toLowerCase().split("-");

  if (parts.length <= 2) {
    return parts.join(".");
  }

  if (parts.length >= 3 && MULTI_PART_TLDS.has(parts[parts.length - 2])) {
    const registrable = parts.slice(-3).join(".");
    const prefix = parts.slice(0, -3);

    if (prefix.length === 0) {
      return registrable;
    }

    return `${prefix.join("-")}.${registrable}`;
  }

  return `${parts.slice(0, -1).join("-")}.${parts.at(-1)}`;
}

export function buildDomainReportPermalink(
  domainOrUrl: string,
  accessKey: string,
  origin?: string,
): string {
  const base = origin ?? "";
  const slug = encodeDomainReportSlug(domainOrUrl);
  const params = new URLSearchParams({ access: accessKey });
  return `${base}/report/d/${slug}?${params.toString()}`;
}

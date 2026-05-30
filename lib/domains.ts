const MULTI_PART_TLDS = new Set(["co", "com", "org", "net", "ac", "gov"]);

const RELATED_PORTAL_PATTERNS = [
  /loopreturns\.com/i,
  /happyreturns\.com/i,
  /narvar\.com/i,
  /returnly\.com/i,
  /aftership\.com/i,
];

export function getRegistrableDomain(hostname: string): string {
  const normalized = hostname.toLowerCase().replace(/^www\./, "");
  const parts = normalized.split(".");

  if (parts.length <= 2) {
    return normalized;
  }

  if (parts.length >= 3 && MULTI_PART_TLDS.has(parts[parts.length - 2])) {
    return parts.slice(-3).join(".");
  }

  return parts.slice(-2).join(".");
}

export function getBrandToken(entryUrl: string): string {
  const hostname = new URL(entryUrl).hostname.toLowerCase().replace(/^www\./, "");
  return hostname.split(".")[0] ?? hostname;
}

export function isSameOrigin(url: string, origin: string): boolean {
  try {
    return new URL(url).origin === origin;
  } catch {
    return false;
  }
}

const SUPPORT_HOST_PATTERNS = [
  /support\./i,
  /help\./i,
  /care\./i,
  /customer/i,
  /returns?\./i,
];

export function isTrustedRelatedUrl(linkUrl: string, entryUrl: string): boolean {
  try {
    const link = new URL(linkUrl);
    const entry = new URL(entryUrl);

    if (link.origin === entry.origin) {
      return false;
    }

    const linkDomain = getRegistrableDomain(link.hostname);
    const entryDomain = getRegistrableDomain(entry.hostname);

    if (linkDomain === entryDomain) {
      return true;
    }

    if (RELATED_PORTAL_PATTERNS.some((pattern) => pattern.test(link.hostname))) {
      return true;
    }

    const brandToken = getBrandToken(entryUrl);
    const hostLower = link.hostname.toLowerCase();

    if (brandToken.length >= 4 && hostLower.includes(brandToken)) {
      return (
        SUPPORT_HOST_PATTERNS.some((pattern) => pattern.test(hostLower)) ||
        RELATED_PORTAL_PATTERNS.some((pattern) => pattern.test(hostLower))
      );
    }

    return false;
  } catch {
    return false;
  }
}

export function classifyLinkScope(
  linkUrl: string,
  entryOrigin: string,
  entryUrl: string,
): "same-origin" | "related-domain" | "external" {
  if (isSameOrigin(linkUrl, entryOrigin)) {
    return "same-origin";
  }

  if (isTrustedRelatedUrl(linkUrl, entryUrl)) {
    return "related-domain";
  }

  return "external";
}

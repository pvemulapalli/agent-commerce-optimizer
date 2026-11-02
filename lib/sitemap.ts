import {
  isCollectionPlpUrl,
  isCollectionsAllUrl,
  isPolicyOrLegalUrl,
  isProductPageUrl,
} from "./page-classification";

export const SITEMAP_URL_LIMIT = 20;
/** Minimum collection/category PLP URLs reserved in the sitemap fetch budget when available. */
export const SITEMAP_COLLECTION_RESERVE = 5;

const PRIORITY_KEYWORDS = [
  "returns",
  "refund",
  "shipping",
  "faq",
  "help",
  "support",
  "contact",
  "policy",
  "cart",
  "checkout",
  "product",
  "products",
  "collections",
  "catalog",
];

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'");
}

export function extractLocTags(xml: string): string[] {
  const locations: string[] = [];
  const locPattern = /<loc>\s*([^<]+?)\s*<\/loc>/gi;
  let match = locPattern.exec(xml);

  while (match) {
    const loc = decodeXmlEntities(match[1].trim());
    if (loc) locations.push(loc);
    match = locPattern.exec(xml);
  }

  return locations;
}

export function isSitemapIndex(xml: string): boolean {
  return /<sitemapindex[\s>]/i.test(xml);
}

export function scoreSitemapUrl(url: string): number {
  const lower = url.toLowerCase();
  let score = 0;

  if (/\/p\/[^/]+\/\d+\.html/i.test(url)) {
    score += 12;
  }

  if (isProductPageUrl(url)) {
    score += 12;
  }

  if (isCollectionPlpUrl(url)) {
    score += 11;
  } else if (isCollectionsAllUrl(url)) {
    score += 8;
  } else if (/\/categor(y|ies)\/[^/?#]+/i.test(url)) {
    score += 10;
  }

  if (isPolicyOrLegalUrl(url)) {
    score += 4;
  }

  for (const keyword of PRIORITY_KEYWORDS) {
    if (lower.includes(keyword)) {
      score += 3;
    }
  }

  return score;
}

function rankNestedSitemapFile(url: string): number {
  const lower = url.toLowerCase();

  if (/sitemap_collections|collections/i.test(lower)) {
    return 0;
  }

  if (/sitemap_0|product|catalog/i.test(lower)) {
    return 0;
  }

  if (/hreflang|faceted|lang|locale/i.test(lower)) {
    return 2;
  }

  return 1;
}

function isReservedCollectionCandidate(url: string): boolean {
  return isCollectionPlpUrl(url) || /\/categor(y|ies)\/[^/?#]+/i.test(url);
}

/**
 * Select sitemap page URLs with a reserved quota for collection/category PLPs
 * so product-heavy sitemaps cannot starve catalog discovery.
 */
export function prioritizeSitemapUrls(urls: string[], limit = SITEMAP_URL_LIMIT): string[] {
  const unique = [...new Set(urls.map((url) => url.trim()).filter(Boolean))];
  const scored = unique
    .map((url) => ({ url, score: scoreSitemapUrl(url) }))
    .sort((a, b) => b.score - a.score || a.url.localeCompare(b.url));

  const collectionCandidates = scored.filter((entry) =>
    isReservedCollectionCandidate(entry.url),
  );
  const reserveCount = Math.min(SITEMAP_COLLECTION_RESERVE, collectionCandidates.length, limit);
  const reserved = collectionCandidates.slice(0, reserveCount).map((entry) => entry.url);
  const reservedSet = new Set(reserved);

  const remainingSlots = Math.max(0, limit - reserved.length);
  const fillers = scored
    .filter((entry) => !reservedSet.has(entry.url))
    .slice(0, remainingSlots)
    .map((entry) => entry.url);

  return [...reserved, ...fillers];
}

export async function resolveSitemapUrls(
  initialSitemapUrl: string,
  fetchXml: (url: string) => Promise<string | null>,
  maxNestedSitemaps = 5,
): Promise<{ sitemapUrls: string[]; pageUrls: string[] }> {
  const visitedSitemaps = new Set<string>();
  const sitemapUrls: string[] = [];
  const pageUrls: string[] = [];
  const queue = [initialSitemapUrl];

  while (queue.length > 0 && visitedSitemaps.size < maxNestedSitemaps + 1) {
    const sitemapUrl = queue.shift()!;
    if (visitedSitemaps.has(sitemapUrl)) continue;

    visitedSitemaps.add(sitemapUrl);
    sitemapUrls.push(sitemapUrl);

    const xml = await fetchXml(sitemapUrl);
    if (!xml) continue;

    const locations = extractLocTags(xml);

    if (isSitemapIndex(xml)) {
      const sortedLocations = [...locations].sort(
        (left, right) => rankNestedSitemapFile(left) - rankNestedSitemapFile(right),
      );

      for (const loc of sortedLocations) {
        if (!visitedSitemaps.has(loc)) {
          queue.push(loc);
        }
      }
    } else {
      pageUrls.push(...locations);
    }
  }

  return { sitemapUrls, pageUrls };
}

export { PRIORITY_KEYWORDS };

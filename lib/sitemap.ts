const SITEMAP_URL_LIMIT = 20;

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

  if (/\/products\/[^/?#]+/i.test(url)) {
    score += 12;
  }

  if (/\/product\/[^/?#]+/i.test(url)) {
    score += 10;
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

  if (/sitemap_0|product|catalog/i.test(lower)) {
    return 0;
  }

  if (/hreflang|faceted|lang|locale/i.test(lower)) {
    return 2;
  }

  return 1;
}

export function prioritizeSitemapUrls(urls: string[], limit = SITEMAP_URL_LIMIT): string[] {
  const unique = [...new Set(urls.map((url) => url.trim()).filter(Boolean))];

  return unique
    .map((url) => ({ url, score: scoreSitemapUrl(url) }))
    .sort((a, b) => b.score - a.score || a.url.localeCompare(b.url))
    .slice(0, limit)
    .map((entry) => entry.url);
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

export { SITEMAP_URL_LIMIT, PRIORITY_KEYWORDS };

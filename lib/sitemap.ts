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

export function extractLocTags(xml: string): string[] {
  const locations: string[] = [];
  const locPattern = /<loc>\s*([^<]+?)\s*<\/loc>/gi;
  let match = locPattern.exec(xml);

  while (match) {
    const loc = match[1].trim();
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

  for (const keyword of PRIORITY_KEYWORDS) {
    if (lower.includes(keyword)) {
      score += 3;
    }
  }

  return score;
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
      for (const loc of locations) {
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

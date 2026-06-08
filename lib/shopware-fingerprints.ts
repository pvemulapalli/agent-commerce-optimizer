import type { CrawlData } from "./types";

const SHOPWARE_ROBOTS_PATH_PATTERNS = [
  /Disallow:\s*\/warenkorb\b/i,
  /Disallow:\s*\/merkzettel\b/i,
  /Disallow:\s*\/widgets\b/i,
  /Disallow:\s*\/listing\b/i,
  /Disallow:\s*\/mein-konto\b/i,
  /Disallow:\s*\/note\b/i,
  /Disallow:\s*\/backend\b/i,
];

export function isShopwareRobotsTxt(content: string): boolean {
  if (!content.trim()) {
    return false;
  }

  const matches = SHOPWARE_ROBOTS_PATH_PATTERNS.filter((pattern) => pattern.test(content)).length;
  return matches >= 2;
}

export function hasShopwareHtmlMarkers(content: string): boolean {
  return /shopware|\/js\/storefront\/storefront\.js|\/theme\/[a-f0-9]+\/js\/(?:storefront\/storefront|all)\.js|\/bundles\/|swag-|<sw-|\/store-api\/|s3sw-|Shopware\s*>=\s*5|document\.asyncReady/i.test(
    content,
  );
}

export function crawlHasShopwareHtml(data: CrawlData): boolean {
  const haystack = data.pages
    .filter((page) => {
      try {
        return new URL(page.url).origin === data.origin;
      } catch {
        return false;
      }
    })
    .map((page) =>
      [page.htmlSnippet, page.bodyTextSnippet, JSON.stringify(page.jsonLdBlocks)].join(" "),
    )
    .join(" ");

  return hasShopwareHtmlMarkers(haystack);
}

export function crawlHasShopwareContext(data: CrawlData): boolean {
  const robotsContent = data.resources?.robotsTxt?.content ?? "";
  return crawlHasShopwareHtml(data) || isShopwareRobotsTxt(robotsContent);
}

export function hasStrongShopwarePlatform(platform: {
  platform: string;
  confidence: string;
}): boolean {
  return platform.platform === "Shopware" && platform.confidence !== "low";
}

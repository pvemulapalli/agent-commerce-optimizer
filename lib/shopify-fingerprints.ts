import type { CrawlData } from "./types";

export function hasShopifyHtmlMarkers(content: string): boolean {
  return /cdn\.shopify\.com|shopify\.theme|shopify-features|\/\/cdn\.shopify|myshopify\.com|shopify\.com\/s\/files|\/products\/[\w-]+\.js\b|\/cart\.js|\/cart\/add/i.test(
    content,
  );
}

export function crawlHasShopifyHtml(data: CrawlData): boolean {
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

  return hasShopifyHtmlMarkers(haystack);
}

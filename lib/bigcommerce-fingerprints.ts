import type { CrawlData } from "./types";

export function hasBigCommerceHtmlMarkers(content: string): boolean {
  return /cdn\d+\.bigcommerce\.com|bigcommerce\.com\/s\/[\w-]+|microapps\.bigcommerce\.com|graphql\.bigcommerce\.com|bigcommerce\.catalyst|stencil\.bundle|bc-sf-filter/i.test(
    content,
  );
}

export function hasBigCommerceStencilCdn(content: string): boolean {
  return /cdn\d+\.bigcommerce\.com\/s-[\w-]+\/images\/stencil/i.test(content);
}

export function hasBigCommerceCatalystMarker(content: string): boolean {
  return /bigcommerce\.catalyst|content="bigcommerce\.catalyst"/i.test(content);
}

export function crawlHasBigCommerceHtml(data: CrawlData): boolean {
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

  return hasBigCommerceHtmlMarkers(haystack);
}

export function crawlHasBigCommerceContext(data: CrawlData): boolean {
  return crawlHasBigCommerceHtml(data);
}

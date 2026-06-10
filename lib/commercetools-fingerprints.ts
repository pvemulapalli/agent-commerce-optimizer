import type { CrawlData } from "./types";

export function hasCommercetoolsHtmlMarkers(content: string): boolean {
  return /commercetools\.com|commercetools\.io|composable-commerce|commerceToolsAttributes|commerceToolsApi|@commercetools|commercetools-frontend|frontastic|ct-api|projectKey|api\.(?:europe-west1|australia-southeast1)\.gcp\.commercetools\.com/i.test(
    content,
  );
}

export function crawlHasCommercetoolsHtml(data: CrawlData): boolean {
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

  return hasCommercetoolsHtmlMarkers(haystack);
}

export function crawlHasCommercetoolsContext(data: CrawlData): boolean {
  return crawlHasCommercetoolsHtml(data);
}

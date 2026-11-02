/** Optional headers applied to storefront crawl fetches (e.g. after password unlock). */
export interface CrawlRequestContext {
  cookieHeader?: string;
}

export function hasCrawlRequestContext(context?: CrawlRequestContext): boolean {
  return Boolean(context?.cookieHeader?.trim());
}

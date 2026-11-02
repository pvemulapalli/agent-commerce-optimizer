import { normalizeAuditUrl } from "./audit-url";
import type { CrawlRequestContext } from "./crawl-request-context";
import {
  isShopifyStorefrontPasswordPage,
  StorefrontPasswordRejectedError,
  unlockShopifyStorefrontPassword,
} from "./shopify-storefront-password";
import { StorefrontPasswordRequiredError } from "./storefront-password";

export interface StorefrontAccessResult {
  crawlContext?: CrawlRequestContext;
  /** Skip shared audit cache when a password was supplied or used. */
  bypassCache: boolean;
}

export async function resolveStorefrontAccess(
  inputUrl: string,
  storefrontPassword?: string,
): Promise<StorefrontAccessResult> {
  const normalizedUrl = normalizeAuditUrl(inputUrl);
  const trimmedPassword = storefrontPassword?.trim() ?? "";

  if (!trimmedPassword) {
    return { bypassCache: false };
  }

  try {
    const crawlContext = await unlockShopifyStorefrontPassword(normalizedUrl, trimmedPassword);
    return {
      crawlContext,
      bypassCache: true,
    };
  } catch (error) {
    if (error instanceof StorefrontPasswordRejectedError) {
      throw new StorefrontPasswordRequiredError({ invalidPassword: true });
    }

    throw error;
  }
}

export function assertEntryNotPasswordGated(input: {
  html: string | null;
  url: string;
}): void {
  if (
    input.html &&
    isShopifyStorefrontPasswordPage({ html: input.html, url: input.url })
  ) {
    throw new StorefrontPasswordRequiredError();
  }
}

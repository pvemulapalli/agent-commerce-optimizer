import * as cheerio from "cheerio";
import { normalizeAuditUrl } from "./audit-url";
import type { CrawlRequestContext } from "./crawl-request-context";
import {
  isShopifyStorefrontPasswordPage,
} from "./shopify-host";
import { storefrontFetch } from "./storefront-fetch";

export {
  isMyshopifyHostname,
  isShopifyStorefrontPasswordPage,
} from "./shopify-host";

/**
 * Shopify rejects storefront password unlock requests from known bot UAs
 * (including MerchantSignalsBot). Use a browser-like UA only for the unlock
 * handshake; subsequent crawl requests can reuse the session cookies.
 */
const PASSWORD_UNLOCK_USER_AGENT =
  "Mozilla/5.0 (compatible; MerchantSignalsUnlock/1.0; +https://www.merchantsignals.com/crawler) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

type CookieJar = Map<string, string>;

function parseCookiePair(setCookieValue: string): { name: string; value: string } | null {
  const segment = setCookieValue.split(";")[0]?.trim();
  if (!segment) {
    return null;
  }

  const separator = segment.indexOf("=");
  if (separator <= 0) {
    return null;
  }

  const name = segment.slice(0, separator).trim();
  const value = segment.slice(separator + 1).trim();

  if (!name) {
    return null;
  }

  return { name, value };
}

function mergeSetCookies(jar: CookieJar, headers: Headers): void {
  const setCookies =
    typeof headers.getSetCookie === "function"
      ? headers.getSetCookie()
      : ([headers.get("set-cookie")].filter(Boolean) as string[]);

  for (const setCookie of setCookies) {
    const parsed = parseCookiePair(setCookie);
    if (parsed) {
      jar.set(parsed.name, parsed.value);
    }
  }
}

export function formatCookieHeader(jar: CookieJar): string {
  return [...jar.entries()].map(([name, value]) => `${name}=${value}`).join("; ");
}

async function fetchStorefront(
  url: string,
  jar: CookieJar,
  init?: {
    method?: string;
    body?: string;
    headers?: Record<string, string>;
    redirect?: "follow" | "manual";
  },
): Promise<Response> {
  const cookieHeader = formatCookieHeader(jar);
  const response = await storefrontFetch(url, {
    method: init?.method ?? "GET",
    headers: {
      "User-Agent": PASSWORD_UNLOCK_USER_AGENT,
      Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      ...init?.headers,
    },
    body: init?.body,
    redirect: init?.redirect ?? "follow",
  });

  mergeSetCookies(jar, response.headers);
  return response;
}

function buildPasswordFormBody(html: string, password: string): string {
  const $ = cheerio.load(html);
  const authenticityToken = $('input[name="authenticity_token"]').attr("value")?.trim() ?? "";

  // Live Shopify password forms often omit form_type; include both variants via
  // authenticity_token + password which is what the browser submits.
  const body = new URLSearchParams({
    utf8: "✓",
    password,
  });

  if (authenticityToken) {
    body.set("authenticity_token", authenticityToken);
  }

  return body.toString();
}

export async function unlockShopifyStorefrontPassword(
  inputUrl: string,
  password: string,
): Promise<CrawlRequestContext> {
  const normalizedUrl = normalizeAuditUrl(inputUrl);
  const origin = new URL(normalizedUrl).origin;
  const jar: CookieJar = new Map();

  const initial = await fetchStorefront(normalizedUrl, jar);
  const initialHtml = await initial.text();

  if (!isShopifyStorefrontPasswordPage({ html: initialHtml, url: initial.url })) {
    const cookieHeader = formatCookieHeader(jar);
    return cookieHeader ? { cookieHeader } : {};
  }

  const formBody = buildPasswordFormBody(initialHtml, password);

  // Prefer a normal form POST with redirect following. Shopify returns 302 → /
  // on success for browser-like clients.
  const postResponse = await fetchStorefront(`${origin}/password`, jar, {
    method: "POST",
    body: formBody,
    redirect: "follow",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "text/html,application/xhtml+xml",
      Origin: origin,
      Referer: `${origin}/password`,
    },
  });

  let verifyHtml = await postResponse.text();
  let verifyUrl = postResponse.url;

  // If POST didn't land on the storefront, try an explicit homepage fetch.
  if (isShopifyStorefrontPasswordPage({ html: verifyHtml, url: verifyUrl })) {
    const verify = await fetchStorefront(normalizedUrl, jar);
    verifyHtml = await verify.text();
    verifyUrl = verify.url;
  }

  if (isShopifyStorefrontPasswordPage({ html: verifyHtml, url: verifyUrl })) {
    throw new StorefrontPasswordRejectedError();
  }

  const cookieHeader = formatCookieHeader(jar);
  if (!cookieHeader) {
    throw new StorefrontPasswordRejectedError(
      "Storefront password was not accepted. No session cookie was returned.",
    );
  }

  return { cookieHeader };
}

export class StorefrontPasswordRejectedError extends Error {
  constructor(message = "Incorrect storefront password.") {
    super(message);
    this.name = "StorefrontPasswordRejectedError";
  }
}

import { pageContentHaystack } from "./gateway-errors";
import type { CrawlData, PageData } from "./types";

export const BOT_VERIFICATION_SCAN_STATUS = "bot_verification_blocked";

export const BOT_VERIFICATION_MESSAGE =
  "Bot verification is blocking the scanning of this site. Please try again later.";

const BOT_VERIFICATION_PATTERNS = [
  /just a moment/i,
  /checking your browser before accessing/i,
  /checking if the site connection is secure/i,
  /enable javascript and cookies to continue/i,
  /cf-browser-verification/i,
  /cdn-cgi\/challenge-platform/i,
  /__cf_chl_opt/i,
  /cf-challenge-running/i,
  /challenge-platform/i,
  /performing security verification/i,
  /attention required!?\s*\|\s*cloudflare/i,
  /cloudflare ray id/i,
  /verify you are human/i,
  /bot verification/i,
  /ddos protection by cloudflare/i,
  /security check to access/i,
  /uses a security service to protect against malicious bots/i,
  /displayed while the website verifies you are not a bot/i,
  /performance and security by cloudflare/i,
];

const BOT_VERIFICATION_STATUS_CODES = new Set([403, 429, 503]);

export class BotVerificationBlockedError extends Error {
  constructor(message = BOT_VERIFICATION_MESSAGE) {
    super(message);
    this.name = "BotVerificationBlockedError";
  }
}

export function isBotVerificationContent(text: string): boolean {
  if (!text.trim()) {
    return false;
  }

  return BOT_VERIFICATION_PATTERNS.some((pattern) => pattern.test(text));
}

function readResponseHeader(
  headers: Headers | Record<string, string> | undefined,
  name: string,
): string | null {
  if (!headers) {
    return null;
  }

  if (headers instanceof Headers) {
    return headers.get(name);
  }

  const direct = headers[name] ?? headers[name.toLowerCase()];
  return direct ?? null;
}

export function isBotVerificationResponse(input: {
  status?: number | null;
  bodyText?: string | null;
  headers?: Headers | Record<string, string>;
}): boolean {
  const bodyText = input.bodyText ?? "";

  if (isBotVerificationContent(bodyText)) {
    return true;
  }

  const status = input.status ?? null;
  const server = readResponseHeader(input.headers, "server")?.toLowerCase() ?? "";
  const cfRay = readResponseHeader(input.headers, "cf-ray");
  const cfMitigated = readResponseHeader(input.headers, "cf-mitigated")?.toLowerCase() ?? "";

  if (cfRay || cfMitigated.includes("challenge") || server.includes("cloudflare")) {
    if (status !== null && BOT_VERIFICATION_STATUS_CODES.has(status)) {
      return true;
    }

    if (/challenge|bot|captcha|managed/i.test(cfMitigated)) {
      return true;
    }
  }

  return false;
}

export function detectBotVerificationInPages(pages: PageData[]): boolean {
  return pages.some((page) => isBotVerificationContent(pageContentHaystack(page)));
}

export function detectBotVerificationInCrawl(data: CrawlData): boolean {
  if (detectBotVerificationInPages(data.pages)) {
    return true;
  }

  const entry =
    data.pages.find(
      (page) => page.url.replace(/\/$/, "") === data.entryUrl.replace(/\/$/, ""),
    ) ?? data.pages[0];

  if (!entry) {
    return false;
  }

  if (entry.status !== null && BOT_VERIFICATION_STATUS_CODES.has(entry.status)) {
    const haystack = pageContentHaystack(entry);
    if (
      isBotVerificationContent(haystack) ||
      /cloudflare|cf-ray|challenge|security service|verify you are human/i.test(haystack)
    ) {
      return true;
    }
  }

  return false;
}

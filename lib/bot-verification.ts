import { pageContentHaystack } from "./gateway-errors";
import type { BotVerificationDiagnostic } from "./bot-verification-diagnostics";
import type { CrawlData, PageData } from "./types";

export const BOT_VERIFICATION_SCAN_STATUS = "bot_verification_blocked";

export const BOT_VERIFICATION_MESSAGE =
  "This storefront is actively challenging automated scanners.";

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
  diagnostic: BotVerificationDiagnostic;

  constructor(diagnostic?: BotVerificationDiagnostic, message?: string) {
    super(message ?? diagnostic?.message ?? BOT_VERIFICATION_MESSAGE);
    this.name = "BotVerificationBlockedError";
    this.diagnostic =
      diagnostic ??
      ({
        title: "Bot Verification Detected",
        message: BOT_VERIFICATION_MESSAGE,
        meaning:
          "This storefront is actively challenging automated scanners. Merchant Signals is not necessarily at fault—the site is protecting itself from automated traffic.",
        confidence: "high",
        provider: "unknown",
      } satisfies BotVerificationDiagnostic);
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

function detectBotProvider(input: {
  bodyText?: string | null;
  headers?: Headers | Record<string, string>;
}): BotVerificationDiagnostic["provider"] {
  const bodyText = input.bodyText ?? "";
  const server = readResponseHeader(input.headers, "server")?.toLowerCase() ?? "";
  const cfRay = readResponseHeader(input.headers, "cf-ray");

  if (cfRay || /cloudflare/i.test(bodyText) || server.includes("cloudflare")) {
    return "cloudflare";
  }

  if (/perimeterx|datadome|akamai|incapsula|distil/i.test(bodyText)) {
    return "enterprise_waf";
  }

  return "unknown";
}

export function buildBotVerificationDiagnostic(input?: {
  bodyText?: string | null;
  headers?: Headers | Record<string, string>;
  status?: number | null;
}): BotVerificationDiagnostic {
  const provider = detectBotProvider(input ?? {});
  const providerLabel =
    provider === "cloudflare"
      ? "Cloudflare or similar edge protection"
      : provider === "enterprise_waf"
        ? "Enterprise bot mitigation"
        : "Storefront security service";

  return {
    title: "Bot Verification Detected",
    message: BOT_VERIFICATION_MESSAGE,
    meaning: `This storefront is actively challenging automated scanners through ${providerLabel}. That does not mean Merchant Signals is broken—the site is choosing to verify automated traffic before serving content.`,
    confidence: "high",
    provider,
    httpStatus: input?.status ?? null,
  };
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

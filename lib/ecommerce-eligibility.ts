import type { CrawlData, Finding, PageData, PlatformAnalysis } from "./types";

export const ECOMMERCE_CONFIDENCE_THRESHOLD = 50;

export const INVALID_NON_ECOMMERCE_SCAN_STATUS = "invalid_non_ecommerce_site";

export const NON_ECOMMERCE_SCAN_MESSAGE =
  "We could not verify that this domain operates an ecommerce storefront.\n\nCommerce Optimizer is designed for online stores that sell products or services through a storefront, shopping cart, or checkout experience.\n\nThis domain does not currently appear to contain enough ecommerce signals for a valid commerce audit.\n\nExamples of supported sites include Shopify, BigCommerce, WooCommerce, Salesforce Commerce Cloud, Adobe Commerce, commercetools, and other online storefronts.\n\nIf you believe this result is incorrect, please contact us using the Contact page.";

export interface EcommerceEligibilityAssessment {
  eligible: boolean;
  ecommerceConfidence: number;
  reason: string;
  message: string;
  signals: string[];
}

export class EcommerceIneligibleError extends Error {
  readonly assessment: EcommerceEligibilityAssessment;

  constructor(assessment: EcommerceEligibilityAssessment) {
    super(assessment.message);
    this.name = "EcommerceIneligibleError";
    this.assessment = assessment;
  }
}

const PARKED_CONTENT_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /this domain is parked/i, reason: "parked_domain" },
  { pattern: /domain is parked/i, reason: "parked_domain" },
  { pattern: /this web page is parked/i, reason: "parked_domain" },
  { pattern: /domain for sale/i, reason: "domain_broker" },
  { pattern: /buy this domain/i, reason: "domain_broker" },
  { pattern: /this domain may be for sale/i, reason: "domain_broker" },
  { pattern: /is for sale/i, reason: "domain_broker" },
  { pattern: /website coming soon/i, reason: "coming_soon" },
  { pattern: /this site is coming soon/i, reason: "coming_soon" },
  { pattern: /under construction/i, reason: "coming_soon" },
  { pattern: /site is under construction/i, reason: "coming_soon" },
  { pattern: /parked free/i, reason: "parked_domain" },
  { pattern: /registered with namecheap/i, reason: "parked_domain" },
  { pattern: /namecheap parking/i, reason: "parked_domain" },
  { pattern: /parked free,?\s*courtesy of godaddy/i, reason: "parked_domain" },
  { pattern: /registered at 1&1|registered with ionos/i, reason: "parked_domain" },
  { pattern: /hugedomains\.com|sedo\.com|afternic\.com|dan\.com/i, reason: "domain_broker" },
  { pattern: /squarespace.*coming soon/i, reason: "coming_soon" },
];

const PARKED_URL_PATTERNS = [
  /parked\.godaddy/i,
  /wsimg\.com/i,
  /sedoparking/i,
  /parkingcrew/i,
  /namecheap\.com\/parking/i,
];

function isFindingDetected(findings: Finding[], id: string): boolean {
  return findings.find((finding) => finding.id === id)?.status === "detected";
}

function collectPageText(pages: PageData[]): string {
  return pages
    .map((page) =>
      [page.title, page.metaDescription, page.bodyTextSnippet, page.htmlSnippet]
        .filter(Boolean)
        .join(" "),
    )
    .join(" ");
}

function collectPageUrls(pages: PageData[]): string {
  return pages.map((page) => page.url).join(" ");
}

function detectHoldingPageTitle(pages: PageData[]): { reason: string } | null {
  const holdingTitle = /^(coming soon|website coming soon|under construction)$/i;

  for (const page of pages) {
    const title = page.title?.trim();
    if (title && holdingTitle.test(title)) {
      return { reason: "coming_soon" };
    }
  }

  return null;
}

function detectParkedDomain(
  text: string,
  urls: string,
  pages: PageData[],
): { reason: string } | null {
  const holdingTitle = detectHoldingPageTitle(pages);
  if (holdingTitle) {
    return holdingTitle;
  }

  const haystack = `${text} ${urls}`;

  for (const { pattern, reason } of PARKED_CONTENT_PATTERNS) {
    if (pattern.test(haystack)) {
      return { reason };
    }
  }

  for (const pattern of PARKED_URL_PATTERNS) {
    if (pattern.test(urls)) {
      return { reason: "parked_domain" };
    }
  }

  return null;
}

function hasCrawlableContent(pages: PageData[]): boolean {
  return pages.some(
    (page) =>
      page.status !== null &&
      page.status < 400 &&
      Boolean(
        page.title ||
          page.metaDescription ||
          page.bodyTextSnippet ||
          page.htmlSnippet ||
          page.jsonLdBlocks.length > 0,
      ),
  );
}

function computeConfidenceScore(
  findings: Finding[],
  platform: PlatformAnalysis,
): { score: number; signals: string[] } {
  let score = 0;
  const signals: string[] = [];

  if (isFindingDetected(findings, "product-pages")) {
    score += 25;
    signals.push("product_pages");
  }

  if (isFindingDetected(findings, "product-schema")) {
    score += 20;
    signals.push("product_schema");
  }

  if (isFindingDetected(findings, "cart-checkout-pages")) {
    score += 20;
    signals.push("cart_detected");
  }

  if (isFindingDetected(findings, "checkout-cart-links")) {
    score += 20;
    signals.push("checkout_detected");
  }

  if (isFindingDetected(findings, "offer-schema")) {
    score += 15;
    signals.push("offer_schema");
  }

  if (platform.platform !== "Unknown") {
    score += 10;
    signals.push("platform_identified");
  }

  return { score: Math.min(score, 100), signals };
}

export function assessEcommerceEligibility(input: {
  findings: Finding[];
  platform: PlatformAnalysis;
  crawlData?: CrawlData;
  pages?: PageData[];
}): EcommerceEligibilityAssessment {
  const pages = input.pages ?? input.crawlData?.pages ?? [];
  const pageText = collectPageText(pages);
  const pageUrls = collectPageUrls(pages);

  if (pages.length > 0 && !hasCrawlableContent(pages)) {
    return {
      eligible: false,
      ecommerceConfidence: 0,
      reason: "no_crawlable_content",
      message: NON_ECOMMERCE_SCAN_MESSAGE,
      signals: [],
    };
  }

  const parked = detectParkedDomain(pageText, pageUrls, pages);
  if (parked) {
    return {
      eligible: false,
      ecommerceConfidence: 0,
      reason: parked.reason,
      message: NON_ECOMMERCE_SCAN_MESSAGE,
      signals: [],
    };
  }

  const { score, signals } = computeConfidenceScore(input.findings, input.platform);
  const eligible = score >= ECOMMERCE_CONFIDENCE_THRESHOLD;

  return {
    eligible,
    ecommerceConfidence: score,
    reason: eligible ? "eligible" : "insufficient_storefront_signals",
    message: NON_ECOMMERCE_SCAN_MESSAGE,
    signals,
  };
}

export function assertEcommerceEligible(input: {
  findings: Finding[];
  platform: PlatformAnalysis;
  crawlData?: CrawlData;
  pages?: PageData[];
}): EcommerceEligibilityAssessment {
  const assessment = assessEcommerceEligibility(input);

  if (!assessment.eligible) {
    throw new EcommerceIneligibleError(assessment);
  }

  return assessment;
}

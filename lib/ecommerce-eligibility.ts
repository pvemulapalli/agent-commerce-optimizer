import { isGatewayErrorContent, pageContentHaystack } from "./gateway-errors";
import { normalizeSchemaType } from "./schema-utils";
import type {
  CommercePlatform,
  CrawlData,
  Finding,
  GenerationPageSnapshot,
  PageData,
  PlatformAnalysis,
} from "./types";

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

const CORE_STOREFRONT_FINDING_IDS = [
  "product-pages",
  "product-schema",
  "offer-schema",
  "catalog-pages",
  "collection-pages",
  "category-pages",
  "product-prices",
] as const;

const DEDICATED_ECOMMERCE_PLATFORMS = new Set<CommercePlatform>([
  "Shopify",
  "BigCommerce",
  "WooCommerce",
  "Magento",
  "Salesforce Commerce Cloud",
  "CommerceTools",
]);

const NON_ECOMMERCE_BUSINESS_SCHEMA_TYPES = new Set([
  "localbusiness",
  "restaurant",
  "foodestablishment",
  "cafeorcoffeeshop",
  "bakery",
  "barorpub",
  "fastfoodrestaurant",
  "governmentorganization",
  "educationalorganization",
  "school",
  "collegeoruniversity",
  "highschool",
  "elementaryschool",
  "middleschool",
  "preschool",
  "newsmediaorganization",
  "blog",
  "medicalorganization",
  "physician",
  "dentist",
  "hospital",
  "legalservice",
  "professionalservice",
  "realestateagent",
  "travelagency",
  "sportsactivitylocation",
  "gym",
  "church",
  "nonprofit",
  "ngo",
  "performinggroup",
  "library",
  "museum",
  "park",
]);

function pagesFromGenerationSnapshots(
  snapshots: GenerationPageSnapshot[],
): PageData[] {
  return snapshots.map((snapshot) => ({
    url: snapshot.url,
    title: snapshot.title,
    metaDescription: snapshot.metaDescription,
    bodyTextSnippet: null,
    htmlSnippet: null,
    jsonLdBlocks: snapshot.jsonLdBlocks,
    schemaTypes: snapshot.schemaTypes,
    discoveredLinks: [],
    internalLinks: [],
    status: 200,
  }));
}

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

function hasCoreStorefrontSignal(findings: Finding[]): boolean {
  return CORE_STOREFRONT_FINDING_IDS.some((id) => isFindingDetected(findings, id));
}

function pageHasNonEcommerceBusinessSchema(page: PageData): boolean {
  return page.schemaTypes.some((type) =>
    NON_ECOMMERCE_BUSINESS_SCHEMA_TYPES.has(normalizeSchemaType(type)),
  );
}

function detectNonEcommerceBusinessSite(
  pages: PageData[],
  findings: Finding[],
): { reason: string } | null {
  if (hasCoreStorefrontSignal(findings)) {
    return null;
  }

  const hasBusinessSchema = pages.some((page) => pageHasNonEcommerceBusinessSchema(page));
  if (hasBusinessSchema) {
    return { reason: "non_ecommerce_business" };
  }

  return null;
}

function isHealthyCrawlPage(page: PageData): boolean {
  if (page.status === null || page.status >= 400) {
    return false;
  }

  if (isGatewayErrorContent(pageContentHaystack(page))) {
    return false;
  }

  return Boolean(
    page.title ||
      page.metaDescription ||
      page.bodyTextSnippet ||
      page.htmlSnippet ||
      page.jsonLdBlocks.length > 0,
  );
}

function hasCrawlableContent(pages: PageData[]): boolean {
  return pages.some(isHealthyCrawlPage);
}

function computeConfidenceScore(
  findings: Finding[],
  platform: PlatformAnalysis,
): { score: number; signals: string[] } {
  let score = 0;
  const signals: string[] = [];
  const hasCoreSignals = hasCoreStorefrontSignal(findings);

  if (isFindingDetected(findings, "product-pages")) {
    score += 25;
    signals.push("product_pages");
  }

  if (isFindingDetected(findings, "product-schema")) {
    score += 20;
    signals.push("product_schema");
  }

  if (hasCoreSignals && isFindingDetected(findings, "cart-checkout-pages")) {
    score += 20;
    signals.push("cart_detected");
  }

  if (hasCoreSignals && isFindingDetected(findings, "checkout-cart-links")) {
    score += 20;
    signals.push("checkout_detected");
  }

  if (isFindingDetected(findings, "offer-schema")) {
    score += 15;
    signals.push("offer_schema");
  }

  const platformCounts =
    platform.platform !== "Unknown" &&
    (DEDICATED_ECOMMERCE_PLATFORMS.has(platform.platform) || hasCoreSignals);

  if (platformCounts) {
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
  generationPages?: GenerationPageSnapshot[];
}): EcommerceEligibilityAssessment {
  const pages =
    input.pages ??
    input.crawlData?.pages ??
    pagesFromGenerationSnapshots(input.generationPages ?? []);
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

  const nonEcommerceBusiness = detectNonEcommerceBusinessSite(pages, input.findings);
  if (nonEcommerceBusiness) {
    return {
      eligible: false,
      ecommerceConfidence: 0,
      reason: nonEcommerceBusiness.reason,
      message: NON_ECOMMERCE_SCAN_MESSAGE,
      signals: [],
    };
  }

  const { score, signals } = computeConfidenceScore(input.findings, input.platform);
  const eligible =
    hasCoreStorefrontSignal(input.findings) &&
    score >= ECOMMERCE_CONFIDENCE_THRESHOLD;

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
  generationPages?: GenerationPageSnapshot[];
}): EcommerceEligibilityAssessment {
  const assessment = assessEcommerceEligibility(input);

  if (!assessment.eligible) {
    throw new EcommerceIneligibleError(assessment);
  }

  return assessment;
}

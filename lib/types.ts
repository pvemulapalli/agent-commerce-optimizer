export type FindingStatus = "detected" | "missing" | "needs_review";

export type ConfidenceLevel = "high" | "medium" | "low";

export type CommercePlatform =
  | "Shopify"
  | "BigCommerce"
  | "Salesforce Commerce Cloud"
  | "WooCommerce"
  | "Wix"
  | "Squarespace"
  | "Magento"
  | "CommerceTools"
  | "Unknown";

export type LinkContext = "footer" | "nav" | "header" | "body";

export type LinkScope = "same-origin" | "related-domain";

export interface DiscoveredLink {
  href: string;
  text: string;
  ariaLabel: string | null;
  titleAttr: string | null;
  context: LinkContext;
  discoveredFromUrl: string;
  scope: LinkScope;
}

/** @deprecated Use discoveredLinks — kept for compatibility during migration */
export type InternalLink = Pick<DiscoveredLink, "href" | "text">;

export interface Finding {
  id: string;
  label: string;
  status: FindingStatus;
  confidence: ConfidenceLevel;
  evidence: string;
  evidenceUrls: string[];
  sourceUrl: string;
  discoveredFromUrl: string | null;
}

export interface PlatformAnalysis {
  platform: CommercePlatform;
  confidence: ConfidenceLevel;
  evidence: string[];
  sourceUrls: string[];
}

export interface PageData {
  url: string;
  title: string | null;
  metaDescription: string | null;
  bodyTextSnippet: string | null;
  htmlSnippet: string | null;
  jsonLdBlocks: unknown[];
  schemaTypes: string[];
  discoveredLinks: DiscoveredLink[];
  internalLinks: InternalLink[];
  status: number | null;
  error?: string;
}

export interface ResourceFetch {
  url: string;
  status: number | null;
  content: string | null;
  contentType: string | null;
  error?: string;
}

export interface SitemapCrawlInfo {
  sitemapUrls: string[];
  urlsDiscovered: number;
  urlsSelected: string[];
  urlsCrawled: string[];
}

export interface RelatedDomainCrawlInfo {
  urlsSelected: string[];
  urlsCrawled: string[];
}

export interface CrawlData {
  entryUrl: string;
  origin: string;
  pages: PageData[];
  resources: {
    robotsTxt: ResourceFetch;
    sitemapXml: ResourceFetch;
    llmsTxt: ResourceFetch;
    llmsFullTxt: ResourceFetch;
  };
  sitemap: SitemapCrawlInfo;
  relatedDomain: RelatedDomainCrawlInfo;
  crawledAt: string;
}

export interface AuditResult {
  url: string;
  crawledAt: string;
  platform: PlatformAnalysis;
  findings: Finding[];
}

export interface GroupedFindings {
  detected: Finding[];
  missing: Finding[];
  needsReview: Finding[];
}

export interface MerchantFixture {
  platform: CommercePlatform;
  merchant: string;
  url: string;
}

export interface MerchantValidationResult {
  merchant: string;
  url: string;
  expectedPlatform: CommercePlatform;
  detectedPlatform: CommercePlatform;
  platformConfidence: ConfidenceLevel;
  platformMatch: boolean;
  crawledAt: string;
  findingCounts: {
    detected: number;
    missing: number;
    needsReview: number;
  };
  error?: string;
}

export interface LinkMatch {
  href: string;
  text: string;
  discoveredFromUrl: string;
  scope: LinkScope;
  context: LinkContext;
}

export interface ProductPriceDetection {
  finding: Finding | null;
  evidenceUrls: string[];
  sourceUrl: string | null;
}

import type { HostingProfile } from "./hosting-profile";

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
  | "VTEX"
  | "Fenicio"
  | "Shopware"
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

/** Why a signal could not be conclusively verified (additive; older clients ignore). */
export type VerificationLimitation =
  | "auth"
  | "crawl_budget"
  | "fetch_error"
  | "password_gate"
  | null;

export type FindingEvidenceKind =
  | "url"
  | "content"
  | "link"
  | "schema"
  | "resource"
  | "sitemap"
  | "inferred"
  | "unable_to_verify";

export interface Finding {
  id: string;
  label: string;
  status: FindingStatus;
  confidence: ConfidenceLevel;
  evidence: string;
  evidenceUrls: string[];
  sourceUrl: string;
  discoveredFromUrl: string | null;
  /** Optional: how the signal was evidenced. */
  evidenceKind?: FindingEvidenceKind;
  /** Optional: crawl/auth limitation that prevented a definitive missing/detected call. */
  verificationLimitation?: VerificationLimitation;
}

export interface PlatformAnalysis {
  platform: CommercePlatform;
  confidence: ConfidenceLevel;
  /** Weighted signal score mapped to 0–100 before threshold checks. */
  confidenceScore: number;
  evidence: string[];
  sourceUrls: string[];
  /** Mix of storefront assets, JS bundles, URL patterns, and hosting (10% cap). */
  signalBreakdown?: {
    storefrontAssets: number;
    jsBundles: number;
    urlPatterns: number;
    ipHosting: number;
  };
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
  /** Set when the response is a Shopify storefront password gate. */
  passwordGated?: boolean;
  verificationLimitation?: VerificationLimitation;
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
  /** Same-origin sitemap URLs not selected due to the fetch budget. */
  urlsSkippedByBudget?: string[];
  /** Collection/category PLP URLs discovered in the sitemap (selected or not). */
  collectionUrlsDiscovered?: string[];
}

export type StorefrontAccessState = "none" | "unlocked" | "required_unmet";

export interface CrawlCoverageCounts {
  product: number;
  collection: number;
  policy: number;
  other: number;
}

/** Public crawl diagnostics — never includes cookies or passwords. */
export interface CrawlCoverage {
  urlsDiscovered: number;
  urlsSelected: number;
  urlsFetched: number;
  urlsSucceeded: number;
  blockedByPasswordGate: number;
  redirectedToPassword: number;
  fetchFailed: number;
  skippedByBudget: number;
  pageClassCounts: CrawlCoverageCounts;
  storefrontAccess: StorefrontAccessState;
  collectionUrlsDiscovered: number;
  collectionUrlsFetched: number;
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
  hosting?: HostingProfile;
  sitemap: SitemapCrawlInfo;
  relatedDomain: RelatedDomainCrawlInfo;
  crawledAt: string;
  coverage?: CrawlCoverage;
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

export type CacheStatus = "HIT" | "MISS" | "BYPASS";

export interface AuditApiResponse extends AuditResult {
  grouped: GroupedFindings;
  cacheStatus: CacheStatus;
  expiresAt: string | null;
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

export interface GenerationPageSnapshot {
  url: string;
  title: string | null;
  metaDescription: string | null;
  schemaTypes: string[];
  jsonLdBlocks: unknown[];
}

export interface GenerationResourceSnapshot {
  url: string;
  status: number | null;
  content: string | null;
}

export interface GenerationSupportLink {
  href: string;
  text: string;
  discoveredFromUrl: string;
}

export interface GenerationContext {
  auditedUrl: string;
  origin: string;
  crawledAt: string;
  platform: PlatformAnalysis;
  findings: Finding[];
  pages: GenerationPageSnapshot[];
  robotsTxt: GenerationResourceSnapshot;
  sitemapXml: GenerationResourceSnapshot;
  llmsTxt: GenerationResourceSnapshot;
  llmsFullTxt: GenerationResourceSnapshot;
  sitemapUrls: string[];
  supportLinks: GenerationSupportLink[];
  productPageUrls: string[];
  homepage: GenerationPageSnapshot | null;
  faqPages: GenerationPageSnapshot[];
}

export interface GeneratedAsset {
  filename: string;
  contentType: string;
  content: string;
}

export interface GenerateFixesApiResponse {
  auditedUrl: string;
  generatedAt: string;
  assets: GeneratedAsset[];
  cacheStatus?: CacheStatus;
}

export type ReportType = "full" | "partial";

export type TechnologyDetectionStatus = "completed" | "failed";

export type SiteType = "ecommerce" | "unknown" | "non_ecommerce";

export type FullAuditFailureReason =
  | "bot_verification"
  | "forbidden"
  | "rate_limited"
  | "server_error"
  | "timeout"
  | "redirect_loop"
  | "ssl_error"
  | "dns_error"
  | "non_ecommerce"
  | "unknown";

export interface InternalDetectionEvidence {
  matchedSignalCategories: string[];
  confidenceInputs: {
    confidence: ConfidenceLevel;
    confidenceScore: number;
  };
  detectionNotes: string[];
  responseHeaderSignals: string[];
  cookieSignals: string[];
  scriptReferences: string[];
  stylesheetReferences: string[];
  metaTags: string[];
  canonicalUrl: string | null;
}

export interface TechnologyDetectionResult {
  domain: string;
  normalizedDomain: string;
  detectedPlatform: PlatformAnalysis;
  platformConfidence: ConfidenceLevel;
  siteType: SiteType;
  detectionStatus: TechnologyDetectionStatus;
  publicDetectionSummary: string;
  internalDetectionEvidence: InternalDetectionEvidence;
  entryUrl: string;
  crawledAt: string;
}

export interface FullAuditFailureInfo {
  reason: FullAuditFailureReason;
  title: string;
  message: string;
  suggestedNextSteps: string[];
  httpStatus?: number | null;
}

export interface PartialReportResponse {
  reportType: "partial";
  scanStatus: "partial_report";
  url: string;
  crawledAt: string;
  cacheStatus: CacheStatus;
  technologyDetection: TechnologyDetectionResult;
  fullAuditFailure: FullAuditFailureInfo;
  reportId?: string;
  shareUrl?: string;
}

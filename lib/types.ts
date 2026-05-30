export type FindingStatus = "detected" | "missing" | "needs_review";

export interface Finding {
  id: string;
  label: string;
  status: FindingStatus;
  evidence: string;
  sourceUrl: string;
}

export interface InternalLink {
  href: string;
  text: string;
}

export interface PageData {
  url: string;
  title: string | null;
  metaDescription: string | null;
  jsonLdBlocks: unknown[];
  schemaTypes: string[];
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
  crawledAt: string;
}

export interface AuditResult {
  url: string;
  crawledAt: string;
  findings: Finding[];
}

export interface GroupedFindings {
  detected: Finding[];
  missing: Finding[];
  needsReview: Finding[];
}

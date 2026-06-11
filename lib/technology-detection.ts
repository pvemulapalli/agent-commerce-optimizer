import * as cheerio from "cheerio";
import { normalizeAuditUrl } from "./audit-url";
import { normalizeDomainFromUrl } from "./domain-normalization";
import {
  BotVerificationBlockedError,
  buildBotVerificationDiagnostic,
  isBotVerificationResponse,
} from "./bot-verification";
import { fetchShallowEntryPage } from "./crawler";
import {
  DomainUnreachableError,
  ensureDomainResolvable,
} from "./domain-reachability";
import {
  gatewayErrorMessage,
  isGatewayErrorContent,
  isGenericHttpBlockPage,
} from "./gateway-errors";
import { detectPlatform } from "./platform";
import { buildPublicPlatformEvidence } from "./platform-evidence-display";
import {
  applyPlatformOverride,
  getPlatformOverride,
} from "./platform-overrides";
import {
  buildScanFailureDiagnostic,
  buildScanFailureFromFetchError,
  buildScanFailureFromPageFetch,
} from "./scan-failure-diagnostics";
import type {
  ConfidenceLevel,
  CrawlData,
  InternalDetectionEvidence,
  PlatformAnalysis,
  SiteType,
  TechnologyDetectionResult,
} from "./types";

function emptyResources(origin: string) {
  const empty = (path: string) => ({
    url: `${origin}${path}`,
    status: null,
    content: null,
    contentType: null,
  });

  return {
    robotsTxt: empty("/robots.txt"),
    sitemapXml: empty("/sitemap.xml"),
    llmsTxt: empty("/llms.txt"),
    llmsFullTxt: empty("/llms-full.txt"),
  };
}

function inferSiteType(platform: PlatformAnalysis): SiteType {
  if (platform.platform === "Unknown") {
    return "unknown";
  }

  return "ecommerce";
}

function extractHtmlSignals(html: string | null): Pick<
  InternalDetectionEvidence,
  | "scriptReferences"
  | "stylesheetReferences"
  | "metaTags"
  | "canonicalUrl"
  | "responseHeaderSignals"
  | "cookieSignals"
> {
  if (!html) {
    return {
      scriptReferences: [],
      stylesheetReferences: [],
      metaTags: [],
      canonicalUrl: null,
      responseHeaderSignals: [],
      cookieSignals: [],
    };
  }

  const $ = cheerio.load(html);
  const scriptReferences = $("script[src]")
    .map((_, element) => $(element).attr("src") ?? "")
    .get()
    .filter(Boolean)
    .slice(0, 12);
  const stylesheetReferences = $('link[rel="stylesheet"][href]')
    .map((_, element) => $(element).attr("href") ?? "")
    .get()
    .filter(Boolean)
    .slice(0, 12);
  const metaTags = $("meta")
    .map((_, element) => {
      const name = $(element).attr("name") ?? $(element).attr("property");
      const content = $(element).attr("content");
      if (!name || !content) {
        return "";
      }
      return `${name}=${content.slice(0, 120)}`;
    })
    .get()
    .filter(Boolean)
    .slice(0, 12);
  const canonicalUrl = $('link[rel="canonical"]').attr("href")?.trim() ?? null;

  return {
    scriptReferences,
    stylesheetReferences,
    metaTags,
    canonicalUrl,
    responseHeaderSignals: [],
    cookieSignals: [],
  };
}

function buildInternalEvidence(
  platform: PlatformAnalysis,
  htmlSignals: ReturnType<typeof extractHtmlSignals>,
): InternalDetectionEvidence {
  const matchedSignalCategories = platform.signalBreakdown
    ? Object.entries(platform.signalBreakdown)
        .filter(([, value]) => value > 0)
        .map(([key]) => key)
    : [];

  return {
    matchedSignalCategories,
    confidenceInputs: {
      confidence: platform.confidence,
      confidenceScore: platform.confidenceScore,
    },
    detectionNotes: platform.evidence.slice(0, 12),
    ...htmlSignals,
  };
}

function buildPublicSummary(platform: PlatformAnalysis): string {
  if (platform.platform === "Unknown") {
    return "Storefront commerce patterns were analyzed, but a definitive platform label could not be established with sufficient confidence.";
  }

  if (platform.confidence === "high") {
    return "Multiple storefront technology signals were detected.";
  }

  return buildPublicPlatformEvidence(platform)[0] ?? "Storefront technology indicators were detected.";
}

async function resolvePlatformAnalysis(
  url: string,
  platform: PlatformAnalysis,
): Promise<PlatformAnalysis> {
  const override = await getPlatformOverride(url);
  return override ? applyPlatformOverride(platform, override) : platform;
}

function assertTechnologyDetectionReachable(page: Awaited<ReturnType<typeof fetchShallowEntryPage>>): void {
  const snippet = page.htmlSnippet ?? "";
  const status = page.status ?? 0;

  if (
    isBotVerificationResponse({
      status,
      bodyText: snippet,
      headers: new Headers(),
    })
  ) {
    throw new BotVerificationBlockedError(
      buildBotVerificationDiagnostic({
        status,
        bodyText: snippet,
        headers: new Headers(),
      }),
    );
  }

  if (isGatewayErrorContent(snippet)) {
    throw new DomainUnreachableError(
      buildScanFailureDiagnostic("gateway_error", {
        message: gatewayErrorMessage(snippet),
      }),
    );
  }

  if (status === 403) {
    throw new DomainUnreachableError(
      buildScanFailureDiagnostic("blocked_403", { httpStatus: 403 }),
    );
  }

  if (
    (status === 404 || status === 410) &&
    isGenericHttpBlockPage(snippet, status)
  ) {
    throw new DomainUnreachableError(
      buildScanFailureDiagnostic("blocked_403", { httpStatus: status }),
    );
  }

  if (status === 429) {
    throw new DomainUnreachableError(
      buildScanFailureDiagnostic("rate_limited_429", { httpStatus: 429 }),
    );
  }

  if (status >= 500) {
    throw new DomainUnreachableError(
      buildScanFailureDiagnostic("origin_5xx", { httpStatus: status }),
    );
  }

  if (status === 404 || status === 410) {
    throw new DomainUnreachableError(
      buildScanFailureDiagnostic("not_found", { httpStatus: status }),
    );
  }

  if (status !== 200 || !page.htmlSnippet) {
    throw new DomainUnreachableError(buildScanFailureFromPageFetch(page));
  }
}

export async function runTechnologyDetection(url: string): Promise<TechnologyDetectionResult> {
  const normalizedUrl = normalizeAuditUrl(url);
  const normalizedDomain = normalizeDomainFromUrl(normalizedUrl);
  const domain = new URL(normalizedUrl).hostname;
  const crawledAt = new Date().toISOString();

  await ensureDomainResolvable(normalizedUrl);

  let page: Awaited<ReturnType<typeof fetchShallowEntryPage>>;

  try {
    page = await fetchShallowEntryPage(normalizedUrl);
  } catch (error) {
    throw new DomainUnreachableError(buildScanFailureFromFetchError(error));
  }

  assertTechnologyDetectionReachable(page);

  const entryUrl = page.url;
  const origin = new URL(entryUrl).origin;
  const crawlData: CrawlData = {
    entryUrl,
    origin,
    pages: [page],
    resources: emptyResources(origin),
    sitemap: {
      sitemapUrls: [],
      urlsDiscovered: 0,
      urlsSelected: [],
      urlsCrawled: [],
    },
    relatedDomain: {
      urlsSelected: [],
      urlsCrawled: [],
    },
    crawledAt,
  };

  const detectedPlatform = await resolvePlatformAnalysis(entryUrl, detectPlatform(crawlData));
  const htmlSignals = extractHtmlSignals(page.htmlSnippet);
  const platformConfidence: ConfidenceLevel = detectedPlatform.confidence;

  return {
    domain,
    normalizedDomain,
    detectedPlatform,
    platformConfidence,
    siteType: inferSiteType(detectedPlatform),
    detectionStatus: "completed",
    publicDetectionSummary: buildPublicSummary(detectedPlatform),
    internalDetectionEvidence: buildInternalEvidence(detectedPlatform, htmlSignals),
    entryUrl,
    crawledAt,
  };
}

export function buildTechnologyDetectionFromAudit(audit: {
  url: string;
  crawledAt: string;
  platform: PlatformAnalysis;
}): TechnologyDetectionResult {
  const normalizedDomain = normalizeDomainFromUrl(audit.url);
  const domain = new URL(audit.url).hostname;
  const htmlSignals = extractHtmlSignals(null);

  return {
    domain,
    normalizedDomain,
    detectedPlatform: audit.platform,
    platformConfidence: audit.platform.confidence,
    siteType: inferSiteType(audit.platform),
    detectionStatus: "completed",
    publicDetectionSummary: buildPublicSummary(audit.platform),
    internalDetectionEvidence: buildInternalEvidence(audit.platform, htmlSignals),
    entryUrl: audit.url,
    crawledAt: audit.crawledAt,
  };
}

export function isTechnologyDetectionFailure(error: unknown): boolean {
  return (
    error instanceof BotVerificationBlockedError ||
    error instanceof DomainUnreachableError
  );
}

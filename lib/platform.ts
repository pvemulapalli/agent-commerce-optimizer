import type { CommercePlatform, ConfidenceLevel, CrawlData } from "./types";
import { aggregateConfidence, uniqueUrls } from "./schema-utils";

interface PlatformSignal {
  platform: CommercePlatform;
  label: string;
  weight: number;
  sourceUrl: string;
}

const PLATFORM_LABELS: Record<CommercePlatform, string> = {
  Shopify: "Shopify",
  BigCommerce: "BigCommerce",
  "Salesforce Commerce Cloud": "Salesforce Commerce Cloud (Demandware)",
  WooCommerce: "WooCommerce",
  Wix: "Wix",
  Squarespace: "Squarespace",
  Magento: "Magento",
  CommerceTools: "CommerceTools",
  Unknown: "Unknown",
};

function collectHtmlSignals(data: CrawlData): PlatformSignal[] {
  const signals: PlatformSignal[] = [];
  const htmlSources = [
    ...data.pages.map((page) => ({
      url: page.url,
      content: [page.htmlSnippet ?? "", page.bodyTextSnippet ?? ""].join(" "),
    })),
    ...Object.values(data.resources)
      .filter((resource) => resource.content)
      .map((resource) => ({ url: resource.url, content: resource.content ?? "" })),
  ];

  for (const source of htmlSources) {
    const content = source.content;
    const urlLower = source.url.toLowerCase();

    if (
      /cdn\.shopify\.com/i.test(content) ||
      /shopify\.theme/i.test(content) ||
      /shopify-features/i.test(content) ||
      /\/\/cdn\.shopify/i.test(content)
    ) {
      signals.push({
        platform: "Shopify",
        label: "Shopify CDN or storefront assets detected",
        weight: 3,
        sourceUrl: source.url,
      });
    }

    if (/\/cart\.js|\/cart\/add|shopify\.com\/s\/files/i.test(content + urlLower)) {
      signals.push({
        platform: "Shopify",
        label: "Shopify cart endpoint or storefront asset detected",
        weight: 3,
        sourceUrl: source.url,
      });
    }

    if (/\/products\/[\w-]+\.js\b/i.test(content + urlLower)) {
      signals.push({
        platform: "Shopify",
        label: "Shopify product JSON endpoint detected",
        weight: 3,
        sourceUrl: source.url,
      });
    }

    if (/bigcommerce\.com|stencil\.bundle|bc-sf-filter/i.test(content)) {
      signals.push({
        platform: "BigCommerce",
        label: "BigCommerce or Stencil storefront assets detected",
        weight: 3,
        sourceUrl: source.url,
      });
    }

    if (/demandware\.net|demandware\.store|dw\.ac|dwanalytics|sfcc/i.test(content)) {
      signals.push({
        platform: "Salesforce Commerce Cloud",
        label: "Demandware / SFCC storefront assets detected",
        weight: 3,
        sourceUrl: source.url,
      });
    }

    if (
      /wp-content\/plugins\/woocommerce|woocommerce/i.test(content) ||
      /wp-json\/wc\//i.test(content + urlLower)
    ) {
      signals.push({
        platform: "WooCommerce",
        label: "WooCommerce assets or wp-json store API detected",
        weight: 3,
        sourceUrl: source.url,
      });
    }

    if (/static\.wixstatic\.com|wixstores|wix-ecommerce|wix\.com/i.test(content)) {
      signals.push({
        platform: "Wix",
        label: "Wix runtime or Wix Stores assets detected",
        weight: 3,
        sourceUrl: source.url,
      });
    }

    if (/squarespace\.com|squarespace-commerce|static1\.squarespace/i.test(content)) {
      signals.push({
        platform: "Squarespace",
        label: "Squarespace commerce assets detected",
        weight: 3,
        sourceUrl: source.url,
      });
    }

    if (/mage\/cookies|magento|mage-cache-storage|catalog\/product/i.test(content)) {
      signals.push({
        platform: "Magento",
        label: "Magento assets or catalog structures detected",
        weight: 3,
        sourceUrl: source.url,
      });
    }

    if (/commercetools\.com|composable-commerce|commercetools/i.test(content)) {
      signals.push({
        platform: "CommerceTools",
        label: "CommerceTools composable commerce assets detected",
        weight: 3,
        sourceUrl: source.url,
      });
    }
  }

  return signals;
}

function collectUrlSignals(data: CrawlData): PlatformSignal[] {
  const signals: PlatformSignal[] = [];
  const urls = [
    ...data.pages.map((page) => page.url),
    ...data.sitemap.urlsSelected,
    ...data.sitemap.urlsCrawled,
  ];

  for (const url of urls) {
    const lower = url.toLowerCase();

    if (/\/products\/[^/?#]+/i.test(lower)) {
      signals.push({
        platform: "Shopify",
        label: "Shopify product URL structure detected",
        weight: 2,
        sourceUrl: url,
      });
    }

    if (
      /\/collections\/[^/?#]+/i.test(lower) &&
      !/\/c\/collections\//i.test(lower)
    ) {
      signals.push({
        platform: "Shopify",
        label: "Shopify collection URL structure detected",
        weight: 2,
        sourceUrl: url,
      });
    }

    if (/\/cart\b|\/checkout\b/i.test(lower) && /myshopify|shopify/i.test(lower)) {
      signals.push({
        platform: "Shopify",
        label: "Shopify cart or checkout URL detected",
        weight: 2,
        sourceUrl: url,
      });
    }

    if (/\/[\w-]+\/p\/|\/categories\//i.test(lower)) {
      signals.push({
        platform: "BigCommerce",
        label: "BigCommerce product or category URL structure detected",
        weight: 2,
        sourceUrl: url,
      });
    }

    if (/\/on\/demandware\.store\//i.test(lower)) {
      signals.push({
        platform: "Salesforce Commerce Cloud",
        label: "SFCC Demandware storefront URL pattern detected",
        weight: 3,
        sourceUrl: url,
      });
    }

    if (/\/p\/[^/]+\/\d+\.html/i.test(lower)) {
      signals.push({
        platform: "Salesforce Commerce Cloud",
        label: "SFCC product permalink structure detected",
        weight: 2,
        sourceUrl: url,
      });
    }

    if (/\/product\/|\/product-category\//i.test(lower)) {
      signals.push({
        platform: "WooCommerce",
        label: "WooCommerce product permalink structure detected",
        weight: 2,
        sourceUrl: url,
      });
    }

    if (/\/store\/|wixstores/i.test(lower)) {
      signals.push({
        platform: "Wix",
        label: "Wix Stores URL pattern detected",
        weight: 2,
        sourceUrl: url,
      });
    }

    if (/\/shop\/|\/commerce\//i.test(lower) && /squarespace/i.test(lower)) {
      signals.push({
        platform: "Squarespace",
        label: "Squarespace commerce URL pattern detected",
        weight: 2,
        sourceUrl: url,
      });
    }

    if (/\/catalog\/product\/|\/catalog\/category\//i.test(lower)) {
      signals.push({
        platform: "Magento",
        label: "Magento catalog URL structure detected",
        weight: 2,
        sourceUrl: url,
      });
    }
  }

  return signals;
}

function scorePlatform(signals: PlatformSignal[]): {
  platform: CommercePlatform;
  score: number;
  evidence: string[];
  sourceUrls: string[];
} | null {
  const scores = new Map<
    CommercePlatform,
    { score: number; evidence: Set<string>; sourceUrls: Set<string> }
  >();

  for (const signal of signals) {
    const current = scores.get(signal.platform) ?? {
      score: 0,
      evidence: new Set<string>(),
      sourceUrls: new Set<string>(),
    };
    current.score += signal.weight;
    current.evidence.add(signal.label);
    current.sourceUrls.add(signal.sourceUrl);
    scores.set(signal.platform, current);
  }

  const ranked = [...scores.entries()].sort((a, b) => b[1].score - a[1].score);
  if (ranked.length === 0 || ranked[0][1].score === 0) return null;

  const [platform, result] = ranked[0];
  return {
    platform,
    score: result.score,
    evidence: [...result.evidence],
    sourceUrls: [...result.sourceUrls],
  };
}

function scoreToConfidence(score: number, evidenceCount: number): ConfidenceLevel {
  if (score >= 6 || evidenceCount >= 3) return "high";
  if (score >= 3 || evidenceCount >= 2) return "medium";
  return "low";
}

export function detectPlatform(data: CrawlData) {
  const signals = [...collectHtmlSignals(data), ...collectUrlSignals(data)];
  const ranked = scorePlatform(signals);

  if (!ranked) {
    return {
      platform: "Unknown" as CommercePlatform,
      confidence: "low" as ConfidenceLevel,
      evidence: ["No platform-specific commerce signals detected"],
      sourceUrls: [data.entryUrl],
    };
  }

  return {
    platform: ranked.platform,
    confidence: scoreToConfidence(ranked.score, ranked.evidence.length),
    evidence: ranked.evidence,
    sourceUrls: uniqueUrls(ranked.sourceUrls),
  };
}

export function getPlatformLabel(platform: CommercePlatform): string {
  return PLATFORM_LABELS[platform];
}

export { aggregateConfidence };

import { getCommercetoolsDomainHint } from "./commercetools-domain-hints";
import { getFenicioDomainHint } from "./fenicio-domain-hints";
import { getMagentoDomainHint } from "./magento-domain-hints";
import { getVtexDomainHint } from "./vtex-domain-hints";
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
  Magento: "Adobe Commerce",
  VTEX: "VTEX",
  Fenicio: "Fenicio",
  CommerceTools: "CommerceTools",
  Unknown: "Unknown",
};

function isSameOriginPage(url: string, origin: string): boolean {
  try {
    return new URL(url).origin === origin;
  } catch {
    return false;
  }
}

function getStorefrontPages(data: CrawlData): CrawlData["pages"] {
  return data.pages.filter((page) => isSameOriginPage(page.url, data.origin));
}

function collectHtmlSignals(data: CrawlData): PlatformSignal[] {
  const signals: PlatformSignal[] = [];
  const htmlSources = [
    ...getStorefrontPages(data).map((page) => ({
      url: page.url,
      content: [
        page.htmlSnippet ?? "",
        page.bodyTextSnippet ?? "",
        JSON.stringify(page.jsonLdBlocks ?? []),
      ].join(" "),
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

    if (
      /demandware\.net|\/on\/demandware\.store|demandware\.store\/|dw\.ac=|dwanalytics|\bsfcc\b/i.test(
        content,
      )
    ) {
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

    if (
      /data-mage-init|text\/x-magento-init|Magento_Ui|mage\/requirejs|requirejs-config\.js/i.test(
        content,
      )
    ) {
      signals.push({
        platform: "Magento",
        label: "Magento RequireJS or mage-init bootstrap detected",
        weight: 3,
        sourceUrl: source.url,
      });
    }

    if (
      /\/static\/frontend\/|\/pub\/static\/|mage-cache-storage|form-key|x-magento-vary/i.test(
        content + urlLower,
      )
    ) {
      signals.push({
        platform: "Magento",
        label: "Magento static frontend or cache signatures detected",
        weight: 3,
        sourceUrl: source.url,
      });
    }

    if (
      /mage\/cookies|magento|catalog\/product\/view|customer\/section\/load|price-box|data-product-id/i.test(
        content,
      )
    ) {
      signals.push({
        platform: "Magento",
        label: "Magento catalog, customer, or product runtime detected",
        weight: 3,
        sourceUrl: source.url,
      });
    }

    if (
      /adobe-client-data-layer|adobeDataLayer|@adobe\/magento|commerce\.adobe|hyva-themes|checkoutConfig|secure_base_url/i.test(
        content,
      )
    ) {
      signals.push({
        platform: "Magento",
        label: "Adobe Commerce / Magento storefront runtime detected",
        weight: 3,
        sourceUrl: source.url,
      });
    }

    if (
      /\/rest\/(?:default\/)?V1\/|\/graphql\b|media\/catalog\/product|magentoStorefrontEvents/i.test(
        content + urlLower,
      )
    ) {
      signals.push({
        platform: "Magento",
        label: "Magento REST, GraphQL, or catalog media endpoints detected",
        weight: 3,
        sourceUrl: source.url,
      });
    }

    if (
      /vtexassets\.com|vteximg\.com|vtexcommercestable|vtexcdn\.com|vtexio\.net|checkout\.vtex\.com/i.test(
        content + urlLower,
      )
    ) {
      signals.push({
        platform: "VTEX",
        label: "VTEX CDN or commerce runtime assets detected",
        weight: 3,
        sourceUrl: source.url,
      });
    }

    if (
      /__RUNTIME__|vtex\.pixel|render-runtime|vtex\.store|vtex\.id|io\.vtex|vtexcms|vtex\.js/i.test(
        content,
      )
    ) {
      signals.push({
        platform: "VTEX",
        label: "VTEX IO runtime or storefront scripts detected",
        weight: 3,
        sourceUrl: source.url,
      });
    }

    if (/api\/catalog_system|vtex\.minicart|vtexcommerce/i.test(content + urlLower)) {
      signals.push({
        platform: "VTEX",
        label: "VTEX catalog API or minicart integration detected",
        weight: 3,
        sourceUrl: source.url,
      });
    }

    if (
      /fnstatic\.com|fno-api|fnotecommerce|store\.fenicio|fenicio-store|fncommerce|fenicio ecommerce/i.test(
        content + urlLower,
      )
    ) {
      signals.push({
        platform: "Fenicio",
        label: "Fenicio storefront assets or API endpoints detected",
        weight: 3,
        sourceUrl: source.url,
      });
    }

    if (/\bfenicio\b/i.test(content) && /\/cart|checkout|product|tienda/i.test(content)) {
      signals.push({
        platform: "Fenicio",
        label: "Fenicio commerce runtime markers detected",
        weight: 2,
        sourceUrl: source.url,
      });
    }

    if (
      /commercetools\.com|commercetools\.io|composable-commerce|commercetools/i.test(
        content,
      ) ||
      /commerceToolsAttributes|commerceToolsApi|@commercetools|frontastic/i.test(
        content,
      )
    ) {
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

function crawlHasWooCommerceHtml(data: CrawlData): boolean {
  const haystack = getStorefrontPages(data)
    .map((page) =>
      [page.htmlSnippet, page.bodyTextSnippet, JSON.stringify(page.jsonLdBlocks)].join(" "),
    )
    .join(" ");

  return /wp-content\/plugins\/woocommerce|woocommerce|wp-json\/wc\//i.test(haystack);
}

function collectUrlSignals(data: CrawlData): PlatformSignal[] {
  const signals: PlatformSignal[] = [];
  const urls = [
    ...getStorefrontPages(data).map((page) => page.url),
    ...data.sitemap.urlsSelected.filter((url) => isSameOriginPage(url, data.origin)),
    ...data.sitemap.urlsCrawled.filter((url) => isSameOriginPage(url, data.origin)),
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

    if (/\/product-category\//i.test(lower)) {
      signals.push({
        platform: "WooCommerce",
        label: "WooCommerce product category URL structure detected",
        weight: 2,
        sourceUrl: url,
      });
    }

    if (/\/product\//i.test(lower) && crawlHasWooCommerceHtml(data)) {
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

    if (
      /\/catalog\/product\/|\/catalog\/category\/|\/checkout\/cart|\/customer\/account/i.test(
        lower,
      )
    ) {
      signals.push({
        platform: "Magento",
        label: "Magento catalog or checkout URL structure detected",
        weight: 2,
        sourceUrl: url,
      });
    }

    if (/\/p\b|\/checkout\/#\/|\/account\/#/i.test(lower)) {
      signals.push({
        platform: "VTEX",
        label: "VTEX product or checkout URL pattern detected",
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

function shouldApplyDomainHint(
  ranked: { platform: CommercePlatform; score: number } | null,
  platform: CommercePlatform,
): boolean {
  if (!ranked) {
    return true;
  }

  if (ranked.platform === platform) {
    return true;
  }

  return ranked.score < 6;
}

function applyDomainHintOverride(input: {
  entryUrl: string;
  ranked: ReturnType<typeof scorePlatform>;
  hint: string;
  platform: CommercePlatform;
}) {
  const evidence =
    input.ranked?.platform === input.platform
      ? [...input.ranked.evidence, input.hint]
      : [input.hint, ...(input.ranked?.evidence ?? [])];

  const score = input.ranked?.platform === input.platform ? input.ranked.score + 2 : 4;

  return {
    platform: input.platform,
    confidence: scoreToConfidence(score, evidence.length),
    evidence: [...new Set(evidence)],
    sourceUrls: uniqueUrls([input.entryUrl, ...(input.ranked?.sourceUrls ?? [])]),
  };
}

export function detectPlatform(data: CrawlData) {
  const signals = [...collectHtmlSignals(data), ...collectUrlSignals(data)];
  const ranked = scorePlatform(signals);

  const commercetoolsHint = getCommercetoolsDomainHint(data.entryUrl);
  if (commercetoolsHint && shouldApplyDomainHint(ranked, "CommerceTools")) {
    return applyDomainHintOverride({
      entryUrl: data.entryUrl,
      ranked,
      hint: commercetoolsHint,
      platform: "CommerceTools",
    });
  }

  const vtexHint = getVtexDomainHint(data.entryUrl);
  if (vtexHint && shouldApplyDomainHint(ranked, "VTEX")) {
    return applyDomainHintOverride({
      entryUrl: data.entryUrl,
      ranked,
      hint: vtexHint,
      platform: "VTEX",
    });
  }

  const fenicioHint = getFenicioDomainHint(data.entryUrl);
  if (fenicioHint && shouldApplyDomainHint(ranked, "Fenicio")) {
    return applyDomainHintOverride({
      entryUrl: data.entryUrl,
      ranked,
      hint: fenicioHint,
      platform: "Fenicio",
    });
  }

  const magentoHint = getMagentoDomainHint(data.entryUrl);
  if (magentoHint && shouldApplyDomainHint(ranked, "Magento")) {
    return applyDomainHintOverride({
      entryUrl: data.entryUrl,
      ranked,
      hint: magentoHint,
      platform: "Magento",
    });
  }

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

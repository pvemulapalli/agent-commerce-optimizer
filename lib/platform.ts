import {
  crawlHasBigCommerceContext,
  hasBigCommerceCatalystMarker,
  hasBigCommerceStencilCdn,
} from "./bigcommerce-fingerprints";
import { getCommercetoolsDomainHint, hasVerifiedCommercetoolsDomainHint } from "./commercetools-domain-hints";
import { crawlHasCommercetoolsContext } from "./commercetools-fingerprints";
import { getFenicioDomainHint } from "./fenicio-domain-hints";
import { getMagentoDomainHint } from "./magento-domain-hints";
import { getShopwareDomainHint } from "./shopware-domain-hints";
import { crawlHasShopifyHtml } from "./shopify-fingerprints";
import { isMyshopifyHostname } from "./shopify-storefront-password";
import {
  crawlHasShopwareContext,
  isShopwareRobotsTxt,
} from "./shopware-fingerprints";
import { getVtexDomainHint } from "./vtex-domain-hints";
import {
  formatHostingEvidence,
  inferPlatformHostingHints,
} from "./hosting-profile";
import {
  type CategorizedPlatformSignal,
  computeWeightedConfidenceScore,
  countPrimarySignals,
  meetsPlatformAssignmentThreshold,
  rankPlatformCandidates,
} from "./platform-scoring";
import type { CommercePlatform, ConfidenceLevel, CrawlData, PlatformAnalysis } from "./types";
import { aggregateConfidence, uniqueUrls } from "./schema-utils";

type PlatformSignal = CategorizedPlatformSignal;

function storefrontSignal(
  platform: CommercePlatform,
  label: string,
  sourceUrl: string,
  weight = 3,
): PlatformSignal {
  return { platform, label, weight, category: "storefront_assets", sourceUrl };
}

function jsBundleSignal(
  platform: CommercePlatform,
  label: string,
  sourceUrl: string,
  weight = 3,
): PlatformSignal {
  return { platform, label, weight, category: "js_bundles", sourceUrl };
}

function urlPatternSignal(
  platform: CommercePlatform,
  label: string,
  sourceUrl: string,
  weight = 2,
): PlatformSignal {
  return { platform, label, weight, category: "url_patterns", sourceUrl };
}

function hostingSignal(
  platform: CommercePlatform,
  label: string,
  sourceUrl: string,
  weight = 1,
): PlatformSignal {
  return { platform, label, weight, category: "ip_hosting", sourceUrl };
}

function toSignalBreakdown(categoryScores: Record<PlatformSignal["category"], number>) {
  return {
    storefrontAssets: categoryScores.storefront_assets,
    jsBundles: categoryScores.js_bundles,
    urlPatterns: categoryScores.url_patterns,
    ipHosting: categoryScores.ip_hosting,
  };
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
  Shopware: "Shopware",
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
      signals.push(
        storefrontSignal(
          "Shopify",
          "Shopify CDN or storefront assets detected",
          source.url,
        ),
      );
    }

    if (/\/cart\.js|\/cart\/add|shopify\.com\/s\/files/i.test(content + urlLower)) {
      signals.push(
        storefrontSignal(
          "Shopify",
          "Shopify cart endpoint or storefront asset detected",
          source.url,
        ),
      );
    }

    if (/\/products\/[\w-]+\.js\b/i.test(content + urlLower)) {
      signals.push(
        jsBundleSignal(
          "Shopify",
          "Shopify product JSON endpoint detected",
          source.url,
        ),
      );
    }

    if (/stencil\.bundle|bc-sf-filter/i.test(content)) {
      signals.push(
        jsBundleSignal(
          "BigCommerce",
          "BigCommerce Stencil JS bundle detected",
          source.url,
        ),
      );
    }

    if (hasBigCommerceStencilCdn(content)) {
      signals.push(
        storefrontSignal(
          "BigCommerce",
          "BigCommerce Stencil CDN assets detected",
          source.url,
        ),
      );
    }

    if (hasBigCommerceCatalystMarker(content)) {
      signals.push(
        storefrontSignal(
          "BigCommerce",
          "BigCommerce Catalyst headless storefront detected",
          source.url,
        ),
      );
    }

    if (/microapps\.bigcommerce\.com/i.test(content)) {
      signals.push(
        jsBundleSignal(
          "BigCommerce",
          "BigCommerce microapps runtime detected",
          source.url,
        ),
      );
    }

    if (/graphql\.bigcommerce\.com/i.test(content)) {
      signals.push(
        jsBundleSignal(
          "BigCommerce",
          "BigCommerce GraphQL API reference detected",
          source.url,
        ),
      );
    }

    if (/cdn\d+\.bigcommerce\.com|bigcommerce\.com\/s\/[\w-]+/i.test(content)) {
      signals.push(
        storefrontSignal(
          "BigCommerce",
          "BigCommerce storefront assets detected",
          source.url,
        ),
      );
    }

    if (
      /demandware\.net|\/on\/demandware\.store|demandware\.store\/|dw\.ac=|dwanalytics|\bsfcc\b/i.test(
        content,
      )
    ) {
      signals.push(
        storefrontSignal(
          "Salesforce Commerce Cloud",
          "Demandware / SFCC storefront assets detected",
          source.url,
        ),
      );
    }

    if (/wp-json\/wc\//i.test(content + urlLower)) {
      signals.push(
        jsBundleSignal(
          "WooCommerce",
          "WooCommerce store API scripts detected",
          source.url,
        ),
      );
    }

    if (/wp-content\/plugins\/woocommerce|woocommerce/i.test(content)) {
      signals.push(
        storefrontSignal(
          "WooCommerce",
          "WooCommerce storefront assets detected",
          source.url,
        ),
      );
    }

    if (/static\.wixstatic\.com|wixstores|wix-ecommerce|wix\.com/i.test(content)) {
      signals.push(
        storefrontSignal("Wix", "Wix runtime or Wix Stores assets detected", source.url),
      );
    }

    if (/squarespace\.com|squarespace-commerce|static1\.squarespace/i.test(content)) {
      signals.push(
        storefrontSignal(
          "Squarespace",
          "Squarespace commerce assets detected",
          source.url,
        ),
      );
    }

    if (
      /data-mage-init|text\/x-magento-init|Magento_Ui|Magento_Enterprise|mage\/requirejs|requirejs-config\.js|magepack\/requirejs-config/i.test(
        content,
      )
    ) {
      signals.push(
        jsBundleSignal(
          "Magento",
          "Magento RequireJS or mage-init bootstrap detected",
          source.url,
        ),
      );
    }

    if (
      /\/static\/(?:version\d+\/)?frontend\/|\/pub\/static\/|mage-cache-storage|form-key|x-magento-vary/i.test(
        content + urlLower,
      )
    ) {
      signals.push(
        storefrontSignal(
          "Magento",
          "Magento static frontend or cache signatures detected",
          source.url,
        ),
      );
    }

    if (
      /mage\/cookies|catalog\/product\/view|customer\/section\/load|price-box|data-product-id/i.test(
        content,
      )
    ) {
      signals.push(
        storefrontSignal(
          "Magento",
          "Magento catalog, customer, or product runtime detected",
          source.url,
        ),
      );
    }

    if (
      /adobe-client-data-layer|adobeDataLayer|@adobe\/magento|commerce\.adobe|hyva-themes|checkoutConfig|secure_base_url/i.test(
        content,
      )
    ) {
      signals.push(
        jsBundleSignal(
          "Magento",
          "Adobe Commerce / Magento storefront runtime detected",
          source.url,
        ),
      );
    }

    if (
      /\/rest\/(?:default\/)?V1\/|\/graphql\b|media\/catalog\/product|magentoStorefrontEvents/i.test(
        content + urlLower,
      )
    ) {
      signals.push(
        storefrontSignal(
          "Magento",
          "Magento REST, GraphQL, or catalog media endpoints detected",
          source.url,
        ),
      );
    }

    if (
      /vtexassets\.com|vteximg\.com|vtexcommercestable|vtexcdn\.com|vtexio\.net|checkout\.vtex\.com/i.test(
        content + urlLower,
      )
    ) {
      signals.push(
        storefrontSignal(
          "VTEX",
          "VTEX CDN or commerce runtime assets detected",
          source.url,
        ),
      );
    }

    if (
      /__RUNTIME__|vtex\.pixel|render-runtime|vtex\.store|vtex\.id|io\.vtex|vtexcms|vtex\.js/i.test(
        content,
      )
    ) {
      signals.push(
        jsBundleSignal(
          "VTEX",
          "VTEX IO runtime or storefront scripts detected",
          source.url,
        ),
      );
    }

    if (/api\/catalog_system|vtex\.minicart|vtexcommerce/i.test(content + urlLower)) {
      signals.push(
        storefrontSignal(
          "VTEX",
          "VTEX catalog API or minicart integration detected",
          source.url,
        ),
      );
    }

    if (
      /fnstatic\.com|fno-api|fnotecommerce|store\.fenicio|fenicio-store|fncommerce|fenicio\.app|fenicio\.io|f\.fcdn\.app|fenicio ecommerce/i.test(
        content + urlLower,
      )
    ) {
      signals.push(
        storefrontSignal(
          "Fenicio",
          "Fenicio CDN or hosted commerce assets detected",
          source.url,
        ),
      );
    }

    if (/fenicio ecommerce/i.test(content)) {
      signals.push(
        storefrontSignal(
          "Fenicio",
          "Fenicio storefront branding detected",
          source.url,
        ),
      );
    }

    if (
      /\bfenicio\b/i.test(content) &&
      /\/cart|checkout|product|tienda|\/catalogo|fenicio\.app|f\.fcdn\.app|mi-cuenta/i.test(
        content + urlLower,
      )
    ) {
      signals.push(
        storefrontSignal(
          "Fenicio",
          "Fenicio commerce runtime markers detected",
          source.url,
          2,
        ),
      );
    }

    if (
      /commercetools\.com|commercetools\.io|composable-commerce|commercetools-frontend/i.test(
        content,
      )
    ) {
      signals.push(
        storefrontSignal(
          "CommerceTools",
          "CommerceTools composable commerce assets detected",
          source.url,
          3,
        ),
      );
    }

    if (
      /commerceToolsAttributes|commerceToolsApi|@commercetools|frontastic|projectKey|ct-api/i.test(
        content,
      )
    ) {
      signals.push(
        jsBundleSignal(
          "CommerceTools",
          "CommerceTools SDK or API runtime markers detected",
          source.url,
          4,
        ),
      );
    }

    if (/api\.(?:europe-west1|australia-southeast1)\.gcp\.commercetools\.com/i.test(content)) {
      signals.push(
        jsBundleSignal(
          "CommerceTools",
          "CommerceTools hosted API endpoint detected",
          source.url,
          4,
        ),
      );
    }

    if (/commercetools-frontend-sdk|@commercetools-frontend/i.test(content)) {
      signals.push(
        jsBundleSignal(
          "CommerceTools",
          "CommerceTools frontend SDK bundle detected",
          source.url,
          4,
        ),
      );
    }

    if (/frontastic|composable frontends/i.test(content)) {
      signals.push(
        storefrontSignal(
          "CommerceTools",
          "Frontastic composable storefront markers detected",
          source.url,
          3,
        ),
      );
    }

    if (
      /\/js\/storefront\/storefront\.js|\/storefront\/storefront\.js/i.test(
        content + urlLower,
      )
    ) {
      signals.push(
        jsBundleSignal(
          "Shopware",
          "Shopware storefront JavaScript bundle detected",
          source.url,
          4,
        ),
      );
    }

    if (/\/theme\/[a-f0-9]+\/js\/all\.js/i.test(content + urlLower)) {
      signals.push(
        jsBundleSignal(
          "Shopware",
          "Shopware theme JavaScript bundle detected",
          source.url,
          3,
        ),
      );
    }

    if (/\/js\/swag-[a-z0-9-]+\//i.test(content + urlLower)) {
      signals.push(
        jsBundleSignal(
          "Shopware",
          "Shopware official plugin bundle detected",
          source.url,
          4,
        ),
      );
    }

    if (/shopware/i.test(content)) {
      signals.push(
        storefrontSignal(
          "Shopware",
          "Shopware storefront assets detected",
          source.url,
          3,
        ),
      );
    }

    if (urlLower.includes("robots.txt") && isShopwareRobotsTxt(content)) {
      signals.push(
        storefrontSignal(
          "Shopware",
          "Shopware robots.txt route fingerprint detected",
          source.url,
          4,
        ),
      );
    }

    if (/Shopware\s*>=\s*5|document\.asyncReady/i.test(content)) {
      signals.push(
        jsBundleSignal(
          "Shopware",
          "Shopware 5/6 async storefront bootstrap detected",
          source.url,
          3,
        ),
      );
    }

    if (/<sw-[a-z0-9-]+|data-sw-[a-z0-9-]+=/i.test(content)) {
      signals.push(
        storefrontSignal(
          "Shopware",
          "Shopware Storefront web components detected",
          source.url,
          3,
        ),
      );
    }

    if (/\/store-api\//i.test(content + urlLower)) {
      signals.push(
        storefrontSignal(
          "Shopware",
          "Shopware Store API endpoints detected",
          source.url,
          3,
        ),
      );
    }

    if (
      /\/bundles\//i.test(content + urlLower) &&
      /shopware|\/theme\/|storefront|swag-/i.test(content + urlLower)
    ) {
      signals.push(
        storefrontSignal(
          "Shopware",
          "Shopware bundle assets detected",
          source.url,
          2,
        ),
      );
    }

    if (
      /sw-cookie|sw-environment|sw-base-url|sw-features|sw-state-token|sw-context-token/i.test(
        content,
      )
    ) {
      signals.push(
        storefrontSignal(
          "Shopware",
          "Shopware runtime configuration detected",
          source.url,
          3,
        ),
      );
    }

    if (/s3sw-/i.test(content + urlLower)) {
      signals.push(
        storefrontSignal(
          "Shopware",
          "Shopware hosted storefront CDN detected",
          source.url,
          3,
        ),
      );
    }
  }

  return signals;
}

function crawlHasMagentoHtml(data: CrawlData): boolean {
  const haystack = getStorefrontPages(data)
    .map((page) =>
      [page.htmlSnippet, page.bodyTextSnippet, JSON.stringify(page.jsonLdBlocks)].join(" "),
    )
    .join(" ");

  return /data-mage-init|text\/x-magento-init|Magento_Ui|Magento_Enterprise|mage\/requirejs|magentoStorefrontEvents|magepack\/requirejs-config/i.test(
    haystack,
  );
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

    if (crawlHasShopifyHtml(data) && /\/products\/[^/?#]+/i.test(lower)) {
      signals.push(
        urlPatternSignal("Shopify", "Shopify product URL structure detected", url),
      );
    }

    if (
      crawlHasShopifyHtml(data) &&
      /\/collections\/[^/?#]+/i.test(lower) &&
      !/\/c\/collections\//i.test(lower)
    ) {
      signals.push(
        urlPatternSignal("Shopify", "Shopify collection URL structure detected", url),
      );
    }

    if (/\/cart\b|\/checkout\b/i.test(lower) && /myshopify|shopify/i.test(lower)) {
      signals.push(
        urlPatternSignal("Shopify", "Shopify cart or checkout URL detected", url),
      );
    }

    if (
      crawlHasBigCommerceContext(data) &&
      /\/[\w-]+\/p\/|\/categories\//i.test(lower)
    ) {
      signals.push(
        urlPatternSignal(
          "BigCommerce",
          "BigCommerce product or category URL structure detected",
          url,
        ),
      );
    }

    if (crawlHasBigCommerceContext(data) && /\/product\/[^/?#]+\/\d+/i.test(lower)) {
      signals.push(
        urlPatternSignal(
          "BigCommerce",
          "BigCommerce headless product URL structure detected",
          url,
          3,
        ),
      );
    }

    if (/\/on\/demandware\.store\//i.test(lower)) {
      signals.push(
        urlPatternSignal(
          "Salesforce Commerce Cloud",
          "SFCC Demandware storefront URL pattern detected",
          url,
          3,
        ),
      );
    }

    if (/\/p\/[^/]+\/\d+\.html/i.test(lower)) {
      signals.push(
        urlPatternSignal(
          "Salesforce Commerce Cloud",
          "SFCC product permalink structure detected",
          url,
        ),
      );
    }

    if (/\/product-category\//i.test(lower)) {
      signals.push(
        urlPatternSignal(
          "WooCommerce",
          "WooCommerce product category URL structure detected",
          url,
        ),
      );
    }

    if (/\/product\//i.test(lower) && crawlHasWooCommerceHtml(data)) {
      signals.push(
        urlPatternSignal(
          "WooCommerce",
          "WooCommerce product permalink structure detected",
          url,
        ),
      );
    }

    if (/\/store\/|wixstores/i.test(lower)) {
      signals.push(urlPatternSignal("Wix", "Wix Stores URL pattern detected", url));
    }

    if (/\/shop\/|\/commerce\//i.test(lower) && /squarespace/i.test(lower)) {
      signals.push(
        urlPatternSignal(
          "Squarespace",
          "Squarespace commerce URL pattern detected",
          url,
        ),
      );
    }

    if (
      /\/catalog\/product\/|\/catalog\/category\/|\/checkout\/cart|\/customer\/account/i.test(
        lower,
      ) &&
      crawlHasMagentoHtml(data)
    ) {
      signals.push(
        urlPatternSignal(
          "Magento",
          "Magento catalog or checkout URL structure detected",
          url,
        ),
      );
    }

    if (/\/p\b|\/checkout\/#\/|\/account\/#/i.test(lower)) {
      signals.push(
        urlPatternSignal("VTEX", "VTEX product or checkout URL pattern detected", url),
      );
    }

    if (/\/catalogo\/[^/?#]+_\d+_/i.test(lower)) {
      signals.push(
        urlPatternSignal(
          "Fenicio",
          "Fenicio catalog product URL structure detected",
          url,
          3,
        ),
      );
    }

    if (/\/catalogo(?:\/|$)/i.test(lower)) {
      signals.push(
        urlPatternSignal("Fenicio", "Fenicio catalog URL structure detected", url),
      );
    }

    if (/\/mi-cuenta(?:\/|$)/i.test(lower)) {
      signals.push(
        urlPatternSignal("Fenicio", "Fenicio account area URL structure detected", url),
      );
    }

    if (crawlHasCommercetoolsContext(data)) {
      if (/\/api\/project\/|\/graphql\b/i.test(lower)) {
        signals.push(
          urlPatternSignal(
            "CommerceTools",
            "CommerceTools API route pattern detected",
            url,
            3,
          ),
        );
      }

      if (/\/en(?:-[a-z]{2})?\/(?:shop|store|mobile|basket|checkout)\b/i.test(lower)) {
        signals.push(
          urlPatternSignal(
            "CommerceTools",
            "CommerceTools storefront route pattern detected",
            url,
            2,
          ),
        );
      }
    }

    if (crawlHasShopwareContext(data)) {
      if (/\/checkout\/cart\b/i.test(lower)) {
        signals.push(
          urlPatternSignal(
            "Shopware",
            "Shopware checkout cart URL structure detected",
            url,
            3,
          ),
        );
      }

      if (/\/detail\/[^/?#]+/i.test(lower)) {
        signals.push(
          urlPatternSignal(
            "Shopware",
            "Shopware product detail URL structure detected",
            url,
            3,
          ),
        );
      }

      if (/\/navigation\/[^/?#]+/i.test(lower)) {
        signals.push(
          urlPatternSignal(
            "Shopware",
            "Shopware navigation URL structure detected",
            url,
            2,
          ),
        );
      }
    }
  }

  return signals;
}

function collectHostingSignals(data: CrawlData): PlatformSignal[] {
  if (!data.hosting) {
    return [];
  }

  const signals: PlatformSignal[] = [];
  const hints = inferPlatformHostingHints(data.hosting);

  for (const hint of hints) {
    signals.push(
      hostingSignal(
        hint.platform,
        `${hint.label} (supporting signal)`,
        data.entryUrl,
        2,
      ),
    );
  }

  return signals;
}

function buildPlatformAnalysis(
  data: CrawlData,
  ranked: ReturnType<typeof rankPlatformCandidates>[number],
  signals: PlatformSignal[],
  extraEvidence: string[] = [],
): PlatformAnalysis {
  return {
    platform: ranked.platform,
    confidence: scoreToConfidence(ranked, signals),
    confidenceScore: ranked.confidenceScore,
    evidence: [...new Set([...ranked.evidence, ...extraEvidence])],
    sourceUrls: uniqueUrls(ranked.sourceUrls),
    signalBreakdown: toSignalBreakdown(ranked.categoryScores),
  };
}

function scoreToConfidence(
  ranked: ReturnType<typeof rankPlatformCandidates>[number],
  signals: PlatformSignal[],
): ConfidenceLevel {
  const primaryCount = countPrimarySignals(signals, ranked.platform);
  if (ranked.confidenceScore >= 85 || (ranked.primaryScore >= 9 && primaryCount >= 3)) {
    return "high";
  }
  if (meetsPlatformAssignmentThreshold(signals, ranked.platform, ranked.primaryScore)) {
    return "medium";
  }
  return "low";
}

function buildUnknownPlatformAnalysis(
  data: CrawlData,
  ranked: ReturnType<typeof rankPlatformCandidates>[number] | undefined,
): PlatformAnalysis {
  const weakEvidence =
    ranked && ranked.primaryScore > 0
      ? [
          `Insufficient primary platform signals (${ranked.primaryScore} points from storefront assets, JS bundles, and URL patterns; hosting/IP is supporting only)`,
          ...ranked.evidence.slice(0, 3),
        ]
      : ["No platform-specific commerce signals detected"];

  const hostingEvidence = data.hosting ? formatHostingEvidence(data.hosting).slice(0, 2) : [];

  return {
    platform: "Unknown",
    confidence: "low",
    confidenceScore: ranked?.confidenceScore ?? 0,
    evidence: [...weakEvidence, ...hostingEvidence],
    sourceUrls: uniqueUrls([data.entryUrl, ...(ranked?.sourceUrls ?? [])]),
    signalBreakdown: ranked ? toSignalBreakdown(ranked.categoryScores) : undefined,
  };
}

function shouldApplyDomainHint(
  ranked: ReturnType<typeof rankPlatformCandidates>[number] | undefined,
  platform: CommercePlatform,
): boolean {
  if (!ranked) {
    return true;
  }

  if (ranked.platform === platform) {
    return true;
  }

  return ranked.primaryScore < 6;
}

function applyDomainHintOverride(input: {
  entryUrl: string;
  ranked: ReturnType<typeof rankPlatformCandidates>[number] | undefined;
  hint: string;
  platform: CommercePlatform;
}): PlatformAnalysis {
  const evidence =
    input.ranked?.platform === input.platform
      ? [...input.ranked.evidence, input.hint]
      : [input.hint, ...(input.ranked?.evidence ?? [])];

  const categoryScores = {
    storefront_assets: Math.max(input.ranked?.categoryScores.storefront_assets ?? 0, 85),
    js_bundles: input.ranked?.categoryScores.js_bundles ?? 0,
    url_patterns: input.ranked?.categoryScores.url_patterns ?? 0,
    ip_hosting: input.ranked?.categoryScores.ip_hosting ?? 0,
  };

  return {
    platform: input.platform,
    confidence: "high" as ConfidenceLevel,
    confidenceScore: Math.max(85, computeWeightedConfidenceScore(categoryScores)),
    evidence: [...new Set(evidence)],
    sourceUrls: uniqueUrls([input.entryUrl, ...(input.ranked?.sourceUrls ?? [])]),
    signalBreakdown: toSignalBreakdown(categoryScores),
  };
}

export function detectPlatform(data: CrawlData): PlatformAnalysis {
  const signals = [
    ...collectHtmlSignals(data),
    ...collectUrlSignals(data),
    ...collectHostingSignals(data),
  ];
  const rankedList = rankPlatformCandidates(signals);
  const ranked = rankedList[0];

  const commercetoolsHint = getCommercetoolsDomainHint(data.entryUrl);
  if (
    commercetoolsHint &&
    (hasVerifiedCommercetoolsDomainHint(data.entryUrl) ||
      shouldApplyDomainHint(ranked, "CommerceTools"))
  ) {
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

  const shopwareHint = getShopwareDomainHint(data.entryUrl);
  if (shopwareHint && shouldApplyDomainHint(ranked, "Shopware")) {
    return applyDomainHintOverride({
      entryUrl: data.entryUrl,
      ranked,
      hint: shopwareHint,
      platform: "Shopware",
    });
  }

  try {
    if (isMyshopifyHostname(new URL(data.entryUrl).hostname)) {
      return applyDomainHintOverride({
        entryUrl: data.entryUrl,
        ranked,
        hint: "Shopify development host (*.myshopify.com)",
        platform: "Shopify",
      });
    }
  } catch {
    // Ignore invalid entry URLs.
  }

  if (
    !ranked ||
    !meetsPlatformAssignmentThreshold(signals, ranked.platform, ranked.primaryScore)
  ) {
    return buildUnknownPlatformAnalysis(data, ranked);
  }

  const hostingEvidence = data.hosting ? formatHostingEvidence(data.hosting).slice(0, 2) : [];
  return buildPlatformAnalysis(data, ranked, signals, hostingEvidence);
}

export function getPlatformLabel(platform: CommercePlatform): string {
  return PLATFORM_LABELS[platform];
}

export { aggregateConfidence };

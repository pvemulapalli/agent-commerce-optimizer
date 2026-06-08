/** Parent company / site brand */
export const PARENT_BRAND = "Merchant Signals";

/** Product built under Merchant Signals */
export const PRODUCT_NAME = "Commerce Optimizer";

export const SITE_NAME = PARENT_BRAND;

export const PRODUCT_BYLINE = `${PRODUCT_NAME} by ${PARENT_BRAND}`;

export const OPEN_GRAPH_TITLE = `${PARENT_BRAND} | ${PRODUCT_NAME}`;

export const HERO_HEADLINE = "Optimize Your Store For AI Commerce";

export const HERO_SUPPORTING_COPY =
  "Understand how AI systems discover, evaluate, and transact with your storefront.";

export const DIFFERENTIATOR_INTRO_COPY =
  "Most tools tell you if you're visible. Commerce Optimizer shows why and what\u00A0to\u00A0fix.";

export const DEFAULT_SITE_DESCRIPTION = HERO_SUPPORTING_COPY;

export const FOOTER_COPYRIGHT = `© ${new Date().getFullYear()} ${PARENT_BRAND}`;

export const ABOUT_CREATOR_BIO = [
  "Praveen Vemulapalli is a payments and commerce technology leader with experience spanning ecommerce, merchant acceptance, marketplace platforms, omnichannel commerce, and payment infrastructure.",
  "Throughout his career he has worked across software engineering, solution consulting, sales engineering, and leadership roles helping merchants and partners solve complex commerce challenges. Today he leads Sales Engineering initiatives focused on enterprise merchants and emerging commerce technologies.",
  "Outside of work, Praveen is driven by curiosity and building at the intersection of commerce and emerging technology. Merchant Signals and Commerce Optimizer reflect that focus: practical tools that help merchants improve AI discoverability and prepare for agent-driven shopping.",
] as const;

export const ABOUT_PRODUCT_INTRO =
  `${PARENT_BRAND} performs an automated storefront scan and generates an evidence-backed assessment of AI commerce readiness.`;

export const ABOUT_PRODUCT_BODY = [
  "ChatGPT, Gemini, Claude, Perplexity, and emerging AI shopping agents increasingly influence how products, policies, and merchant facts are discovered and interpreted. They rely on machine-readable signals like structured data, catalog URLs, discovery files, and commerce metadata, not just marketing copy.",
  `${PRODUCT_NAME} runs a live crawl of your public storefront and helps merchants identify discoverability gaps, missing structured signals, and missing commerce metadata. It generates remediation assets and supports ongoing improvement of AI readiness over time.`,
  `${PRODUCT_NAME} doesn't simply identify issues. It helps merchants understand what to fix and provides downloadable assets to accelerate remediation.`,
] as const;

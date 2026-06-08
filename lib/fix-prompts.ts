import type { CommercePlatform, Finding } from "./types";

const PLATFORM_PROMPT_PHRASES: Partial<Record<CommercePlatform, string>> = {
  Shopify: "Generate Shopify Liquid implementation",
  BigCommerce: "Generate BigCommerce implementation",
  "Salesforce Commerce Cloud": "Generate Salesforce Commerce Cloud implementation",
  Magento: "Generate Adobe Commerce implementation",
  VTEX: "Generate VTEX implementation",
  Fenicio: "Generate Fenicio implementation",
  Shopware: "Generate Shopware implementation",
  CommerceTools: "Generate commercetools implementation",
};

function getPlatformPhrase(platform: CommercePlatform | undefined): string {
  if (!platform || platform === "Unknown") {
    return "Generate framework-agnostic implementation.";
  }

  return PLATFORM_PROMPT_PHRASES[platform] ?? "Generate framework-agnostic implementation.";
}

function buildGenericPrompt(finding: Finding, platformPhrase: string): string {
  return `Goal:
Improve ${finding.label.toLowerCase()} for AI commerce discoverability.

Issue:
${finding.label} was not detected with sufficient evidence during the crawl.

Evidence:
${finding.evidence}

Fix:
${platformPhrase} that addresses this finding and improves machine-readable commerce signals.

Return complete implementation code and deployment instructions.`;
}

const PROMPT_BUILDERS: Record<string, (finding: Finding, platformPhrase: string) => string> = {
  "product-schema": (finding, platformPhrase) => `Goal:
Implement Product JSON-LD schema on product detail pages.

Issue:
Product schema was not detected on sampled product pages.

Evidence:
${finding.evidence}

Fix:
${platformPhrase} that adds Product JSON-LD including:

- name
- image
- description
- sku
- brand
- offers

Return complete implementation code and deployment instructions.`,
  "organization-schema": (finding, platformPhrase) => `Goal:
Add Organization structured data.

Issue:
Organization schema was not detected.

Evidence:
${finding.evidence}

Fix:
${platformPhrase} that publishes Organization JSON-LD on homepage and key landing pages.

Return complete implementation code and deployment instructions.`,
  "shipping-page": (_finding, platformPhrase) => `Goal:
Improve machine-readable merchant trust signals.

Issue:
Shipping, returns, delivery, or support policies were not detected.

Fix:
${platformPhrase} that recommends policy pages and machine-readable markup implementation.

Return complete implementation code and deployment instructions.`,
  "returns-page": (_finding, platformPhrase) => `Goal:
Improve machine-readable merchant trust signals.

Issue:
Shipping, returns, delivery, or support policies were not detected.

Fix:
${platformPhrase} that recommends policy pages and machine-readable markup implementation.

Return complete implementation code and deployment instructions.`,
  "delivery-page": (_finding, platformPhrase) => `Goal:
Improve machine-readable merchant trust signals.

Issue:
Shipping, returns, delivery, or support policies were not detected.

Fix:
${platformPhrase} that recommends policy pages and machine-readable markup implementation.

Return complete implementation code and deployment instructions.`,
  "support-page": (_finding, platformPhrase) => `Goal:
Improve machine-readable merchant trust signals.

Issue:
Shipping, returns, delivery, or support policies were not detected.

Fix:
${platformPhrase} that recommends policy pages and machine-readable markup implementation.

Return complete implementation code and deployment instructions.`,
};

export function buildFixPromptForFinding(
  finding: Finding,
  platform: CommercePlatform | undefined,
): string {
  const platformPhrase = getPlatformPhrase(platform);
  const builder = PROMPT_BUILDERS[finding.id];

  if (builder) {
    return builder(finding, platformPhrase);
  }

  return buildGenericPrompt(finding, platformPhrase);
}

export function isActionableFinding(finding: Finding): boolean {
  return finding.status === "missing" || finding.status === "needs_review";
}

export function buildAllFixPrompts(
  findings: Finding[],
  platform: CommercePlatform | undefined,
): string {
  const actionable = findings.filter(isActionableFinding);

  return actionable
    .map((finding, index) => {
      const prompt = buildFixPromptForFinding(finding, platform);
      return index === 0 ? prompt : `\n---\n\n${prompt}`;
    })
    .join("");
}

export function getPlatformLabelForPrompt(platform: CommercePlatform | undefined): string {
  if (!platform || platform === "Unknown") {
    return "Unknown platform";
  }

  if (platform === "Magento") {
    return "Adobe Commerce";
  }

  return platform;
}

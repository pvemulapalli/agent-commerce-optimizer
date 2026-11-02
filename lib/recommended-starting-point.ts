import { getFindingImpactLevel } from "./readiness-score";
import type { Finding, GroupedFindings } from "./types";

export interface RecommendedStartingPoint {
  priority: number;
  issue: string;
  whyItMatters: string;
  estimatedImpact: "High" | "Medium" | "Low";
  recommendedAction: string;
}

const DIMENSION_BUSINESS_IMPACT: Record<string, string> = {
  Discoverability:
    "AI shopping assistants rely on discovery files to find your products and policies. Without them, your storefront is harder to recommend.",
  "Agent Access":
    "AI agents need clear guidance about which pages they may use. Missing access signals reduce trust and visibility in agent-driven commerce.",
  "Catalog Readiness":
    "If product and collection pages are hard to find, AI systems struggle to understand what you sell and how to route shoppers.",
  "Structured Data":
    "Structured product and offer data helps AI systems understand pricing, availability, and product details with confidence.",
  "Merchant Information":
    "Shipping, returns, and contact policies build shopper trust. AI assistants need these signals before recommending a purchase.",
  "UCP Readiness":
    "This score reflects foundational proxies such as cart and checkout discoverability—not a verified Universal Commerce Protocol transaction.",
  "ACP Readiness":
    "This score reflects agent documentation signals such as llms.txt and on-site API docs links—not a verified Agentic Commerce Protocol integration.",
};

const FINDING_ACTIONS: Record<string, string> = {
  "sitemap.xml": "Publish sitemap.xml and reference it in robots.txt.",
  "robots.txt": "Publish a robots.txt file that allows key commerce pages and points to your sitemap.",
  "llms.txt": "Add llms.txt with links to your most important product, policy, and support pages.",
  "Product schema": "Add JSON-LD Product schema to key product pages.",
  "Offer schema": "Publish Offer schema with price and availability on product pages.",
  "Organization schema": "Add Organization schema with your brand name, logo, and support links.",
  "shipping-page": "Make shipping and delivery information easy to find from the homepage or footer.",
  "returns-page": "Publish a clear returns policy page and link it from product and checkout flows.",
  "product-pages": "Ensure product detail pages are linked from navigation, collections, and sitemap.",
};

function actionForFinding(finding: Finding): string {
  return (
    FINDING_ACTIONS[finding.id] ??
    FINDING_ACTIONS[finding.label] ??
    `Review and improve ${finding.label.toLowerCase()} so AI systems can understand this signal.`
  );
}

function whyForIssue(issue: string, finding?: Finding): string {
  if (finding && DIMENSION_BUSINESS_IMPACT[finding.label]) {
    return DIMENSION_BUSINESS_IMPACT[finding.label];
  }

  return (
    DIMENSION_BUSINESS_IMPACT[issue] ??
    "This gap limits how confidently AI systems can discover, explain, and recommend your storefront to shoppers."
  );
}

export function buildRecommendedStartingPoint(input: {
  grouped: GroupedFindings;
  topGap: string;
}): RecommendedStartingPoint {
  const candidates = [...input.grouped.missing, ...input.grouped.needsReview];
  const prioritized = [...candidates].sort((left, right) => {
    const impactOrder = { High: 0, Medium: 1, Low: 2 };
    return impactOrder[getFindingImpactLevel(left)] - impactOrder[getFindingImpactLevel(right)];
  });

  const primary =
    prioritized.find((finding) => finding.label === input.topGap) ??
    prioritized[0] ??
    input.grouped.missing[0];

  const issue = primary?.label ?? input.topGap ?? "Structured Data";

  return {
    priority: 1,
    issue,
    whyItMatters: whyForIssue(issue, primary),
    estimatedImpact: primary ? getFindingImpactLevel(primary) : "Medium",
    recommendedAction: primary
      ? actionForFinding(primary)
      : "Start with your weakest readiness dimension and address the highest-impact missing signal listed in the report.",
  };
}

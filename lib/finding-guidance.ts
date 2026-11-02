import type { Finding } from "./types";

interface FindingGuidance {
  businessImpact: string;
  potentialResult: string;
  recommendedAction: string;
}

const GUIDANCE: Record<string, FindingGuidance> = {
  "product-schema": {
    businessImpact:
      "AI shopping agents may not reliably understand individual products in your catalog.",
    potentialResult:
      "Products may appear less frequently in AI-generated shopping recommendations.",
    recommendedAction: "Publish structured Product JSON-LD on product detail pages.",
  },
  "robots-txt": {
    businessImpact:
      "AI crawlers may not know which pages they are allowed to access on your storefront.",
    potentialResult:
      "Agents may skip important catalog, policy, or checkout pages during discovery.",
    recommendedAction: "Publish a robots.txt file that allows relevant commerce paths.",
  },
  "sitemap-xml": {
    businessImpact:
      "AI systems may struggle to discover the full scope of your product catalog.",
    potentialResult:
      "Only a subset of products and policy pages may be indexed by shopping agents.",
    recommendedAction: "Publish sitemap.xml and reference it from robots.txt.",
  },
  "llms-txt": {
    businessImpact:
      "AI agents lack a curated map of your most important merchant URLs.",
    potentialResult:
      "Agents may miss policies, catalog entry points, and support content.",
    recommendedAction: "Publish llms.txt linking to products, policies, and support pages.",
  },
  "organization-schema": {
    businessImpact:
      "AI agents may not confidently identify your brand and merchant identity.",
    potentialResult:
      "Store recommendations may lack accurate brand context or trust signals.",
    recommendedAction: "Add Organization JSON-LD on your homepage or about page.",
  },
  "product-prices": {
    businessImpact:
      "AI shopping agents may not be able to quote accurate product pricing.",
    potentialResult:
      "Price-aware recommendations and comparisons may be incomplete or omitted.",
    recommendedAction: "Expose machine-readable pricing via schema or structured offers.",
  },
  "cart-checkout-pages": {
    businessImpact:
      "Cart and checkout links are foundational commerce proxies for UCP readiness scoring—not verified protocol handshakes.",
    potentialResult:
      "Agents can discover purchase paths, but this does not prove UCP capability negotiation succeeded.",
    recommendedAction: "Keep cart and checkout URLs linked from product and navigation pages.",
  },
  "faq-schema": {
    businessImpact:
      "AI assistants may not surface your FAQ content with structured confidence.",
    potentialResult:
      "Policy and support answers may be omitted from agent responses.",
    recommendedAction: "Add FAQPage JSON-LD to FAQ or help center pages.",
  },
  "shipping-page": {
    businessImpact:
      "AI agents may not find shipping and delivery policy information.",
    potentialResult:
      "Fulfillment questions may go unanswered in agent-led shopping flows.",
    recommendedAction: "Publish a clear shipping policy page linked from the storefront.",
  },
  "returns-page": {
    businessImpact:
      "Return and refund policies may be invisible to AI shopping agents.",
    potentialResult:
      "Shoppers may receive incomplete guidance on post-purchase policies.",
    recommendedAction: "Publish return policy pages linked from footer or support navigation.",
  },
  "product-pages": {
    businessImpact:
      "AI agents may not discover enough product detail pages to understand your catalog.",
    potentialResult:
      "Product discovery breadth may be limited in agent recommendations.",
    recommendedAction: "Ensure product URLs are linked from collections, sitemap, and navigation.",
  },
  "api-developer-docs": {
    businessImpact:
      "On-site developer documentation is optional for most storefronts; ACP readiness here is a documentation proxy, not proof of a live protocol integration.",
    potentialResult:
      "Absence of merchant API docs does not mean checkout or catalog APIs are unavailable at the platform layer.",
    recommendedAction:
      "Only publish developer docs when you offer a merchant-owned API. Do not invent documentation to raise the score.",
  },
};

function defaultGuidance(finding: Finding): FindingGuidance {
  if (finding.status === "detected") {
    return {
      businessImpact: `${finding.label} is present with evidence from your storefront crawl.`,
      potentialResult:
        "AI agents have a stronger signal for this commerce capability.",
      recommendedAction: "Maintain this signal as your catalog and policies evolve.",
    };
  }

  if (finding.status === "needs_review") {
    if (finding.verificationLimitation) {
      return {
        businessImpact: `${finding.label} could not be fully verified because of a crawl or access limitation (${finding.verificationLimitation}).`,
        potentialResult:
          "This is not the same as a confirmed gap. Re-scan with broader coverage or authenticated access if needed.",
        recommendedAction:
          "Confirm the page is reachable to MerchantSignals, then re-run the scan before treating this as missing.",
      };
    }

    return {
      businessImpact: `${finding.label} was partially detected and may need manual verification.`,
      potentialResult:
        "Agents may treat this signal as ambiguous until it is clarified.",
      recommendedAction: "Review the evidence URLs and confirm the signal is complete.",
    };
  }

  return {
    businessImpact: `AI shopping agents may not reliably detect ${finding.label.toLowerCase()} on your site.`,
    potentialResult:
      "This gap may reduce completeness of agent-led product and policy answers.",
    recommendedAction: `Add or improve ${finding.label.toLowerCase()} and link it from key storefront pages.`,
  };
}

export function getFindingGuidance(finding: Finding): FindingGuidance {
  return GUIDANCE[finding.id] ?? defaultGuidance(finding);
}

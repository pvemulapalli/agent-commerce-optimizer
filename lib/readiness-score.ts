import type {
  AuditApiResponse,
  Finding,
  GroupedFindings,
  PlatformAnalysis,
} from "./types";

export type ReadinessGrade = "A" | "B" | "C" | "D" | "F";

export type ReadinessDimensionId =
  | "discoverability"
  | "agentAccess"
  | "structuredData"
  | "acp"
  | "ucp"
  | "infrastructure"
  | "payments"
  | "fulfillment"
  | "platformReadiness";

export interface ReadinessDimension {
  id: ReadinessDimensionId;
  label: string;
  score: number;
}

export interface ReadinessReport {
  score: number;
  grade: ReadinessGrade;
  summaryLabel: string;
  dimensions: ReadinessDimension[];
  strengths: string[];
  opportunities: string[];
  executiveSummary: string;
  topGap: string;
  recommendations: string[];
}

const DIMENSION_LABELS: Record<ReadinessDimensionId, string> = {
  discoverability: "Discoverability",
  agentAccess: "Agent Access",
  structuredData: "Structured Data",
  acp: "ACP",
  ucp: "UCP",
  infrastructure: "Infrastructure",
  payments: "Payments",
  fulfillment: "Fulfillment",
  platformReadiness: "Platform Readiness",
};

const DIMENSION_FINDINGS: Record<ReadinessDimensionId, string[]> = {
  discoverability: [
    "sitemap-xml",
    "product-pages",
    "collection-pages",
    "category-pages",
    "catalog-pages",
    "item-list-schema",
    "website-schema",
  ],
  agentAccess: ["robots-txt", "llms-txt", "search-action-schema"],
  structuredData: [
    "product-schema",
    "offer-schema",
    "organization-schema",
    "faq-schema",
    "breadcrumb-schema",
    "website-schema",
    "item-list-schema",
  ],
  acp: ["api-developer-docs", "llms-txt"],
  ucp: ["cart-checkout-pages", "checkout-cart-links"],
  infrastructure: ["robots-txt", "sitemap-xml", "llms-txt"],
  payments: [
    "product-prices",
    "pricing-information",
    "pricing-page",
    "offer-schema",
    "cart-checkout-pages",
  ],
  fulfillment: [
    "shipping-page",
    "delivery-information",
    "returns-page",
    "return-policy-page",
    "refund-page",
    "return-portal",
    "product-availability",
  ],
  platformReadiness: [],
};

const HIGH_IMPACT_FINDINGS = new Set([
  "product-schema",
  "robots-txt",
  "sitemap-xml",
  "product-pages",
  "llms-txt",
  "organization-schema",
  "product-prices",
  "cart-checkout-pages",
]);

function scoreFinding(finding: Finding): number {
  if (finding.status === "detected") {
    if (finding.confidence === "high") return 100;
    if (finding.confidence === "medium") return 85;
    return 70;
  }

  if (finding.status === "needs_review") {
    if (finding.confidence === "high") return 55;
    if (finding.confidence === "medium") return 45;
    return 35;
  }

  return 0;
}

function scorePlatform(platform: PlatformAnalysis): number {
  if (platform.platform === "Unknown") {
    return 35;
  }

  if (platform.confidence === "high") return 92;
  if (platform.confidence === "medium") return 78;
  return 62;
}

function computeDimensionScores(
  findings: Finding[],
  platform: PlatformAnalysis,
): ReadinessDimension[] {
  const byId = new Map(findings.map((finding) => [finding.id, finding]));

  return (Object.keys(DIMENSION_LABELS) as ReadinessDimensionId[]).map((id) => {
    if (id === "platformReadiness") {
      return {
        id,
        label: DIMENSION_LABELS[id],
        score: scorePlatform(platform),
      };
    }

    const relatedIds = DIMENSION_FINDINGS[id];
    const relatedFindings = relatedIds
      .map((findingId) => byId.get(findingId))
      .filter((finding): finding is Finding => Boolean(finding));

    if (relatedFindings.length === 0) {
      return { id, label: DIMENSION_LABELS[id], score: 50 };
    }

    const total = relatedFindings.reduce(
      (sum, finding) => sum + scoreFinding(finding),
      0,
    );

    return {
      id,
      label: DIMENSION_LABELS[id],
      score: Math.round(total / relatedFindings.length),
    };
  });
}

export function computeReadinessScore(grouped: GroupedFindings): number {
  const all = [
    ...grouped.detected,
    ...grouped.missing,
    ...grouped.needsReview,
  ];

  if (all.length === 0) {
    return 0;
  }

  const total = all.reduce((sum, finding) => sum + scoreFinding(finding), 0);
  return Math.round(total / all.length);
}

export function getReadinessGrade(score: number): ReadinessGrade {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

export function getReadinessSummaryLabel(score: number): string {
  const grade = getReadinessGrade(score);

  switch (grade) {
    case "A":
      return "Excellent readiness";
    case "B":
      return "Above average readiness";
    case "C":
      return "Moderate readiness";
    case "D":
      return "Below average readiness";
    default:
      return "Limited readiness";
  }
}

function getMerchantName(audit: AuditApiResponse): string {
  try {
    const hostname = new URL(audit.url).hostname.replace(/^www\./, "");
    const label = hostname.split(".")[0] ?? hostname;
    return label.charAt(0).toUpperCase() + label.slice(1);
  } catch {
    return "This store";
  }
}

function buildRecommendations(
  opportunities: string[],
  grouped: GroupedFindings,
): string[] {
  const missingLabels = grouped.missing.map((finding) => finding.label);
  const reviewLabels = grouped.needsReview.map((finding) => finding.label);
  const recommendations: string[] = [];

  for (const dimension of opportunities.slice(0, 3)) {
    if (dimension.includes("Structured Data") && missingLabels.includes("Product schema")) {
      recommendations.push("Publish structured product data with JSON-LD Product schema.");
      continue;
    }
    if (dimension.includes("Agent Access") && missingLabels.includes("llms.txt")) {
      recommendations.push("Publish llms.txt to guide AI crawlers to key merchant URLs.");
      continue;
    }
    if (dimension.includes("Discoverability") && missingLabels.includes("sitemap.xml")) {
      recommendations.push("Ensure sitemap.xml is published and referenced in robots.txt.");
      continue;
    }
    if (dimension.includes("Payments") && missingLabels.includes("Product prices")) {
      recommendations.push("Expose machine-readable product pricing on catalog pages.");
      continue;
    }
    if (dimension.includes("Fulfillment")) {
      recommendations.push("Make shipping and return policies easy to discover from the homepage.");
      continue;
    }
    recommendations.push(`Improve ${dimension.toLowerCase()} signals surfaced in the audit.`);
  }

  if (recommendations.length === 0 && missingLabels.length > 0) {
    recommendations.push(`Address missing signals starting with ${missingLabels[0]}.`);
  }

  if (recommendations.length === 0 && reviewLabels.length > 0) {
    recommendations.push(`Review ambiguous signals starting with ${reviewLabels[0]}.`);
  }

  if (recommendations.length === 0) {
    recommendations.push("Maintain current discovery files and structured data as your catalog evolves.");
  }

  return recommendations.slice(0, 5);
}

function buildExecutiveSummaryText(
  merchant: string,
  strengths: string[],
  opportunities: string[],
  score: number,
): string {
  const strengthText =
    strengths.length > 0
      ? strengths.join(", ").toLowerCase()
      : "some baseline commerce signals";
  const opportunityText =
    opportunities.length > 0
      ? opportunities.join(", ").toLowerCase()
      : "continued structured data coverage";

  if (score >= 80) {
    return `${merchant} has strong ${strengthText}. The largest opportunities are ${opportunityText}. AI shopping agents can access the site today, but machine-readable commerce metadata can still be expanded.`;
  }

  if (score >= 60) {
    return `${merchant} shows moderate readiness with strengths in ${strengthText}. The biggest gaps are ${opportunityText}. AI agents can reach the storefront, but product and policy understanding remains limited without stronger structured signals.`;
  }

  return `${merchant} has limited AI commerce readiness today. Priority gaps include ${opportunityText}. Strengthening discovery files and structured product data should be the first focus before agents can reliably recommend products.`;
}

export function getTopGap(grouped: GroupedFindings, dimensions: ReadinessDimension[]): string {
  const weakest = [...dimensions]
    .filter((dimension) => dimension.id !== "platformReadiness")
    .sort((left, right) => left.score - right.score)[0];

  if (weakest) {
    return weakest.label;
  }

  const firstMissing = grouped.missing[0];
  if (firstMissing) {
    return firstMissing.label;
  }

  return "Structured Data";
}

export function buildReadinessReport(audit: AuditApiResponse): ReadinessReport {
  const dimensions = computeDimensionScores(audit.findings, audit.platform);
  const score = Math.round(
    dimensions.reduce((sum, dimension) => sum + dimension.score, 0) /
      dimensions.length,
  );
  const grade = getReadinessGrade(score);
  const summaryLabel = getReadinessSummaryLabel(score);

  const ranked = [...dimensions].sort((left, right) => right.score - left.score);
  const strengths = ranked.slice(0, 3).map((dimension) => dimension.label);
  const opportunities = [...dimensions]
    .sort((left, right) => left.score - right.score)
    .slice(0, 3)
    .map((dimension) => dimension.label);

  const merchant = getMerchantName(audit);
  const executiveSummary = buildExecutiveSummaryText(
    merchant,
    strengths,
    opportunities,
    score,
  );
  const topGap = getTopGap(audit.grouped, dimensions);
  const recommendations = buildRecommendations(opportunities, audit.grouped);

  return {
    score,
    grade,
    summaryLabel,
    dimensions,
    strengths,
    opportunities,
    executiveSummary,
    topGap,
    recommendations,
  };
}

export function getFindingImpactLevel(finding: Finding): "High" | "Medium" | "Low" {
  if (HIGH_IMPACT_FINDINGS.has(finding.id)) {
    return finding.status === "missing" ? "High" : "Medium";
  }

  if (finding.confidence === "high") return "Medium";
  return "Low";
}

export function getFindingStatusLabel(
  status: Finding["status"],
): "Passed" | "Missing" | "Needs Review" {
  if (status === "detected") return "Passed";
  if (status === "missing") return "Missing";
  return "Needs Review";
}

/** @deprecated Use buildReadinessReport().score */
export function computeDiscoverabilityScore(grouped: GroupedFindings): number {
  return computeReadinessScore(grouped);
}

/** @deprecated Use getReadinessSummaryLabel */
export function getDiscoverabilityScoreLabel(score: number): string {
  return getReadinessSummaryLabel(score);
}

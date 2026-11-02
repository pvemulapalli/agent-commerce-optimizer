import { resolveMerchantDisplayName } from "./merchant-name";
import { formatPlatformDisplay } from "./platform-labels";
import {
  CURRENT_SCORING_MODEL_VERSION,
  OPTIONAL_STOREFRONT_FINDING_IDS,
  SCORING_MODEL_EVIDENCE_V1,
  type ScoringModelVersion,
} from "./scoring-model";
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
  | "catalogReadiness"
  | "structuredData"
  | "merchantInformation"
  | "ucpReadiness"
  | "acpReadiness"
  | "platformReadiness";

export interface ReadinessDimension {
  id: ReadinessDimensionId;
  label: string;
  score: number;
  /** Finding labels used to compute this score — evidence traceability */
  evidenceLabels: string[];
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
  scoringModelVersion: ScoringModelVersion;
}

export const SCORE_EVIDENCE_NOTE =
  "Scores are derived from evidence-backed findings collected during the scan. UCP/ACP dimensions measure foundational readiness proxies (cart/checkout discoverability and agent documentation signals), not verified protocol transactions.";

const DIMENSION_LABELS: Record<ReadinessDimensionId, string> = {
  discoverability: "Discoverability",
  agentAccess: "Agent Access",
  catalogReadiness: "Catalog Readiness",
  structuredData: "Structured Data",
  merchantInformation: "Merchant Information",
  ucpReadiness: "UCP Readiness",
  acpReadiness: "ACP Readiness",
  platformReadiness: "Platform Readiness",
};

const DIMENSION_FINDINGS: Record<
  Exclude<ReadinessDimensionId, "platformReadiness">,
  string[]
> = {
  discoverability: ["robots-txt", "sitemap-xml"],
  agentAccess: ["robots-txt", "llms-txt", "search-action-schema"],
  catalogReadiness: [
    "product-pages",
    "collection-pages",
    "category-pages",
    "catalog-pages",
  ],
  structuredData: [
    "product-schema",
    "offer-schema",
    "organization-schema",
    "faq-schema",
    "breadcrumb-schema",
    "item-list-schema",
    "search-action-schema",
  ],
  merchantInformation: [
    "shipping-page",
    "delivery-information",
    "returns-page",
    "return-policy-page",
    "refund-page",
    "return-portal",
    "help-center",
    "faq-page",
    "contact-page",
    "contact-support",
  ],
  ucpReadiness: ["cart-checkout-pages", "checkout-cart-links"],
  acpReadiness: ["api-developer-docs", "llms-txt"],
};

const HIGH_IMPACT_FINDINGS = new Set([
  "product-schema",
  "robots-txt",
  "sitemap-xml",
  "product-pages",
  "llms-txt",
  "organization-schema",
  "faq-schema",
]);

function scoreFindingLegacy(finding: Finding): number {
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

function scoreFindingEvidenceV1(finding: Finding): number {
  if (finding.status === "detected") {
    return scoreFindingLegacy(finding);
  }

  if (finding.status === "needs_review") {
    const limitation = finding.verificationLimitation;
    if (
      limitation === "crawl_budget" ||
      limitation === "password_gate" ||
      limitation === "auth" ||
      limitation === "fetch_error"
    ) {
      // Incomplete verification — partial credit, not a hard zero.
      return 60;
    }

    if (
      OPTIONAL_STOREFRONT_FINDING_IDS.has(finding.id) &&
      finding.evidenceKind === "inferred"
    ) {
      return 50;
    }

    return scoreFindingLegacy(finding);
  }

  // Confirmed missing optional signals are softer than required catalog gaps.
  if (OPTIONAL_STOREFRONT_FINDING_IDS.has(finding.id)) {
    return 25;
  }

  return 0;
}

function scoreFinding(
  finding: Finding,
  model: ScoringModelVersion = CURRENT_SCORING_MODEL_VERSION,
): number {
  return model === SCORING_MODEL_EVIDENCE_V1
    ? scoreFindingEvidenceV1(finding)
    : scoreFindingLegacy(finding);
}

function scorePlatform(platform: PlatformAnalysis): number {
  if (platform.platform === "Unknown") {
    return 0;
  }

  if (platform.confidence === "high") return 100;
  if (platform.confidence === "medium") return 80;
  return 65;
}

function computeDimensionScore(
  id: ReadinessDimensionId,
  findings: Finding[],
  platform: PlatformAnalysis,
  model: ScoringModelVersion,
): ReadinessDimension | null {
  if (id === "platformReadiness") {
    return {
      id,
      label: DIMENSION_LABELS[id],
      score: scorePlatform(platform),
      evidenceLabels: [
        `Platform: ${formatPlatformDisplay(platform.platform)}`,
        `Detection confidence: ${platform.confidence}`,
      ],
    };
  }

  const relatedIds = DIMENSION_FINDINGS[id];
  let relatedFindings = relatedIds
    .map((findingId) => findings.find((finding) => finding.id === findingId))
    .filter((finding): finding is Finding => Boolean(finding));

  if (
    model === SCORING_MODEL_EVIDENCE_V1 &&
    (id === "catalogReadiness" || id === "merchantInformation" || id === "structuredData")
  ) {
    // Optional N/A-style needs_review findings do not dilute the denominator.
    relatedFindings = relatedFindings.filter((finding) => {
      if (
        finding.status === "needs_review" &&
        OPTIONAL_STOREFRONT_FINDING_IDS.has(finding.id) &&
        finding.evidenceKind === "inferred" &&
        !finding.verificationLimitation
      ) {
        return false;
      }
      return true;
    });
  }

  if (relatedFindings.length === 0) {
    return null;
  }

  const total = relatedFindings.reduce(
    (sum, finding) => sum + scoreFinding(finding, model),
    0,
  );

  return {
    id,
    label: DIMENSION_LABELS[id],
    score: Math.round(total / relatedFindings.length),
    evidenceLabels: relatedFindings.map((finding) => finding.label),
  };
}

function computeDimensionScores(
  findings: Finding[],
  platform: PlatformAnalysis,
  model: ScoringModelVersion,
): ReadinessDimension[] {
  return (Object.keys(DIMENSION_LABELS) as ReadinessDimensionId[])
    .map((id) => computeDimensionScore(id, findings, platform, model))
    .filter((dimension): dimension is ReadinessDimension => Boolean(dimension));
}

export function computeReadinessScore(
  grouped: GroupedFindings,
  model: ScoringModelVersion = CURRENT_SCORING_MODEL_VERSION,
): number {
  const all = [
    ...grouped.detected,
    ...grouped.missing,
    ...grouped.needsReview,
  ];

  if (all.length === 0) {
    return 0;
  }

  const total = all.reduce((sum, finding) => sum + scoreFinding(finding, model), 0);
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

function getMerchantName(
  audit: AuditApiResponse,
  merchantName?: string,
): string {
  return merchantName ?? resolveMerchantDisplayName({ url: audit.url });
}

function buildRecommendations(
  opportunities: string[],
  grouped: GroupedFindings,
): string[] {
  const missingLabels = grouped.missing.map((finding) => finding.label);
  const reviewLabels = grouped.needsReview.map((finding) => finding.label);
  const recommendations: string[] = [];

  for (const dimension of opportunities.slice(0, 3)) {
    if (
      dimension.includes("Structured Data") &&
      missingLabels.includes("Product schema")
    ) {
      recommendations.push(
        "Publish structured product data with JSON-LD Product schema.",
      );
      continue;
    }
    if (
      dimension.includes("Agent Access") &&
      missingLabels.includes("llms.txt")
    ) {
      recommendations.push(
        "Publish llms.txt to guide AI crawlers to key merchant URLs.",
      );
      continue;
    }
    if (
      dimension.includes("Discoverability") &&
      missingLabels.includes("sitemap.xml")
    ) {
      recommendations.push(
        "Ensure sitemap.xml is published and referenced in robots.txt.",
      );
      continue;
    }
    if (dimension.includes("Catalog Readiness")) {
      recommendations.push(
        "Improve catalog discoverability with clearer product and collection URLs.",
      );
      continue;
    }
    if (dimension.includes("Merchant Information")) {
      recommendations.push(
        "Make returns, shipping, FAQ, and contact policies easier for agents to find.",
      );
      continue;
    }
    recommendations.push(
      `Improve ${dimension.toLowerCase()} using the missing signals listed in your audit.`,
    );
  }

  if (recommendations.length === 0 && missingLabels.length > 0) {
    recommendations.push(
      `Address missing signals starting with ${missingLabels[0]}.`,
    );
  }

  if (recommendations.length === 0 && reviewLabels.length > 0) {
    recommendations.push(
      `Review ambiguous signals starting with ${reviewLabels[0]}.`,
    );
  }

  if (recommendations.length === 0) {
    recommendations.push(
      "Maintain discovery files and structured data as your catalog evolves.",
    );
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
      : "baseline discoverability signals";
  const opportunityText =
    opportunities.length > 0
      ? opportunities.join(", ").toLowerCase()
      : "structured data and catalog clarity";

  if (score >= 80) {
    return `${merchant} has strong ${strengthText}. The largest opportunities are ${opportunityText}. AI shopping agents can discover the site, but machine-readable catalog and policy metadata can still be expanded.`;
  }

  if (score >= 60) {
    return `${merchant} shows moderate AI discoverability with strengths in ${strengthText}. The biggest gaps are ${opportunityText}. Agents can reach the storefront, but catalog and policy understanding remains limited without stronger structured signals.`;
  }

  return `${merchant} has limited AI discoverability today. Priority gaps include ${opportunityText}. Strengthen discovery files, catalog URLs, and structured data before agents can reliably understand products and policies.`;
}

export function getTopGap(
  grouped: GroupedFindings,
  dimensions: ReadinessDimension[],
): string {
  const scored = dimensions.filter(
    (dimension) => dimension.id !== "platformReadiness",
  );
  const weakest = [...scored].sort((left, right) => left.score - right.score)[0];

  if (weakest) {
    return weakest.label;
  }

  const firstMissing = grouped.missing[0];
  if (firstMissing) {
    return firstMissing.label;
  }

  return "Structured Data";
}

export function buildReadinessReport(
  audit: AuditApiResponse,
  options?: {
    merchantName?: string;
    scoringModelVersion?: ScoringModelVersion;
  },
): ReadinessReport {
  const scoringModelVersion =
    options?.scoringModelVersion ?? CURRENT_SCORING_MODEL_VERSION;
  const dimensions = computeDimensionScores(
    audit.findings,
    audit.platform,
    scoringModelVersion,
  );

  const score =
    dimensions.length === 0
      ? 0
      : Math.round(
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

  const merchant = getMerchantName(audit, options?.merchantName);
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
    scoringModelVersion,
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
  finding?: Finding,
): "Passed" | "Missing" | "Needs Review" | "Needs Verification" {
  if (status === "detected") return "Passed";
  if (status === "missing") return "Missing";
  if (finding?.verificationLimitation) return "Needs Verification";
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

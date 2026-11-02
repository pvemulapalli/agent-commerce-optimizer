import { describe, expect, it } from "vitest";
import { extractSchemaTypes, parseJsonLdBlocks } from "@/lib/crawler";
import { runChecks } from "@/lib/checks";
import { buildReadinessReport } from "@/lib/readiness-score";
import { SCORING_MODEL_EVIDENCE_V1, SCORING_MODEL_LEGACY } from "@/lib/scoring-model";
import { generateFixAssets } from "@/lib/generate-assets";
import { buildGenerationContext } from "@/lib/generation-context";
import { makeCrawlData, makePage } from "./helpers/crawl-fixture";
import type { AuditApiResponse, Finding } from "@/lib/types";

describe("structured data extraction", () => {
  it("extracts types from @graph JSON-LD", () => {
    const { schemaTypes } = parseJsonLdBlocks([
      JSON.stringify({
        "@context": "https://schema.org",
        "@graph": [
          { "@type": "Organization", name: "Studio" },
          { "@type": "WebSite", name: "Studio" },
        ],
      }),
    ]);

    expect(schemaTypes).toContain("Organization");
    expect(schemaTypes).toContain("WebSite");
    expect(extractSchemaTypes({ "@type": ["Product", "IndividualProduct"] })).toEqual(
      expect.arrayContaining(["Product", "IndividualProduct"]),
    );
  });

  it("detects Shopify-style Product/Offer JSON-LD and missing Organization", () => {
    const productLd = {
      "@context": "http://schema.org/",
      "@type": "Product",
      name: "Vaayu - Air",
      offers: {
        "@type": "Offer",
        price: "250.00",
        priceCurrency: "USD",
        availability: "http://schema.org/InStock",
      },
    };

    const pages = [
      makePage({ url: "https://dev.example/", title: "Studio" }),
      makePage({
        url: "https://dev.example/products/perfect-storm",
        title: "Vaayu - Air",
        jsonLdBlocks: [productLd],
        schemaTypes: ["Product", "Offer"],
      }),
    ];

    const { findings } = runChecks(makeCrawlData({ pages }));
    expect(findings.find((f) => f.id === "product-schema")?.status).toBe("detected");
    expect(findings.find((f) => f.id === "offer-schema")?.status).toBe("detected");
    expect(findings.find((f) => f.id === "organization-schema")?.status).toBe("missing");
  });
});

describe("scoring model versions", () => {
  function auditFromFindings(findings: Finding[]): AuditApiResponse {
    return {
      url: "https://dev.example/",
      crawledAt: "2026-11-02T00:00:00.000Z",
      platform: {
        platform: "Shopify",
        confidence: "high",
        confidenceScore: 90,
        evidence: ["shopify"],
        sourceUrls: ["https://dev.example/"],
      },
      findings,
      grouped: {
        detected: findings.filter((f) => f.status === "detected"),
        missing: findings.filter((f) => f.status === "missing"),
        needsReview: findings.filter((f) => f.status === "needs_review"),
      },
      cacheStatus: "BYPASS",
      expiresAt: null,
    };
  }

  it("scores crawl-budget needs_review higher under evidence-v1 than as a hard missing", () => {
    const findings: Finding[] = [
      {
        id: "collection-pages",
        label: "Collection pages",
        status: "needs_review",
        confidence: "medium",
        evidence: "Unable to verify: crawl budget",
        evidenceUrls: ["https://dev.example/collections/a"],
        sourceUrl: "https://dev.example/collections/a",
        discoveredFromUrl: null,
        evidenceKind: "unable_to_verify",
        verificationLimitation: "crawl_budget",
      },
      {
        id: "product-pages",
        label: "Product pages",
        status: "detected",
        confidence: "high",
        evidence: "ok",
        evidenceUrls: ["https://dev.example/products/a"],
        sourceUrl: "https://dev.example/products/a",
        discoveredFromUrl: null,
      },
      {
        id: "category-pages",
        label: "Category pages",
        status: "missing",
        confidence: "low",
        evidence: "Not Detected",
        evidenceUrls: ["https://dev.example/"],
        sourceUrl: "https://dev.example/",
        discoveredFromUrl: null,
      },
      {
        id: "catalog-pages",
        label: "Catalog pages",
        status: "missing",
        confidence: "low",
        evidence: "Not Detected",
        evidenceUrls: ["https://dev.example/"],
        sourceUrl: "https://dev.example/",
        discoveredFromUrl: null,
      },
    ];

    const legacy = buildReadinessReport(auditFromFindings(findings), {
      scoringModelVersion: SCORING_MODEL_LEGACY,
    });
    const evidence = buildReadinessReport(auditFromFindings(findings), {
      scoringModelVersion: SCORING_MODEL_EVIDENCE_V1,
    });

    const legacyCatalog = legacy.dimensions.find((d) => d.id === "catalogReadiness")!.score;
    const evidenceCatalog = evidence.dimensions.find((d) => d.id === "catalogReadiness")!.score;
    expect(evidenceCatalog).toBeGreaterThan(legacyCatalog);
    expect(evidence.scoringModelVersion).toBe(SCORING_MODEL_EVIDENCE_V1);
  });
});

describe("remediation assets", () => {
  it("does not invent FAQ schema from privacy pages and marks unresolved fields", () => {
    const crawl = makeCrawlData({
      pages: [
        makePage({
          url: "https://dev.example/",
          title: "Zita's Art Studio - Development – Zita's Art Studio - Development",
        }),
        makePage({
          url: "https://dev.example/policies/privacy-policy",
          title: "Privacy policy",
          bodyTextSnippet: "support help faq collection of data",
        }),
      ],
    });
    const { findings, platform } = runChecks(crawl);
    const context = buildGenerationContext(crawl, platform, findings);
    const assets = generateFixAssets(context);
    const faq = assets.find((asset) => asset.filename === "faq-schema-template.json");
    const org = assets.find((asset) => asset.filename === "organization-schema.json");

    expect(faq?.content).toMatch(/no_verified_faq_page|human approval required/i);
    expect(faq?.content).not.toContain("/policies/privacy-policy");
    expect(org?.content).toMatch(/human approval required/i);
    expect(org?.content).not.toMatch(/Development – Zita/);
  });

  it("avoids recommending duplicate Product schema when already detected", () => {
    const productLd = {
      "@context": "http://schema.org/",
      "@type": "Product",
      name: "Work",
      offers: { "@type": "Offer", price: "10.00", priceCurrency: "USD" },
    };
    const crawl = makeCrawlData({
      pages: [
        makePage({ url: "https://dev.example/", title: "Studio" }),
        makePage({
          url: "https://dev.example/products/work",
          title: "Work",
          jsonLdBlocks: [productLd],
          schemaTypes: ["Product", "Offer"],
        }),
      ],
    });
    const { findings, platform } = runChecks(crawl);
    const context = buildGenerationContext(crawl, platform, findings);
    const assets = generateFixAssets(context);
    const product = assets.find((asset) => asset.filename === "product-schema-template.json");
    expect(product?.content).toMatch(/do not publish a duplicate|already_detected|already emit/i);
  });
});

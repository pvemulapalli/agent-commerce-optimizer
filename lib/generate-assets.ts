import { buildPublicPlatformEvidence } from "./platform-evidence-display";
import { normalizeSchemaType } from "./schema-utils";
import type { GeneratedAsset, GenerationContext, GroupedFindings } from "./types";

export const GENERATED_FIX_ASSET_COUNT = 6;

function extractJsonLdByType(
  blocks: unknown[],
  typeName: string,
): Record<string, unknown> | null {
  const normalized = typeName.toLowerCase();

  function findInValue(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== "object") return null;

    if (Array.isArray(value)) {
      for (const item of value) {
        const found = findInValue(item);
        if (found) return found;
      }
      return null;
    }

    const record = value as Record<string, unknown>;
    const typeField = record["@type"];
    const types = Array.isArray(typeField)
      ? typeField
      : typeField
        ? [typeField]
        : [];

    if (
      types.some(
        (type) => normalizeSchemaType(String(type)) === normalized,
      )
    ) {
      return record;
    }

    if (record["@graph"]) {
      const found = findInValue(record["@graph"]);
      if (found) return found;
    }

    for (const nested of Object.values(record)) {
      if (nested && typeof nested === "object") {
        const found = findInValue(nested);
        if (found) return found;
      }
    }

    return null;
  }

  for (const block of blocks) {
    const found = findInValue(block);
    if (found) return found;
  }

  return null;
}

function groupFindings(findings: GenerationContext["findings"]): GroupedFindings {
  return {
    detected: findings.filter((finding) => finding.status === "detected"),
    missing: findings.filter((finding) => finding.status === "missing"),
    needsReview: findings.filter((finding) => finding.status === "needs_review"),
  };
}

function homepageTitle(context: GenerationContext): string {
  return context.homepage?.title?.trim() || "TODO: Add merchant name from crawled homepage title";
}

function homepageDescription(context: GenerationContext): string {
  return (
    context.homepage?.metaDescription?.trim() ||
    "TODO: Add a concise merchant description from crawled homepage meta description"
  );
}

function formatFindingList(findings: GenerationContext["findings"]): string {
  if (findings.length === 0) {
    return "_None in this category._";
  }

  return findings
    .map((finding) => {
      const urls =
        finding.evidenceUrls.length > 0
          ? `\n  - Evidence URLs: ${finding.evidenceUrls.join(", ")}`
          : "";
      return `- **${finding.label}** (${finding.confidence} confidence)\n  - Evidence: ${finding.evidence}${urls}\n  - Source: ${finding.sourceUrl}`;
    })
    .join("\n");
}

function generateLlmsTxt(context: GenerationContext): string {
  const title = homepageTitle(context);
  const description = homepageDescription(context);
  const lines: string[] = [
    `# ${title}`,
    `> ${description}`,
    "",
    "## Site",
    `- URL: ${context.auditedUrl}`,
    `- Platform (crawled signal): ${context.platform.platform} (${context.platform.confidence} confidence)`,
    "",
    "## Discovery files",
  ];

  if (context.robotsTxt.status === 200) {
    lines.push(`- [robots.txt](${context.robotsTxt.url})`);
  } else {
    lines.push(`- TODO: Publish robots.txt at ${context.robotsTxt.url}`);
  }

  if (context.sitemapXml.status === 200) {
    lines.push(`- [sitemap.xml](${context.sitemapXml.url})`);
  } else {
    lines.push(`- TODO: Publish sitemap.xml at ${context.sitemapXml.url}`);
  }

  if (context.llmsTxt.status === 200 && context.llmsTxt.content?.trim()) {
    lines.push(
      `- Existing llms.txt found at ${context.llmsTxt.url}. Review and merge with this draft`,
    );
  }

  lines.push("", "## Key pages");

  if (context.homepage) {
    lines.push(`- [Homepage](${context.homepage.url})`);
  }

  for (const url of context.productPageUrls.slice(0, 5)) {
    lines.push(`- [Product page](${url})`);
  }

  for (const page of context.faqPages) {
    const label = page.title?.trim() || "FAQ / help page";
    lines.push(`- [${label}](${page.url})`);
  }

  if (context.supportLinks.length > 0) {
    lines.push("", "## Support & policies");
    for (const link of context.supportLinks.slice(0, 8)) {
      lines.push(`- [${link.text}](${link.href})`);
    }
  }

  if (context.sitemapUrls.length > 0) {
    lines.push("", "## Sitemap URLs (sample from crawl)");
    for (const url of context.sitemapUrls.slice(0, 8)) {
      lines.push(`- ${url}`);
    }
  }

  lines.push(
    "",
    "## Notes",
    "- Generated from crawled evidence only. Replace TODO items with verified merchant facts.",
    `- Generated at ${new Date().toISOString()} from audit crawl at ${context.crawledAt}`,
  );

  return `${lines.join("\n")}\n`;
}

function generateMerchantProfile(context: GenerationContext): string {
  const lines: string[] = [
    "# Merchant Profile",
    "",
    "_Generated from crawled evidence. Items marked TODO were not found during the crawl._",
    "",
    "## Overview",
    "",
    `| Field | Value |`,
    `| --- | --- |`,
    `| Audited URL | ${context.auditedUrl} |`,
    `| Homepage title | ${context.homepage?.title?.trim() || "TODO: not found in crawl"} |`,
    `| Meta description | ${context.homepage?.metaDescription?.trim() || "TODO: not found in crawl"} |`,
    `| Commerce platform | ${context.platform.platform} (${context.platform.confidence} confidence) |`,
    `| Crawled at | ${context.crawledAt} |`,
    "",
    "## Platform evidence",
    "",
  ];

  for (const item of buildPublicPlatformEvidence(context.platform)) {
    lines.push(`- ${item}`);
  }

  lines.push("", "## Product catalog signals", "");

  if (context.productPageUrls.length > 0) {
    for (const url of context.productPageUrls) {
      lines.push(`- ${url}`);
    }
  } else {
    lines.push("- TODO: No product pages discovered in crawl");
  }

  lines.push("", "## Support & policy links", "");

  if (context.supportLinks.length > 0) {
    for (const link of context.supportLinks) {
      lines.push(
        `- [${link.text}](${link.href}) (discovered on ${link.discoveredFromUrl})`,
      );
    }
  } else {
    lines.push("- TODO: No support or policy links discovered in crawl");
  }

  lines.push("", "## FAQ / help pages", "");

  if (context.faqPages.length > 0) {
    for (const page of context.faqPages) {
      lines.push(`- ${page.title?.trim() || "(no title)"} → ${page.url}`);
    }
  } else {
    lines.push("- TODO: No FAQ or help pages discovered in crawl");
  }

  lines.push("", "## Discovery files", "");
  lines.push(
    `- robots.txt: ${context.robotsTxt.status === 200 ? context.robotsTxt.url : `TODO: checked ${context.robotsTxt.url}`}`,
  );
  lines.push(
    `- sitemap.xml: ${context.sitemapXml.status === 200 ? context.sitemapXml.url : `TODO: checked ${context.sitemapXml.url}`}`,
  );
  lines.push(
    `- llms.txt: ${context.llmsTxt.status === 200 ? context.llmsTxt.url : `TODO: checked ${context.llmsTxt.url}`}`,
  );

  return `${lines.join("\n")}\n`;
}

function cleanOrganizationName(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  let name = raw.replace(/\s+/g, " ").trim();
  // Drop development-store suffix segments before collapsing duplicates.
  name = name.replace(/\s*[–—-]\s*Development\b/gi, "").trim();
  const dashParts = name.split(/\s+[–—-]\s+/).map((part) => part.trim()).filter(Boolean);
  if (dashParts.length >= 2) {
    const first = dashParts[0];
    if (dashParts.every((part) => part.toLowerCase() === first.toLowerCase())) {
      name = first;
    }
  }
  return name || null;
}

function generateOrganizationSchema(context: GenerationContext): string {
  for (const page of context.pages) {
    const existing = extractJsonLdByType(page.jsonLdBlocks, "Organization");
    if (existing) {
      return `${JSON.stringify(existing, null, 2)}\n`;
    }
  }

  const contactUrl =
    context.supportLinks.find((link) =>
      /\/contact\b/i.test(link.href) || /^contact\b/i.test(link.text.trim()),
    )?.href ?? null;

  const template = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name:
      cleanOrganizationName(context.homepage?.title) ||
      "TODO: Organization name (human approval required)",
    url: context.origin || context.auditedUrl,
    description:
      context.homepage?.metaDescription?.trim() ||
      "TODO: Organization description from verified merchant copy (human approval required)",
    logo: "TODO: URL to organization logo image (human approval required)",
    sameAs: ["TODO: Official social profile URLs only if verified (human approval required)"],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      url: contactUrl || "TODO: Support or contact page URL (human approval required)",
    },
    _comment:
      "Illustrative template from crawl evidence. Replace TODO values with verified facts before publishing. Do not invent social profiles or contact details.",
  };

  return `${JSON.stringify(template, null, 2)}\n`;
}

function generateProductSchemaTemplate(context: GenerationContext): string {
  const productFinding = context.findings.find((finding) => finding.id === "product-schema");

  for (const page of context.pages) {
    const existing = extractJsonLdByType(page.jsonLdBlocks, "Product");
    if (existing) {
      const annotated = {
        ...existing,
        _sourceUrl: page.url,
        _comment:
          "Extracted from crawled JSON-LD. If this storefront already emits valid Product/Offer markup (e.g. Shopify structured_data), do not publish a duplicate block unless correcting specific fields. Review before publishing.",
      };
      return `${JSON.stringify(annotated, null, 2)}\n`;
    }
  }

  if (productFinding?.status === "detected") {
    return `${JSON.stringify(
      {
        _comment:
          "Product schema was detected during the crawl. Shopify and similar platforms often already emit Product/Offer JSON-LD. This file is illustrative only — do not add a duplicate Product block unless you are correcting specific fields.",
        _status: "already_detected",
        evidenceUrls: productFinding.evidenceUrls,
      },
      null,
      2,
    )}\n`;
  }

  const exampleUrl = context.productPageUrls[0] || "TODO: Product page URL from crawl";

  const template = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "TODO: Product name from product page title",
    description: "TODO: Product description from product page copy",
    url: exampleUrl,
    sku: "TODO: Product SKU or identifier",
    brand: {
      "@type": "Brand",
      name:
        cleanOrganizationName(context.homepage?.title) ||
        "TODO: Brand name (human approval required)",
    },
    image: ["TODO: Product image URL"],
    offers: {
      "@type": "Offer",
      url: exampleUrl,
      priceCurrency: "TODO: ISO 4217 currency code",
      price: "TODO: Price from product page",
      availability: "https://schema.org/TODO_InventoryStatus",
    },
    _comment:
      "Illustrative template because Product JSON-LD was not found on crawled product pages. Human approval required before publishing.",
  };

  return `${JSON.stringify(template, null, 2)}\n`;
}

function generateFaqSchemaTemplate(context: GenerationContext): string {
  for (const page of context.pages) {
    const existing = extractJsonLdByType(page.jsonLdBlocks, "FAQPage");
    if (existing) {
      const annotated = {
        ...existing,
        _sourceUrl: page.url,
        _comment:
          "Extracted from crawled JSON-LD. Review question/answer pairs for accuracy.",
      };
      return `${JSON.stringify(annotated, null, 2)}\n`;
    }
  }

  const faqPageUrl = context.faqPages[0]?.url;
  if (!faqPageUrl) {
    return `${JSON.stringify(
      {
        _comment:
          "No dedicated FAQ page was verified in the crawl. Do not invent FAQPage markup from privacy policies or other legal pages. Only add FAQPage schema when real FAQ content exists.",
        _status: "no_verified_faq_page",
      },
      null,
      2,
    )}\n`;
  }

  const template = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "TODO: Question text from FAQ page (human approval required)",
        acceptedAnswer: {
          "@type": "Answer",
          text: "TODO: Answer text from FAQ page (human approval required)",
        },
      },
    ],
    _faqPageUrl: faqPageUrl,
    _comment:
      "Illustrative template for a verified FAQ URL. Add one entry per real FAQ item. Do not use privacy-policy URLs as FAQ sources.",
  };

  return `${JSON.stringify(template, null, 2)}\n`;
}

function generateAgentCommerceReadiness(context: GenerationContext): string {
  const grouped = groupFindings(context.findings);
  const lines: string[] = [
    "# Agent Commerce Readiness",
    "",
    "_Evidence-backed audit summary for AI agent discoverability. No scores; only what the crawl found._",
    "",
    `**Audited URL:** ${context.auditedUrl}`,
    `**Crawl timestamp:** ${context.crawledAt}`,
    `**Detected platform:** ${context.platform.platform} (${context.platform.confidence} confidence)`,
    "",
    "## Detected signals",
    "",
    formatFindingList(grouped.detected),
    "",
    "## Missing signals",
    "",
    formatFindingList(grouped.missing),
    "",
    "## Needs review",
    "",
    formatFindingList(grouped.needsReview),
    "",
    "## Recommended next steps (from missing signals)",
    "",
  ];

  if (grouped.missing.length === 0) {
    lines.push("- No missing signals detected in this crawl.");
  } else {
    for (const finding of grouped.missing) {
      lines.push(`- Address **${finding.label}**: ${finding.evidence}`);
    }
  }

  lines.push(
    "",
    "## Asset notes",
    "",
    "- Use the generated `llms.txt` draft to help agents discover key URLs.",
    "- Publish `organization-schema.json` and product/FAQ templates as JSON-LD on relevant pages.",
    "- Replace all TODO placeholders with verified merchant facts before production use.",
  );

  return `${lines.join("\n")}\n`;
}

export function generateFixAssets(context: GenerationContext): GeneratedAsset[] {
  return [
    {
      filename: "llms.txt",
      contentType: "text/plain",
      content: generateLlmsTxt(context),
    },
    {
      filename: "merchant-profile.md",
      contentType: "text/markdown",
      content: generateMerchantProfile(context),
    },
    {
      filename: "organization-schema.json",
      contentType: "application/json",
      content: generateOrganizationSchema(context),
    },
    {
      filename: "product-schema-template.json",
      contentType: "application/json",
      content: generateProductSchemaTemplate(context),
    },
    {
      filename: "faq-schema-template.json",
      contentType: "application/json",
      content: generateFaqSchemaTemplate(context),
    },
    {
      filename: "agent-commerce-readiness.md",
      contentType: "text/markdown",
      content: generateAgentCommerceReadiness(context),
    },
  ];
}

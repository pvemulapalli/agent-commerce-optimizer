import type { ConfidenceLevel, CrawlData, PageData } from "./types";

export interface SchemaMatch {
  typeName: string;
  page: PageData;
  types: string[];
}

export function normalizeSchemaType(type: string): string {
  const value = type.toLowerCase();
  const slashIndex = value.lastIndexOf("/");
  return slashIndex >= 0 ? value.slice(slashIndex + 1) : value;
}

export function pageHasSchemaType(page: PageData, typeName: string): boolean {
  const normalized = typeName.toLowerCase();

  return page.schemaTypes.some((type) => {
    const value = normalizeSchemaType(type);
    return value === normalized;
  });
}

export function findSchemaMatches(
  pages: PageData[],
  typeName: string,
): SchemaMatch | null {
  for (const page of pages) {
    const types = page.schemaTypes.filter(
      (type) => normalizeSchemaType(type) === typeName.toLowerCase(),
    );
    if (types.length > 0) {
      return { typeName, page, types };
    }
  }

  return null;
}

export function extractSchemaFieldValues(
  data: unknown,
  fieldNames: string[],
): string[] {
  const values = new Set<string>();

  function walk(value: unknown): void {
    if (!value || typeof value !== "object") return;

    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }

    const record = value as Record<string, unknown>;

    for (const field of fieldNames) {
      const fieldValue = record[field];
      if (typeof fieldValue === "string" && fieldValue.trim()) {
        values.add(fieldValue.trim());
      } else if (typeof fieldValue === "number") {
        values.add(String(fieldValue));
      }
    }

    if (record["@graph"]) walk(record["@graph"]);
    for (const nested of Object.values(record)) {
      if (nested && typeof nested === "object") walk(nested);
    }
  }

  walk(data);
  return [...values];
}

export function pageHasSchemaField(
  page: PageData,
  fieldNames: string[],
): string[] {
  const matches: string[] = [];

  for (const block of page.jsonLdBlocks) {
    matches.push(...extractSchemaFieldValues(block, fieldNames));
  }

  return [...new Set(matches)];
}

export function pageSearchText(page: PageData): string {
  return [
    page.url,
    page.title ?? "",
    page.metaDescription ?? "",
    page.bodyTextSnippet ?? "",
  ]
    .join(" ")
    .toLowerCase();
}

export function confidenceFromSignals(signals: {
  high?: number;
  medium?: number;
  low?: number;
}): ConfidenceLevel {
  if ((signals.high ?? 0) > 0) return "high";
  if ((signals.medium ?? 0) > 0) return "medium";
  return "low";
}

export function aggregateConfidence(levels: ConfidenceLevel[]): ConfidenceLevel {
  if (levels.includes("high")) return "high";
  if (levels.includes("medium")) return "medium";
  return "low";
}

export function formatEvidenceList(items: string[], limit = 5): string {
  return items.slice(0, limit).join("; ");
}

export function uniqueUrls(urls: string[]): string[] {
  return [...new Set(urls.filter(Boolean))];
}

export function pagesMatchingUrlPatterns(
  pages: PageData[],
  patterns: RegExp[],
): PageData[] {
  return pages.filter((page) =>
    patterns.some((pattern) => pattern.test(page.url.toLowerCase())),
  );
}

export function pagesMatchingContent(
  pages: PageData[],
  patterns: RegExp[],
): PageData[] {
  return pages.filter((page) => {
    const haystack = pageSearchText(page);
    return patterns.some((pattern) => pattern.test(haystack));
  });
}

export function getCrawlablePages(pages: PageData[]): PageData[] {
  return pages.filter((page) => page.status === 200 && !page.error);
}

export function summarizePages(pages: PageData[], limit = 3): string {
  return pages
    .slice(0, limit)
    .map((page) => {
      const title = page.title ? `"${page.title}"` : "(no title)";
      return `${title} → ${page.url}`;
    })
    .join("; ");
}

export function buildFindingFromPages(
  pages: PageData[],
  evidencePrefix: string,
): { evidence: string; evidenceUrls: string[]; sourceUrl: string } | null {
  if (pages.length === 0) return null;

  return {
    evidence: `${evidencePrefix}: ${summarizePages(pages)}`,
    evidenceUrls: uniqueUrls(pages.map((page) => page.url)),
    sourceUrl: pages[0].url,
  };
}

export function inferFromCrawlData(data: CrawlData): PageData[] {
  return getCrawlablePages(data.pages);
}

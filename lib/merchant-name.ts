import { getMerchantDisplayName } from "./domain-normalization";
import { getBrandToken, getRegistrableDomain } from "./domains";
import { normalizeSchemaType } from "./schema-utils";
import type { GenerationPageSnapshot, PageData } from "./types";

const PLATFORM_OR_FRAMEWORK_NAMES = new Set([
  "vtex",
  "vtex commerce",
  "shopify",
  "adobe commerce",
  "magento",
  "salesforce commerce cloud",
  "salesforce",
  "bigcommerce",
  "woocommerce",
  "faststore",
  "commercetools",
  "fenicio",
  "sfcc",
  "sap commerce",
  "hybris",
]);

const GENERIC_TITLE_SEGMENTS = new Set([
  "home",
  "homepage",
  "official site",
  "online store",
  "shop online",
  "welcome",
  "store",
  "shop",
  "ecommerce",
  "e-commerce",
]);

const TITLE_SEPARATORS = /\s*[|]\s*|\s*[–—]\s*|\s+-\s+|\s*:\s*/;

type NamePage = {
  url: string;
  title: string | null;
  htmlSnippet?: string | null;
  jsonLdBlocks: unknown[];
};

function findJsonLdByType(
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
      types.some((type) => normalizeSchemaType(String(type)) === normalized)
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


function schemaRecordMatchesMerchantSite(
  record: Record<string, unknown>,
  entryUrl: string,
): boolean {
  const schemaUrl = record.url;
  if (typeof schemaUrl !== "string" || !schemaUrl.trim()) {
    return true;
  }

  try {
    const entryDomain = getRegistrableDomain(new URL(entryUrl).hostname);
    const schemaDomain = getRegistrableDomain(new URL(schemaUrl).hostname);
    return entryDomain === schemaDomain;
  } catch {
    return false;
  }
}

function isPlatformOrFrameworkName(name: string): boolean {
  return PLATFORM_OR_FRAMEWORK_NAMES.has(normalizeMerchantName(name).toLowerCase());
}

function readSchemaMerchantName(
  blocks: unknown[],
  typeName: string,
  entryUrl: string,
): string | null {
  const record = findJsonLdByType(blocks, typeName);
  if (!record) {
    return null;
  }

  const name = record.name;
  if (typeof name !== "string" || !name.trim()) {
    return null;
  }

  if (!schemaRecordMatchesMerchantSite(record, entryUrl)) {
    return null;
  }

  if (isPlatformOrFrameworkName(name)) {
    return null;
  }

  return name.trim();
}

function extractMetaContent(
  html: string,
  patterns: RegExp[],
): string | null {
  for (const pattern of patterns) {
    const match = html.match(pattern);
    const value = match?.[1]?.trim();
    if (value) {
      return value;
    }
  }

  return null;
}

function extractMetaSiteName(htmlSnippet: string | null | undefined): string | null {
  if (!htmlSnippet) return null;

  return extractMetaContent(htmlSnippet, [
    /<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:site_name["']/i,
    /<meta[^>]+name=["']application-name["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']application-name["']/i,
  ]);
}

function wordCount(value: string): number {
  return value.split(/\s+/).filter(Boolean).length;
}

function compactAlphaNumeric(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isGenericTitleSegment(segment: string): boolean {
  const normalized = segment.trim().toLowerCase();
  return GENERIC_TITLE_SEGMENTS.has(normalized);
}

function segmentMatchesDomainHint(segment: string, domainHint: string): boolean {
  const segmentCompact = compactAlphaNumeric(segment);
  const domainCompact = compactAlphaNumeric(domainHint);

  if (!segmentCompact || !domainCompact) {
    return false;
  }

  return (
    segmentCompact === domainCompact ||
    segmentCompact.includes(domainCompact) ||
    domainCompact.includes(segmentCompact)
  );
}

function parseBrandFromTitle(title: string, domainHint: string): string | null {
  const trimmed = title.trim();
  if (!trimmed) return null;

  const segments = trimmed
    .split(TITLE_SEPARATORS)
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (segments.length === 1) {
    return isGenericTitleSegment(segments[0]) ? null : segments[0];
  }

  for (const segment of segments) {
    if (
      !isGenericTitleSegment(segment) &&
      segmentMatchesDomainHint(segment, domainHint)
    ) {
      return segment;
    }
  }

  const last = segments[segments.length - 1];
  if (
    last &&
    !isGenericTitleSegment(last) &&
    last.length <= 40 &&
    wordCount(last) <= 4
  ) {
    return last;
  }

  const first = segments[0];
  if (
    first &&
    !isGenericTitleSegment(first) &&
    first.length <= 40 &&
    wordCount(first) <= 4
  ) {
    return first;
  }

  return null;
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
      String.fromCodePoint(parseInt(hex, 16)),
    );
}

function containsEncodedHtml(value: string): boolean {
  return /&(?:#(?:x[0-9a-f]+|\d+)|[a-z]+);/i.test(value);
}

function normalizeMerchantName(name: string): string {
  return decodeHtmlEntities(name)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isPlausibleMerchantName(name: string): boolean {
  const trimmed = normalizeMerchantName(name);
  if (trimmed.length < 2 || trimmed.length > 80) {
    return false;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return false;
  }

  if (containsEncodedHtml(trimmed)) {
    return false;
  }

  if (/[<>]/.test(trimmed)) {
    return false;
  }

  return true;
}

function acceptMerchantName(name: string): string | null {
  const normalized = normalizeMerchantName(name);
  return isPlausibleMerchantName(normalized) ? normalized : null;
}

function generationSnapshotToPage(
  snapshot: GenerationPageSnapshot,
): NamePage {
  return {
    url: snapshot.url,
    title: snapshot.title,
    jsonLdBlocks: snapshot.jsonLdBlocks,
  };
}

function crawlPageToNamePage(page: Pick<
  PageData,
  "url" | "title" | "htmlSnippet" | "jsonLdBlocks"
>): NamePage {
  return {
    url: page.url,
    title: page.title,
    htmlSnippet: page.htmlSnippet,
    jsonLdBlocks: page.jsonLdBlocks,
  };
}

function orderPagesForNameExtraction(
  url: string,
  pages: NamePage[],
): NamePage[] {
  let entryOrigin = url;

  try {
    entryOrigin = new URL(url).origin;
  } catch {
    // keep url fallback
  }

  return [...pages].sort((left, right) => {
    const leftScore = scorePageForNameExtraction(left.url, entryOrigin);
    const rightScore = scorePageForNameExtraction(right.url, entryOrigin);
    return rightScore - leftScore;
  });
}

function scorePageForNameExtraction(pageUrl: string, entryOrigin: string): number {
  try {
    const parsed = new URL(pageUrl);
    if (parsed.origin !== entryOrigin) {
      return 0;
    }

    if (parsed.pathname === "/" || parsed.pathname === "") {
      return 3;
    }

    if (/about|company|brand/i.test(parsed.pathname)) {
      return 2;
    }

    return 1;
  } catch {
    return 0;
  }
}

function extractMerchantNameFromPages(
  url: string,
  pages: NamePage[],
): string | null {
  if (pages.length === 0) {
    return null;
  }

  const domainHint = getBrandToken(
    url.includes("://") ? url : `https://${url.replace(/^\/\//, "")}/`,
  );
  const orderedPages = orderPagesForNameExtraction(url, pages);

  for (const page of orderedPages) {
    const organizationName = readSchemaMerchantName(
      page.jsonLdBlocks,
      "Organization",
      url,
    );
    const accepted = organizationName ? acceptMerchantName(organizationName) : null;
    if (accepted) {
      return accepted;
    }
  }

  for (const page of orderedPages) {
    const websiteName = readSchemaMerchantName(page.jsonLdBlocks, "WebSite", url);
    const accepted = websiteName ? acceptMerchantName(websiteName) : null;
    if (accepted) {
      return accepted;
    }
  }

  for (const page of orderedPages) {
    const metaSiteName = extractMetaSiteName(page.htmlSnippet);
    const accepted = metaSiteName ? acceptMerchantName(metaSiteName) : null;
    if (accepted) {
      return accepted;
    }
  }

  for (const page of orderedPages) {
    if (!page.title) continue;

    const fromTitle = parseBrandFromTitle(page.title, domainHint);
    const accepted = fromTitle ? acceptMerchantName(fromTitle) : null;
    if (accepted) {
      return accepted;
    }
  }

  return null;
}

export function resolveMerchantDisplayName(input: {
  url: string;
  crawlPages?: Pick<
    PageData,
    "url" | "title" | "htmlSnippet" | "jsonLdBlocks"
  >[];
  generationPages?: GenerationPageSnapshot[];
  homepage?: GenerationPageSnapshot | null;
}): string {
  const pages: NamePage[] = [];

  if (input.homepage) {
    pages.push(generationSnapshotToPage(input.homepage));
  }

  for (const page of input.generationPages ?? []) {
    if (pages.some((entry) => entry.url === page.url)) {
      continue;
    }
    pages.push(generationSnapshotToPage(page));
  }

  for (const page of input.crawlPages ?? []) {
    if (pages.some((entry) => entry.url === page.url)) {
      continue;
    }
    pages.push(crawlPageToNamePage(page));
  }

  const fromContent = extractMerchantNameFromPages(input.url, pages);
  if (fromContent) {
    return fromContent;
  }

  return getMerchantDisplayName(input.url);
}

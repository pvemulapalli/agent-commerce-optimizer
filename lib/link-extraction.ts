import type { Element } from "domhandler";
import type * as cheerio from "cheerio";
import { classifyLinkScope } from "./domains";
import type { DiscoveredLink, LinkContext } from "./types";

export const SUPPORT_LINK_KEYWORDS = [
  "faq",
  "help",
  "support",
  "delivery",
  "shipping",
  "returns",
  "return",
  "refund",
  "policy",
  "contact",
  "track",
  "order",
  "cart",
  "checkout",
];

function resolveHref(href: string, baseUrl: string): string | null {
  try {
    const resolved = new URL(href, baseUrl);
    if (!["http:", "https:"].includes(resolved.protocol)) {
      return null;
    }
    resolved.hash = "";
    return resolved.href;
  } catch {
    return null;
  }
}

function getLinkContext($: cheerio.CheerioAPI, element: Element): LinkContext {
  const $element = $(element);

  if ($element.closest("footer").length > 0) return "footer";
  if ($element.closest("nav").length > 0) return "nav";
  if ($element.closest("header").length > 0) return "header";
  return "body";
}

function buildLinkText(
  $: cheerio.CheerioAPI,
  element: Element,
): { text: string; ariaLabel: string | null; titleAttr: string | null } {
  const $element = $(element);
  const ariaLabel = $element.attr("aria-label")?.trim() || null;
  const titleAttr = $element.attr("title")?.trim() || null;
  const text = $element.text().replace(/\s+/g, " ").trim();

  const combined = [text, ariaLabel, titleAttr].filter(Boolean).join(" ").trim();

  return {
    text: combined || text || ariaLabel || titleAttr || "",
    ariaLabel,
    titleAttr,
  };
}

export function extractDiscoveredLinks(
  $: cheerio.CheerioAPI,
  pageUrl: string,
  entryOrigin: string,
  entryUrl: string,
): DiscoveredLink[] {
  const links: DiscoveredLink[] = [];
  const seen = new Set<string>();

  $("a[href]").each((_, element) => {
    const href = $(element).attr("href");
    if (!href) return;

    const resolved = resolveHref(href, pageUrl);
    if (!resolved) return;

    const scope = classifyLinkScope(resolved, entryOrigin, entryUrl);
    if (scope === "external") return;
    if (seen.has(resolved)) return;

    seen.add(resolved);
    const { text, ariaLabel, titleAttr } = buildLinkText($, element);

    links.push({
      href: resolved,
      text,
      ariaLabel,
      titleAttr,
      context: getLinkContext($, element),
      discoveredFromUrl: pageUrl,
      scope,
    });
  });

  return links;
}

export function linkHaystack(link: DiscoveredLink): string {
  return [link.href, link.text, link.ariaLabel, link.titleAttr]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function scoreDiscoveredLink(link: DiscoveredLink): number {
  const haystack = linkHaystack(link);
  let score = 0;

  for (const keyword of SUPPORT_LINK_KEYWORDS) {
    if (haystack.includes(keyword)) {
      score += 3;
    }
  }

  if (link.context === "footer") score += 4;
  if (link.context === "nav") score += 3;
  if (link.context === "header") score += 2;

  if (link.scope === "related-domain") score += 2;

  return score;
}

export function selectRelatedDomainUrls(
  pages: { discoveredLinks: DiscoveredLink[] }[],
  crawledUrls: Set<string>,
  limit: number,
): DiscoveredLink[] {
  const candidates = new Map<string, DiscoveredLink>();

  for (const page of pages) {
    for (const link of page.discoveredLinks) {
      if (link.scope !== "related-domain") continue;
      if (crawledUrls.has(link.href)) continue;

      const score = scoreDiscoveredLink(link);
      if (score <= 0) continue;

      const existing = candidates.get(link.href);
      if (!existing || scoreDiscoveredLink(link) > scoreDiscoveredLink(existing)) {
        candidates.set(link.href, link);
      }
    }
  }

  return [...candidates.values()]
    .sort((a, b) => scoreDiscoveredLink(b) - scoreDiscoveredLink(a))
    .slice(0, limit);
}

export function toInternalLinks(links: DiscoveredLink[]): { href: string; text: string }[] {
  return links
    .filter((link) => link.scope === "same-origin")
    .map((link) => ({ href: link.href, text: link.text }));
}

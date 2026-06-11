import { APP_VERSION } from "@/lib/app-version";
import {
  ABOUT_PRODUCT_INTRO,
  DEFAULT_SITE_DESCRIPTION,
  HERO_HEADLINE,
  HERO_SUPPORTING_COPY,
  PARENT_BRAND,
  PRODUCT_NAME,
} from "@/lib/brand";

/** Public marketing and documentation paths included in sitemap.xml. */
export const PUBLIC_SITEMAP_PATHS = [
  "/",
  "/about",
  "/recent",
  "/api-docs",
  "/release-notes",
  "/contributors",
  "/crawler",
  "/contact",
] as const;

export const AI_CRAWLER_USER_AGENTS = [
  "GPTBot",
  "OAI-SearchBot",
  "Claude-Web",
  "Google-Extended",
] as const;

export const CONTENT_SIGNALS_DIRECTIVE =
  "Content-Signal: ai-train=yes, search=yes, ai-input=yes";

export const HOMEPAGE_LINK_HEADER =
  '</sitemap.xml>; rel="sitemap", </api-docs>; rel="service-doc", </.well-known/api-catalog>; rel="api-catalog"';

export const DEFERRED_DISCOVERABILITY_FEATURES = [
  {
    name: "OAuth Discovery",
    reason:
      "Merchant Signals exposes a public scan API without user accounts or delegated authorization. OAuth discovery endpoints would imply auth flows that do not exist.",
  },
  {
    name: "OAuth Protected Resource Metadata",
    reason:
      "Public endpoints are intentionally unauthenticated for merchant self-service scans. Protected-resource metadata is not applicable.",
  },
  {
    name: "Auth.md",
    reason:
      "No agent authentication contract is defined yet. Auth.md would duplicate API docs without a real auth model.",
  },
  {
    name: "MCP Server Card",
    reason:
      "No MCP server is shipped with this product. Publishing a server card would misrepresent capabilities.",
  },
  {
    name: "A2A Agent Card",
    reason:
      "Agent-to-agent orchestration is out of scope for the current REST API surface.",
  },
  {
    name: "Agent Skills Discovery",
    reason:
      "Skills discovery requires a skills registry and execution runtime that are not part of Merchant Signals.",
  },
  {
    name: "WebMCP",
    reason:
      "Browser-embedded MCP tooling is not implemented and depends on emerging client support.",
  },
  {
    name: "DNS-AID",
    reason:
      "DNS-based agent identity requires domain operator DNS changes and a published trust policy not yet defined for merchantsignals.com.",
  },
] as const;

export function resolveSiteOrigin(fallbackOrigin = "https://www.merchantsignals.com"): string {
  const configured =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.APP_URL?.trim() ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");

  return (configured || fallbackOrigin).replace(/\/$/, "");
}

export function buildRobotsTxt(origin: string): string {
  const lines = [
    "User-agent: *",
    "Allow: /",
    "",
  ];

  for (const agent of AI_CRAWLER_USER_AGENTS) {
    lines.push(`User-agent: ${agent}`, "Allow: /", "");
  }

  lines.push(CONTENT_SIGNALS_DIRECTIVE, "", `Sitemap: ${origin}/sitemap.xml`, "");

  return lines.join("\n");
}

export function buildSitemapXml(origin: string, lastModified = new Date()): string {
  const lastmod = lastModified.toISOString().slice(0, 10);
  const urls = PUBLIC_SITEMAP_PATHS.map(
    (path) => `  <url>
    <loc>${origin}${path === "/" ? "/" : path}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${path === "/" ? "weekly" : "monthly"}</changefreq>
    <priority>${path === "/" ? "1.0" : "0.7"}</priority>
  </url>`,
  );

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>
`;
}

export interface ApiCatalogLinkset {
  linkset: Array<{
    anchor: string;
    item: Array<{
      href: string;
      rel: string;
      title: string;
      type?: string;
    }>;
  }>;
}

export function buildApiCatalog(origin: string): ApiCatalogLinkset {
  return {
    linkset: [
      {
        anchor: `${origin}/`,
        item: [
          {
            href: `${origin}/api-docs`,
            rel: "service-doc",
            title: "Merchant Signals API Documentation",
            type: "text/html",
          },
          {
            href: `${origin}/openapi.json`,
            rel: "service-desc",
            title: "OpenAPI Specification",
            type: "application/json",
          },
          {
            href: `${origin}/api/health`,
            rel: "health",
            title: "Health Endpoint",
            type: "application/json",
          },
          {
            href: `${origin}/api/audit`,
            rel: "openapi",
            title: "Run Merchant Scan",
            type: "application/json",
          },
          {
            href: `${origin}/api/generate-fixes`,
            rel: "openapi",
            title: "Generate Fix Assets",
            type: "application/json",
          },
          {
            href: `${origin}/api/recent-scans`,
            rel: "openapi",
            title: "Recent Public Scans",
            type: "application/json",
          },
          {
            href: `${origin}/api/validate`,
            rel: "openapi",
            title: "Validate Scan URL",
            type: "application/json",
          },
        ],
      },
    ],
  };
}

export function buildHomeMarkdown(origin: string): string {
  return `# ${PARENT_BRAND}

> ${DEFAULT_SITE_DESCRIPTION}

## ${HERO_HEADLINE}

${HERO_SUPPORTING_COPY}

## Product

${PRODUCT_NAME} by ${PARENT_BRAND}

## Capabilities

- Live storefront crawl
- Evidence-backed AI commerce readiness findings
- Downloadable remediation assets

## Links

- [Run a scan](${origin}/)
- [About](${origin}/about)
- [API documentation](${origin}/api-docs)
- [Release notes](${origin}/release-notes)
- [Recent scans](${origin}/recent)

## Version

${APP_VERSION}
`;
}

export function buildAboutMarkdown(origin: string): string {
  return `# About ${PARENT_BRAND}

${ABOUT_PRODUCT_INTRO}

## Product

${PRODUCT_NAME} helps merchants improve AI discoverability with evidence-backed storefront scans.

## Links

- [Home](${origin}/)
- [Contact](${origin}/contact)
- [API documentation](${origin}/api-docs)

## Version

${APP_VERSION}
`;
}

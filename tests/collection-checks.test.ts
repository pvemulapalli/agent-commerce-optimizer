import { describe, expect, it } from "vitest";
import { finalizeFindings, runChecks } from "@/lib/checks";
import { makeCrawlData, makePage } from "./helpers/crawl-fixture";

describe("collection and policy classification", () => {
  it("detects eight Shopify collection PLPs", () => {
    const series = [
      "walking-the-trail",
      "colored-by-nature",
      "elements",
      "sand-and-cloud",
      "reverence",
      "good-things-come-in-a-pair",
      "new-works",
      "v2-poc-original-artworks",
    ];

    const pages = [
      makePage({ url: "https://dev.example/", title: "Home" }),
      ...series.map((handle) =>
        makePage({
          url: `https://dev.example/collections/${handle}`,
          title: handle,
          discoveredLinks: [
            {
              href: `https://dev.example/products/${handle}-work`,
              text: "Artwork",
              ariaLabel: null,
              titleAttr: null,
              context: "body",
              discoveredFromUrl: `https://dev.example/collections/${handle}`,
              scope: "same-origin",
            },
          ],
        }),
      ),
    ];

    const { findings } = runChecks(makeCrawlData({ pages }));
    const collection = findings.find((finding) => finding.id === "collection-pages");
    expect(collection?.status).toBe("detected");
    expect(collection?.evidenceUrls.length).toBeGreaterThanOrEqual(8);
  });

  it("does not treat privacy policy text containing collection as a collection page", () => {
    const pages = [
      makePage({
        url: "https://dev.example/",
        title: "Home",
      }),
      makePage({
        url: "https://dev.example/policies/privacy-policy",
        title: "Privacy policy",
        bodyTextSnippet:
          "We describe our collection of personal information and how we use that collection for support.",
      }),
    ];

    const { findings } = runChecks(makeCrawlData({ pages }));
    const collection = findings.find((finding) => finding.id === "collection-pages");
    expect(collection?.status).toBe("missing");
    expect(collection?.evidenceUrls.join(" ")).not.toContain("privacy-policy");
  });

  it("marks sitemap-discovered but unfetched collections as needs verification", () => {
    const discovered = Array.from({ length: 8 }, (_, index) =>
      `https://dev.example/collections/series-${index}`,
    );

    const data = makeCrawlData({
      pages: [makePage({ url: "https://dev.example/", title: "Home" })],
      collectionUrlsDiscovered: discovered,
      urlsSkippedByBudget: discovered,
      urlsDiscovered: discovered.length,
      urlsSelected: [],
    });

    const { findings } = runChecks(data);
    const collection = findings.find((finding) => finding.id === "collection-pages");
    expect(collection?.status).toBe("needs_review");
    expect(collection?.verificationLimitation).toBe("crawl_budget");
    expect(collection?.evidence).toMatch(/Unable to verify/i);
  });

  it("does not promote FAQ schema from privacy policy help wording", () => {
    const pages = [
      makePage({ url: "https://dev.example/", title: "Home" }),
      makePage({
        url: "https://dev.example/policies/privacy-policy",
        title: "Privacy policy",
        bodyTextSnippet: "Contact support for help with your privacy questions and FAQ style concerns.",
      }),
    ];

    const { findings, platform } = runChecks(makeCrawlData({ pages }));
    const finalized = finalizeFindings(findings, platform);
    const faqPage = finalized.find((finding) => finding.id === "faq-page");
    const faqSchema = finalized.find((finding) => finding.id === "faq-schema");
    expect(faqPage?.status).not.toBe("detected");
    expect(faqSchema?.status).toBe("missing");
  });

  it("does not treat refund policy as a return portal", () => {
    const pages = [
      makePage({ url: "https://dev.example/", title: "Home" }),
      makePage({
        url: "https://dev.example/policies/refund-policy",
        title: "Refund policy",
        bodyTextSnippet: "How to return an item and request a refund. Start a return by emailing us.",
      }),
    ];

    const { findings } = runChecks(makeCrawlData({ pages }));
    const portal = findings.find((finding) => finding.id === "return-portal");
    expect(portal?.status).toBe("missing");
  });

  it("ignores api mentions inside privacy policy for developer docs", () => {
    const pages = [
      makePage({ url: "https://dev.example/", title: "Home" }),
      makePage({
        url: "https://dev.example/policies/privacy-policy",
        title: "Privacy policy",
        bodyTextSnippet: "We use third-party APIs and documentation processors for analytics.",
      }),
    ];

    const { findings } = runChecks(makeCrawlData({ pages }));
    const api = findings.find((finding) => finding.id === "api-developer-docs");
    expect(api?.status).not.toBe("detected");
  });
});

import { describe, expect, it } from "vitest";
import { prioritizeSitemapUrls, SITEMAP_COLLECTION_RESERVE } from "@/lib/sitemap";

describe("prioritizeSitemapUrls", () => {
  it("reserves collection PLP slots even when products dominate scores", () => {
    const products = Array.from({ length: 30 }, (_, index) =>
      `https://example.com/products/item-${index}`,
    );
    const collections = Array.from({ length: 8 }, (_, index) =>
      `https://example.com/collections/series-${index}`,
    );

    const selected = prioritizeSitemapUrls([...products, ...collections], 20);
    const selectedCollections = selected.filter((url) => url.includes("/collections/"));

    expect(selectedCollections.length).toBeGreaterThanOrEqual(
      Math.min(SITEMAP_COLLECTION_RESERVE, collections.length),
    );
    expect(selected).toHaveLength(20);
  });
});

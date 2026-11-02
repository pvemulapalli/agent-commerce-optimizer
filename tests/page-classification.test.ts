import { describe, expect, it } from "vitest";
import {
  classifyPageUrl,
  isCollectionPlpUrl,
  isPolicyOrLegalUrl,
} from "@/lib/page-classification";

describe("page classification", () => {
  it("recognizes Shopify collection PLPs and excludes /collections/all as series PLP", () => {
    expect(isCollectionPlpUrl("https://shop.example/collections/walking-the-trail")).toBe(true);
    expect(isCollectionPlpUrl("https://shop.example/collections/all")).toBe(false);
  });

  it("classifies privacy policies as policy, not collection", () => {
    expect(isPolicyOrLegalUrl("https://shop.example/policies/privacy-policy")).toBe(true);
    expect(classifyPageUrl("https://shop.example/policies/privacy-policy")).toBe("policy");
  });

  it("does not treat refund policy as a return portal", () => {
    expect(classifyPageUrl("https://shop.example/policies/refund-policy")).toBe("policy");
    expect(classifyPageUrl("https://returns.example/make-a-return")).toBe("return_portal");
  });
});

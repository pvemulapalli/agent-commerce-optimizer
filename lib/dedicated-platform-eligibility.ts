import type { CommercePlatform, PlatformAnalysis } from "./types";

const DEDICATED_ECOMMERCE_PLATFORMS = new Set<CommercePlatform>([
  "Shopify",
  "BigCommerce",
  "WooCommerce",
  "Magento",
  "VTEX",
  "Fenicio",
  "Shopware",
  "Salesforce Commerce Cloud",
  "CommerceTools",
]);

/** Identified dedicated commerce platform with usable confidence for eligibility bypass. */
export function hasStrongDedicatedPlatform(platform: PlatformAnalysis): boolean {
  return (
    platform.platform !== "Unknown" &&
    DEDICATED_ECOMMERCE_PLATFORMS.has(platform.platform) &&
    platform.confidence !== "low"
  );
}

/** @deprecated Use hasStrongDedicatedPlatform */
export function hasStrongShopwarePlatform(platform: PlatformAnalysis): boolean {
  return platform.platform === "Shopware" && platform.confidence !== "low";
}

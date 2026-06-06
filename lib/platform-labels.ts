export const OTHER_PLATFORM_LABEL = "Other Platforms";

export const OTHER_PLATFORM_TOOLTIP =
  "Platform was not confidently identified from storefront signals. This may indicate a custom, proprietary, headless, or heavily modified commerce stack.";

/** @deprecated Use OTHER_PLATFORM_LABEL */
export const PLATFORM_NOT_IDENTIFIED_LABEL = OTHER_PLATFORM_LABEL;

/** @deprecated Use OTHER_PLATFORM_TOOLTIP */
export const PLATFORM_NOT_IDENTIFIED_TOOLTIP = OTHER_PLATFORM_TOOLTIP;

const PLATFORM_DISPLAY_LABELS: Record<string, string> = {
  CommerceTools: "commercetools",
  Magento: "Adobe Commerce",
  VTEX: "VTEX",
  Fenicio: "Fenicio",
};

export function formatPlatformDisplay(platform: string | null | undefined): string {
  if (!platform || platform === "Unknown") {
    return OTHER_PLATFORM_LABEL;
  }

  return PLATFORM_DISPLAY_LABELS[platform] ?? platform;
}

export function isPlatformNotIdentified(platform: string | null | undefined): boolean {
  return !platform || platform === "Unknown";
}

export function shouldShowPlatformFeedback(input: {
  platform: string;
  confidence: string;
}): boolean {
  return isPlatformNotIdentified(input.platform) || input.confidence === "low";
}

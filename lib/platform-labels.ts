export const PLATFORM_NOT_IDENTIFIED_LABEL = "Unknown Platform";

export const PLATFORM_NOT_IDENTIFIED_TOOLTIP =
  "We could not confidently determine the ecommerce platform.";

export function formatPlatformDisplay(platform: string | null | undefined): string {
  if (!platform || platform === "Unknown") {
    return PLATFORM_NOT_IDENTIFIED_LABEL;
  }

  return platform;
}

export function isPlatformNotIdentified(platform: string | null | undefined): boolean {
  return !platform || platform === "Unknown";
}

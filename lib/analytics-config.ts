export function isProductionEnvironment(): boolean {
  return process.env.NODE_ENV === "production";
}

export function getGa4MeasurementId(): string | undefined {
  return process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID?.trim() || undefined;
}

export function getPostHogKey(): string | undefined {
  return process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim() || undefined;
}

export function getPostHogHost(): string | undefined {
  return process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim() || undefined;
}

export function isGa4Configured(): boolean {
  return Boolean(getGa4MeasurementId());
}

export function isPostHogConfigured(): boolean {
  return Boolean(getPostHogKey() && getPostHogHost());
}

export function isGa4TrackingEnabled(): boolean {
  return isProductionEnvironment() && isGa4Configured();
}

export function isPostHogTrackingEnabled(): boolean {
  return isProductionEnvironment() && isPostHogConfigured();
}

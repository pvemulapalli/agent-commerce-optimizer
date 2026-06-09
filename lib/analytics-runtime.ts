import {
  isGa4TrackingEnabled,
  isPostHogTrackingEnabled,
} from "@/lib/analytics-config";
import { readTelemetrySuppression } from "@/lib/telemetry-context";

export function isEffectiveGa4TrackingEnabled(): boolean {
  return isGa4TrackingEnabled() && !readTelemetrySuppression();
}

export function isEffectivePostHogTrackingEnabled(): boolean {
  return isPostHogTrackingEnabled() && !readTelemetrySuppression();
}

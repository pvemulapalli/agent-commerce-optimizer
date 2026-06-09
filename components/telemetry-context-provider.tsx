"use client";

import {
  applyTelemetryDirectiveFromLocation,
  readTelemetrySuppression,
  subscribeTelemetrySuppression,
} from "@/lib/telemetry-context";
import { resumePostHogCapturing, suppressPostHogCapturing } from "@/lib/analytics-events";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

interface TelemetryContextValue {
  suppressed: boolean;
}

const TelemetryContext = createContext<TelemetryContextValue>({ suppressed: false });

export function useTelemetrySuppression(): TelemetryContextValue {
  return useContext(TelemetryContext);
}

export function TelemetryContextProvider({ children }: { children: ReactNode }) {
  const [suppressed, setSuppressed] = useState(false);

  const syncSuppression = useCallback(async (active: boolean) => {
    setSuppressed(active);

    if (active) {
      await suppressPostHogCapturing();
      return;
    }

    await resumePostHogCapturing();
  }, []);

  useEffect(() => {
    const directiveState = applyTelemetryDirectiveFromLocation();
    const initial = directiveState ?? readTelemetrySuppression();
    void syncSuppression(initial);

    return subscribeTelemetrySuppression(() => {
      void syncSuppression(readTelemetrySuppression());
    });
  }, [syncSuppression]);

  const value = useMemo(() => ({ suppressed }), [suppressed]);

  return (
    <TelemetryContext.Provider value={value}>{children}</TelemetryContext.Provider>
  );
}

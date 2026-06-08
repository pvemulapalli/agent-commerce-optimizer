"use client";

import { Ga4PageViewTracker } from "@/components/ga4-page-view-tracker";
import { initPostHogAnalytics } from "@/lib/analytics-events";
import {
  getGa4MeasurementId,
  isGa4TrackingEnabled,
  isPostHogTrackingEnabled,
} from "@/lib/analytics-config";
import Script from "next/script";
import { Suspense, useEffect } from "react";

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const ga4Id = getGa4MeasurementId();
  const ga4Enabled = isGa4TrackingEnabled();

  useEffect(() => {
    if (isPostHogTrackingEnabled()) {
      initPostHogAnalytics();
    }
  }, []);

  return (
    <>
      {ga4Enabled && ga4Id ? (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${ga4Id}`}
            strategy="afterInteractive"
          />
          <Script id="ga4-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${ga4Id}', {
                anonymize_ip: true,
                allow_google_signals: false,
                allow_ad_personalization_signals: false,
                send_page_view: false
              });
            `}
          </Script>
        </>
      ) : null}
      {children}
      <Suspense fallback={null}>
        <Ga4PageViewTracker />
      </Suspense>
    </>
  );
}

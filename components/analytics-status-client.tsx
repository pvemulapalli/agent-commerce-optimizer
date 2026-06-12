"use client";

import { PageHeader } from "@/components/page-header";
import { useTelemetrySuppression } from "@/components/telemetry-context-provider";
import { readAnalyticsEventLog } from "@/lib/analytics-event-log";
import {
  isGa4Configured,
  isGa4TrackingEnabled,
  isPostHogConfigured,
  isPostHogTrackingEnabled,
} from "@/lib/analytics-config";
import { APP_VERSION } from "@/lib/app-version";
import type { AnalyticsEventLogEntry } from "@/lib/analytics-event-log";
import { useEffect, useState } from "react";

function ConfigBadge({
  enabled,
  label,
}: {
  enabled: boolean;
  label?: string;
}) {
  return (
    <span
      className={
        enabled
          ? "inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200"
          : "inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200"
      }
    >
      {label ?? (enabled ? "Yes" : "No")}
    </span>
  );
}

export function AnalyticsStatusClient({ embedded = false }: { embedded?: boolean }) {
  const { suppressed } = useTelemetrySuppression();
  const [events, setEvents] = useState<AnalyticsEventLogEntry[]>([]);
  const ga4Active = isGa4TrackingEnabled() && !suppressed;
  const postHogActive = isPostHogTrackingEnabled() && !suppressed;

  useEffect(() => {
    setEvents(readAnalyticsEventLog());
  }, [suppressed]);

  const content = (
    <>
      <section className={`${embedded ? "" : "mt-8 "}rounded-2xl border border-card-border bg-card p-6 shadow-sm sm:p-8`}>
        <p className="text-sm text-text-secondary">Version {APP_VERSION}</p>

        <dl className="mt-6 space-y-4">
          <div className="flex flex-col gap-2 rounded-xl border border-card-border bg-card-muted px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <dt className="font-medium text-text-primary">Analytics suppression</dt>
              <dd className="mt-1 text-sm text-text-secondary">
                {suppressed
                  ? "Founder Mode is active in this browser. No analytics traffic is sent."
                  : "Normal visitor tracking behavior is active in this browser."}
              </dd>
            </div>
            <ConfigBadge
              enabled={suppressed}
              label={suppressed ? "Active" : "Inactive"}
            />
          </div>

          <div className="flex flex-col gap-2 rounded-xl border border-card-border bg-card-muted px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <dt className="font-medium text-text-primary">GA4 configured</dt>
              <dd className="mt-1 text-sm text-text-secondary">
                Env var: NEXT_PUBLIC_GA4_MEASUREMENT_ID
                {isGa4Configured() ? "" : " (missing)"}
              </dd>
            </div>
            <ConfigBadge enabled={isGa4Configured()} />
          </div>

          <div className="flex flex-col gap-2 rounded-xl border border-card-border bg-card-muted px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <dt className="font-medium text-text-primary">GA4 tracking active</dt>
              <dd className="mt-1 text-sm text-text-secondary">
                Production-only page_view and product events
                {suppressed ? " (suppressed in this browser)" : ""}
              </dd>
            </div>
            <ConfigBadge enabled={ga4Active} />
          </div>

          <div className="flex flex-col gap-2 rounded-xl border border-card-border bg-card-muted px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <dt className="font-medium text-text-primary">PostHog configured</dt>
              <dd className="mt-1 text-sm text-text-secondary">
                Env vars: NEXT_PUBLIC_POSTHOG_KEY, NEXT_PUBLIC_POSTHOG_HOST
                {isPostHogConfigured() ? "" : " (missing)"}
              </dd>
            </div>
            <ConfigBadge enabled={isPostHogConfigured()} />
          </div>

          <div className="flex flex-col gap-2 rounded-xl border border-card-border bg-card-muted px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <dt className="font-medium text-text-primary">PostHog tracking active</dt>
              <dd className="mt-1 text-sm text-text-secondary">
                Production-only product events and session recording
                {suppressed ? " (suppressed in this browser)" : ""}
              </dd>
            </div>
            <ConfigBadge enabled={postHogActive} />
          </div>
        </dl>
      </section>

      <section className="mt-8 rounded-2xl border border-card-border bg-card p-6 shadow-sm sm:p-8">
        <h2 className="text-lg font-semibold text-text-primary">Latest tracked events</h2>
        <p className="mt-2 text-sm text-text-secondary">
          {suppressed
            ? "Events may appear here for local diagnostics, but nothing is delivered to GA4 or PostHog while suppression is active."
            : "Recent events captured in this browser session (including dry-run entries when tracking is disabled)."}
        </p>

        {events.length === 0 ? (
          <p className="mt-6 text-sm text-text-secondary">No events captured yet in this session.</p>
        ) : (
          <ul className="mt-6 space-y-3">
            {events.map((entry, index) => (
              <li
                key={`${entry.timestamp}-${entry.event}-${index}`}
                className="rounded-xl border border-card-border bg-card-muted px-4 py-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <code className="text-sm font-semibold text-text-primary">{entry.event}</code>
                  <span className="text-xs text-text-secondary">{entry.timestamp}</span>
                  <span
                    className={
                      entry.delivered
                        ? "text-xs font-medium text-emerald-700 dark:text-emerald-300"
                        : "text-xs font-medium text-slate-600 dark:text-slate-300"
                    }
                  >
                    {entry.delivered ? "delivered" : "logged"}
                  </span>
                </div>
                {entry.properties && Object.keys(entry.properties).length > 0 ? (
                  <pre className="mt-2 overflow-x-auto text-xs leading-6 text-text-secondary">
                    {JSON.stringify(entry.properties, null, 2)}
                  </pre>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );

  if (embedded) {
    return content;
  }

  return (
    <main className="mx-auto w-full min-w-0 max-w-4xl px-6 py-10 lg:px-8 lg:py-14">
      <PageHeader
        eyebrow="Debug"
        title="Analytics Status"
        description="Diagnostics for GA4 and PostHog instrumentation. Tracking runs in production only when the required environment variables are configured."
      />
      {content}
    </main>
  );
}

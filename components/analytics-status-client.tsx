"use client";

import { PageHeader } from "@/components/page-header";
import { readAnalyticsEventLog } from "@/lib/analytics-event-log";
import {
  isGa4Configured,
  isGa4TrackingEnabled,
  isPostHogConfigured,
  isPostHogTrackingEnabled,
} from "@/lib/analytics-config";
import { APP_VERSION } from "@/lib/app-version";
import { useEffect, useState } from "react";

function ConfigBadge({ enabled }: { enabled: boolean }) {
  return (
    <span
      className={
        enabled
          ? "inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200"
          : "inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200"
      }
    >
      {enabled ? "Yes" : "No"}
    </span>
  );
}

export function AnalyticsStatusClient() {
  const [events, setEvents] = useState(readAnalyticsEventLog());

  useEffect(() => {
    setEvents(readAnalyticsEventLog());
  }, []);

  return (
    <main className="mx-auto w-full min-w-0 max-w-4xl px-6 py-10 lg:px-8 lg:py-14">
      <PageHeader
        eyebrow="Debug"
        title="Analytics Status"
        description="Diagnostics for GA4 and PostHog instrumentation. Tracking runs in production only when the required environment variables are configured."
      />

      <section className="mt-8 rounded-2xl border border-card-border bg-card p-6 shadow-sm sm:p-8">
        <p className="text-sm text-text-secondary">Version {APP_VERSION}</p>

        <dl className="mt-6 space-y-4">
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
                Production-only page_view events
              </dd>
            </div>
            <ConfigBadge enabled={isGa4TrackingEnabled()} />
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
              </dd>
            </div>
            <ConfigBadge enabled={isPostHogTrackingEnabled()} />
          </div>
        </dl>
      </section>

      <section className="mt-8 rounded-2xl border border-card-border bg-card p-6 shadow-sm sm:p-8">
        <h2 className="text-lg font-semibold text-text-primary">Latest tracked events</h2>
        <p className="mt-2 text-sm text-text-secondary">
          Recent events captured in this browser session (including dry-run entries when tracking
          is disabled).
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
    </main>
  );
}

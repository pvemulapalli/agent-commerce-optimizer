# Merchant Signals Analytics

Analytics instrumentation for [Merchant Signals](https://www.merchantsignals.com). Events are sent to **PostHog** and **Google Analytics 4 (GA4)** when tracking is enabled in production.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_GA4_MEASUREMENT_ID` | GA4 measurement ID (e.g. `G-XXXXXXXXXX`) |
| `NEXT_PUBLIC_POSTHOG_KEY` | PostHog project API key |
| `NEXT_PUBLIC_POSTHOG_HOST` | PostHog API host (e.g. `https://us.i.posthog.com`) |

Tracking is **production-only** (`NODE_ENV=production`) and requires the relevant env vars to be set at **build time** for `NEXT_PUBLIC_*` values.

## Privacy and configuration

### GA4

- Loaded in `components/analytics-provider.tsx`
- `page_view` events are sent manually from `components/ga4-page-view-tracker.tsx`
- Config: `anonymize_ip: true`, `allow_google_signals: false`, `allow_ad_personalization_signals: false`

### PostHog

- Lazy-initialized in `lib/analytics-events.ts`
- Session recording enabled in production with input masking
- Product events captured via `posthog.capture()`

## Standard scan properties

Many events include some or all of these properties when available:

| Property | Description |
| --- | --- |
| `domain` | Registrable domain scanned or referenced |
| `platform` | Detected commerce platform |
| `score` | Final AI readiness score (0–100) |
| `grade` | Final readiness grade (A–F) |
| `top_gap` | Primary gap label from the readiness report |

## Product events

### `scan_started`

User initiated a storefront scan.

| Property | Required | Notes |
| --- | --- | --- |
| `domain` | Yes | Domain being scanned |

**Triggered:** Homepage scan submit, recent audit reload (`app/page.tsx`).

---

### `scan_completed`

Scan finished successfully and results were returned.

| Property | Required | Notes |
| --- | --- | --- |
| `domain` | Yes | Scanned domain |
| `platform` | Yes | Detected platform |
| `score` | Yes | Final readiness score |
| `grade` | Yes | Final readiness grade |
| `top_gap` | Yes | Top gap from report |
| `scanDuration` | No | Crawl duration in seconds (`null` on cache hit) |

**Triggered:** Successful `/api/audit` response (`app/page.tsx`).

---

### `scan_failed`

Scan could not complete.

| Property | Required | Notes |
| --- | --- | --- |
| `domain` | Yes | Requested domain |
| `reason` | Yes | Failure reason (e.g. `bot_verification_blocked`, `non_ecommerce_site`, error message) |
| `platform`, `score`, `grade`, `top_gap` | No | Included when known |

**Triggered:** Bot verification, non-ecommerce gate, API errors (`app/page.tsx`).

---

### `report_shared`

User copied a shareable report link.

| Property | Required | Notes |
| --- | --- | --- |
| `reportId` | Yes | Shareable report ID |
| `domain`, `platform`, `score`, `grade`, `top_gap` | No | From current report when available |

**Triggered:** Share button on readiness dashboard (`components/share-report-button.tsx`).

---

### `permalink_opened`

User opened a domain-based report permalink.

| Property | Required | Notes |
| --- | --- | --- |
| `reportId` | Yes | Shareable report ID |
| `domainSlug` | Yes | Domain slug from `/report/d/{slug}` |
| `domain`, `platform`, `score`, `grade`, `top_gap` | No | From stored report context |

**Triggered:** Domain permalink page load (`app/report/d/[domainSlug]/report-client.tsx`).

---

### `fix_prompt_copied`

User copied an AI fix prompt for a finding.

| Property | Required | Notes |
| --- | --- | --- |
| `findingId` | Yes | Finding identifier |
| `findingTitle` | Yes | Finding label |
| `domain`, `platform`, `score`, `grade`, `top_gap` | No | From current audit context |

**Triggered:** Copy Fix Prompt button (`components/finding-card.tsx`).

---

### `builtwith_clicked`

User opened the external BuiltWith technology profile link.

| Property | Required | Notes |
| --- | --- | --- |
| `domain` | Yes | Merchant domain |
| `platform`, `score`, `grade`, `top_gap` | No | From current audit when available |

**Triggered:** BuiltWith link in platform detection (`components/other-platform-detection.tsx`).

---

### `report_downloaded`

User downloaded a generated fix asset file.

| Property | Required | Notes |
| --- | --- | --- |
| `filename` | Yes | Downloaded asset filename |
| `domain`, `platform`, `score`, `grade`, `top_gap` | No | From current audit when available |

**Triggered:** Download button on generated assets (`components/generated-fixes-section.tsx`).

---

### `recent_scan_clicked`

User opened a scan from the recent scans list.

| Property | Required | Notes |
| --- | --- | --- |
| `domain` | Yes | Scan hostname |
| `platform` | No | Stored platform |
| `score` | No | Stored score |
| `grade` | No | Stored grade |
| `top_gap` | No | Stored top gap |

**Triggered:** Recent scan cards and linkable recent entries (`app/page.tsx`, `components/recent-audits.tsx`, `app/recent/recent-client.tsx`).

---

### `contact_clicked`

User navigated to the Contact page from site navigation.

| Property | Required | Notes |
| --- | --- | --- |
| `location` | Yes | `header`, `footer`, or `mobile_nav` |

**Triggered:** Contact links in header and footer (`components/site-header.tsx`, `components/site-footer.tsx`).

---

## Additional events

These are also tracked but were not part of the initial product-event spec:

| Event | Properties | Trigger |
| --- | --- | --- |
| `page_view` | `page_path`, `page_location`, `page_title` | GA4 route changes (`components/ga4-page-view-tracker.tsx`) |
| `platform_detected` | `domain`, `platform`, `score`, `grade`, `top_gap`, `confidence`, `confidenceScore` | Successful scan platform attribution (`app/page.tsx`) |
| `feedback_submitted` | `sentiment`, `reportId` | Platform feedback modal submit |
| `report_viewed` | `reportId`, scan context | Shared report page load |
| `new_scan_clicked` | `currentReportId` | Try Another Site / reset scan |

## Diagnostics

After unlocking admin tools, open `/{ADMIN_ROUTE_PATH}/analytics-status` (for example `/admin-panel/analytics-status` when `ADMIN_ROUTE_PATH=admin-panel`) to verify GA4 and PostHog configuration and inspect the latest events captured in the current browser session.

Related admin-only diagnostics:

- `/{ADMIN_ROUTE_PATH}/agent-readiness` — live AI discoverability checks
- `/api/health` — public JSON health check (linked from the admin Internal tools section)

## Implementation files

| File | Role |
| --- | --- |
| `lib/analytics-config.ts` | Env var helpers, production gating |
| `lib/analytics-properties.ts` | Standard scan property builders |
| `lib/analytics-events.ts` | PostHog + GA4 event capture |
| `lib/analytics-event-log.ts` | Session event log for diagnostics |
| `components/analytics-provider.tsx` | GA4 script initialization |
| `components/ga4-page-view-tracker.tsx` | GA4 `page_view` on navigation |

# Changelog

All notable changes to Commerce Optimizer are documented here and on [/release-notes](/release-notes).

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

Release dates match git commits that bumped `lib/app-version.ts`. See `AGENTS.md` for the release workflow (`release:add` → one commit, or `release:docs` + amend if the version was committed first).

## [3.6.2] - 2026-11-01

### [Fixes]
- Fixed homepage runtime crash by moving Shopify hostname/password-page helpers into a client-safe module so `undici` / `node:net` are no longer imported into the browser bundle via ecommerce eligibility checks

## [3.6.1] - 2026-11-01

### [UX]
- Added Shopify storefront password unlock flow for password-gated development stores, with an on-page password prompt and retry path

### [Infrastructure]
- Password unlock handshake uses a browser-compatible User-Agent because Shopify rejects unlock requests from MerchantSignalsBot
- Crawl session cookies are now forwarded when resolving nested sitemap files so password-gated product sitemaps can be read

### [Fixes]
- Decoded HTML entities in sitemap `<loc>` URLs (for example `&amp;` → `&`) so Shopify product sitemap query strings resolve correctly
- Treated `*.myshopify.com` hosts as Shopify ecommerce storefronts so unlocked development stores are not misclassified as non-ecommerce

### [Platform Detection]
- Applied a high-confidence Shopify domain hint for `*.myshopify.com` development hosts

## [3.6.0] - 2026-06-11

### [UX]
- Repositioned homepage hero around Agentic Commerce Readiness with updated headline, subheadline, and supporting copy
- Added How Merchant Signals Works section with a three-step readiness assessment flow
- Added What You'll Learn report preview section with screenshots of readiness scores, platform detection, recommendations, and fix prompts
- Renamed Recent Scans to Example Reports on the homepage with supporting text, full-card links, View Report CTA, and hover states

### [Positioning]
- Shifted homepage language from audit-tool framing toward assessment, readiness evaluation, and agentic commerce readiness

### [Homepage]
- Reordered pre-scan homepage sections: hero URL input, How It Works, report preview, example reports, then platform marketing content

### [Analytics]
- Added `hero_scan_started`, `example_report_clicked`, `report_preview_viewed`, and `how_it_works_viewed` events

### [Admin]
- Moved analytics status and agent readiness diagnostics under the obscured admin path with the same `ADMIN_RESET_TOKEN` session gate as scan analytics
- Added Internal tools section on the admin landing page with links to scan analytics, analytics status, agent readiness, and public API health
- Removed public `/analytics-status` and `/agent-readiness` routes

## [3.5.9] - 2026-06-10

### [Infrastructure]
- Added official `MerchantSignalsBot/1.0` User-Agent for storefront crawl requests with a link to the crawler transparency page
- Added `/crawler` to the public sitemap

### [Transparency]
- Added public Merchant Signals Crawler page documenting MerchantSignalsBot purpose, behavior, contact information, opt-out guidance, and robots transparency
- Added placeholder section for future crawler verification information

### [Crawler]
- MerchantSignalsBot performs read-only analysis of public storefront content and does not impersonate browsers or search engines

### [Analytics]
- Added `crawler_page_viewed` event with `referrer` property

## [3.5.8] - 2026-06-10

### [Infrastructure]
- Added two-phase scan architecture separating lightweight technology detection from full readiness auditing
- Added Partial Report experience when deeper crawling is blocked, rate-limited, or interrupted
- Prevented partial reports from polluting readiness benchmarks and average score calculations

### [Platform Detection]
- Added Technology Detection Mode for shallow homepage-based platform identification
- Improved public platform confidence presentation without exposing internal scoring mechanics

### [UX]
- Partial reports now show detected platform, confidence, failure reason, and suggested next steps instead of a generic failed scan screen
- Shareable URLs supported for partial reports with clear Partial Report labeling
- Added Storefront Review Request workflow for blocked or failed scans so merchants, agencies, and partners can request future support evaluation

### [Analytics]
- Added `technology_detection_started`, `technology_detection_completed`, `technology_detection_failed`, `full_audit_started`, `full_audit_completed`, `full_audit_failed`, and `partial_report_created` events
- Added `domain_review_created`, `domain_review_updated`, `domain_review_reclassified`, and `domain_review_whitelisted` events
- Added `storefront_review_requested`, `storefront_review_submitted`, and `storefront_review_completed` events

### [Fixes]
- Improved full audit failure classification with actionable messaging when technology signals were detected but readiness auditing could not complete
- Improved DNS and fetch failure messaging instead of exposing raw internal errors such as "fetch failed"

### [Admin]
- Expanded Non-Ecommerce Domain review into a unified Domain Review Queue for bot-blocked storefronts, server errors, rate limits, DNS failures, SSL failures, and other scan classifications
- Added retry controls, administrative review actions, and smarter scan suppression to reduce unnecessary rescanning
- Added Storefront Review Requests admin queue with status management, review notes, and notification email foundation

### [Product Feedback]
- Added storefront review request collection for unsupported or blocked storefronts without implying manual scans or bypassing protections

### [Scan Reliability]
- Automatically classifies repeated scan failures and suppresses rescans during configurable retry windows

## [3.5.7] - 2026-06-09

### [Platform Detection]
- Improved commercetools detection with additional SDK, API endpoint, Frontastic, and storefront route fingerprints
- Added verified domain hint support for headless commercetools storefronts such as ee.co.uk

### [UX]
- Added Recommended Starting Point guidance below the Business Summary to highlight the highest-impact first action
- Improved Business Summary language for non-technical business owners
- Improved bot-blocked storefront messaging with clearer meaning and next steps
- Enhanced scan failure diagnostics with specific user-facing explanations and confidence levels

### [Infrastructure]
- Added domain-based report permalink architecture with latest-report resolution per normalized domain
- Added domain scan index and per-domain scan history foundation for future trend views
- Added indexed report deduplication and duplicate-scan reuse foundations

### [Analytics]
- Added `permalink_opened` event for domain report permalinks
- Normalized scan failure analytics reasons using structured error codes

### [Fixes]
- Differentiated DNS, SSL, 403, 429, 5xx, timeout, gateway, and not-found scan failures instead of a generic server error message

## [3.5.6] - 2026-06-08

### [Analytics]
- Added internal analytics exclusion controls for development and validation activity
- Improved analytics data quality and reporting reliability while preserving normal tracking for site visitors

### [Admin]
- Added internal testing safeguards to prevent analytics pollution during product development

### [Infrastructure]
- Updated analytics diagnostics to reflect suppression status in the browser

## [3.5.5] - 2026-06-08

### [Platform Detection]
- Added first-class Shopware platform detection with storefront assets, theme JavaScript bundles, official plugin bundles, web components, URL patterns, and verified domain hints
- Expanded European ecommerce platform coverage with a Shopware validation fixture suite and nine confirmed validation storefronts

### [Fixes]
- Prevent strong Shopware storefronts from being incorrectly classified as non-ecommerce or content sites when platform fingerprints are clear but generic storefront signals are sparse

### [Infrastructure]
- Added `docs/platform-coverage.md` documenting supported platforms and detection signals
- Added `npm run validate:shopware` for offline Shopware detection regression checks
- Added `platform_detected` analytics event on successful scans

## [3.5.4] - 2026-06-07

### [Analytics]
- Wired nine product events to both PostHog and GA4: `scan_started`, `scan_completed`, `scan_failed`, `report_shared`, `fix_prompt_copied`, `builtwith_clicked`, `report_downloaded`, `recent_scan_clicked`, and `contact_clicked`
- Added shared scan context properties (`domain`, `platform`, `score`, `grade`, `top_gap`) on scan-related events via unified capture helpers
- Renamed legacy event names (`share_report` → `report_shared`, `copy_fix_prompt` → `fix_prompt_copied`) for consistent GA4 and PostHog reporting
- Added `analytics.md` documenting all tracked events, standard properties, and trigger locations
- Updated `/analytics-status` to reflect GA4 product event delivery alongside page views

## [3.5.3] - 2026-06-07

### [Analytics]
- Added GA4 support with production-only `page_view` tracking and privacy-friendly configuration
- Added PostHog integration with lazy initialization, product event tracking, and session recording
- Added `/analytics-status` diagnostics page for GA4 and PostHog configuration checks

### [UX]
- Updated homepage supporting copy to reflect how AI systems discover, evaluate, and transact with merchant storefronts

### [Platform]
- Instrumented scan lifecycle, platform detection, fix prompt copy, report sharing, feedback, and shared report view events

## [3.5.2] - 2026-06-07

### [Platform]
- Added dynamic `robots.txt` with explicit AI crawler allowances and Content-Signal preferences
- Added dynamic `sitemap.xml` for core public pages with canonical URLs

### [AI Discoverability]
- Added RFC8288 Link headers on the homepage for sitemap, service documentation, and API catalog discovery
- Added `/.well-known/api-catalog` in RFC9727 `application/linkset+json` format
- Added `Accept: text/markdown` support for the homepage and About page
- Added informational `/agent-readiness` debug page for live discoverability checks

### [Infrastructure]
- Added `/api-docs` alias for API documentation discoverability
- Documented deferred agent discoverability patterns (OAuth, MCP, A2A, WebMCP, DNS-AID, and related specs)

## [3.5.1] - 2026-06-07

### [Fixes]
- Updated Share Report button styling to match site blue theme on the readiness score card
- Gracefully handle scanning errors when sites use bot protection (e.g. Cloudflare) with a clear “Scan Temporarily Blocked” message instead of generic server errors
- Fixed Admin Non-Ecommerce Domains Remove action (blur race and domain normalization mismatch)
- Prevent bot-protected ecommerce sites from being incorrectly added to the non-ecommerce quarantine list

## [3.5.0] - 2026-06-07

### [UX]
- Added Business Summary section with merchant-friendly readiness explanation above technical findings
- Added Share Report functionality with permanent `/report/{id}` URLs

### [Optimization]
- Added Copy Fix Prompt on every finding card with platform-aware remediation guidance
- Added View Evidence label on finding cards for clearer technical detail access

### [Admin]
- Added Non-Ecommerce Domains quarantine list with search, approve, remove, and notes workflow
- Added admin API for managing quarantined non-storefront domains

### [Data Quality]
- Automatically quarantine non-ecommerce domains after classification
- Block repeat scans of quarantined domains before crawl or cache lookup
- Exclude quarantined domains from benchmarks, recent audits, and platform statistics

## [3.4.1] - 2026-06-07

### [Platform Detection]
- Improved Adobe Commerce (Magento) platform detection accuracy
- Added initial support for VTEX storefront detection
- Added initial support for Fenicio storefront detection
- Expanded platform fingerprint coverage using storefront assets, JavaScript bundles, metadata, URL patterns, and hosting signals
- Refined platform confidence scoring model with weighted signals: 10% IP/hosting, 45% storefront assets, 25% JavaScript bundles, 20% URL patterns
- Improved platform attribution reliability for international ecommerce storefronts

### [UX]
- Recent Scans entries are now clickable
- Users can navigate directly from Recent Scans to the corresponding stored scan results

### [Infrastructure]
- Added validation datasets for VTEX and Fenicio platform detection
- Improved platform classification framework to support future international commerce platform expansion

### [Fixes]
- Reduced Adobe Commerce false positives and platform misclassification issues
- Improved handling of previously unidentified commerce platforms

## [3.4.0] - 2026-06-05

### Added
- VTEX and Fenicio platform detection with verified LATAM domain hints
- Platform Leaderboard table replacing fixed platform benchmark cards
- Platform detection feedback modal (stored in Redis)
- Footer email signup for product updates (stored in Redis)
- Post-audit Recommended Next Steps with direct action buttons
- Benchmark sample persistence in Redis (platform, score, top gap, timestamp)

### Changed
- Improved Adobe Commerce (Magento) detection using storefront assets, mage-init, and catalog fingerprints
- Footer cleanup: removed duplicate branding, updated disclaimer, version 3.4.0
- Release notes: latest release expanded, older releases collapsed
- Invalid non-ecommerce scans show clearer messaging and are excluded from benchmarks
- `release:add` auto-categorizes changelog entries with [Added]/[Changed]/[Fixed] prefixes

## [3.3.2] - 2026-06-05

### Changed
- Animated audit progress bar with rotating crawl status during 5–15 second scans
- Recent audit cards show pointer cursor, per-card loading overlay, and scroll-to-hero when opening a cached audit

## [3.3.1] - 2026-06-05

### Changed
- Simplified homepage hero: Merchant Signals label, outcome-focused headline, clearer product messaging
- Restructured About page: creator first, why Merchant Signals, then Commerce Optimizer product summary
- Restored independent-project disclaimer in footer, About, and Contact
- Release notes navigation: newest first, collapsible groups by version family (3.3.x, 3.2.x, …)

## [3.3.0] - 2026-06-05

### Changed
- Update Header with parent brand and product name
- Update Footer with parent brand and product name
- Update About page with parent brand and product name
- Update Site metadata/Open Graph with parent brand and product name

## [3.2.10] - 2026-06-04

### Fixed
- commercetools detection for headless storefronts (Bang & Olufsen, PetSmart, Carhartt, L'Oréal Paris US) via `__NEXT_DATA__` probes, expanded fingerprints, and verified domain hints
- Platform false positives from PetSmart `robots.txt` legacy Demandware paths, generic `/product/` WooCommerce URLs, and cross-domain Shopify links (e.g. Carhartt Reworked)
- Homepage recent-audit card column overlap (Platform vs Top Gap)
- Recent Audits domain URLs open the storefront in a new tab

### Changed
- Platform label displays **commercetools** (not Other Platforms) when CommerceTools is detected

## [3.2.9] - 2026-06-04

### Fixed
- Ecommerce eligibility no longer passes brochure or local-business sites that only expose Squarespace/Wix cart URLs without product catalog signals
- Requires core storefront findings (product pages, schema, catalog, or pricing) before cart/checkout/platform points count
- Rejects LocalBusiness, Restaurant, and similar non-storefront schema when no catalog signals are present

## [3.2.8] - 2026-06-04

### Added
- Ecommerce eligibility validation before persisting scans (`ecommerceConfidence` threshold 50)
- Parked-domain and coming-soon detection with immediate rejection
- Lightweight rejection log (`domain`, `timestamp`, `reason`, `ecommerceConfidence`) for troubleshooting
- API `scanStatus: invalid_non_ecommerce_site` response and dedicated homepage notice

### Changed
- Invalid non-storefront scans are no longer cached, recorded in Recent Audits, audit history, or platform benchmarks

## [3.2.7] - 2026-06-04

### Changed
- Homepage section order: hero → differentiator → audit checks → assets → platform stats → recent audits
- Platform readiness cards use local wordmarks, shorter layout, eight featured platforms
- **Other Platforms** label (plural); compact homepage recent audit cards only
- Release notes grouped in v3/v2/v1 accordions; pre-3.0 backfill from git history
- About page creator section; Release Notes link in footer only

## [3.2.6] - 2026-06-04

### Changed
- Renamed **Unknown Platform** to **Other Platform** with compact `(i)` tooltip on cards and tables
- BuiltWith link only in audit **Platform Detection** (not on every recent audit card)
- Platform readiness cards include local icon treatments, **commercetools**, and **Adobe Commerce**
- Grade badges stay on one line (desktop `Grade F`, mobile circular letter)

### Added
- `CHANGELOG.md`, `/release-notes`, and `npm run release:add`
- Contributor optional fields: company, URL, testimonial, active flag

## [3.2.5] - 2026-06-04

### Added
- Platform confidence help, BuiltWith reference, low-score scope note
- Mobile-first homepage CTA, platform readiness stats, About rewrite
- Dynamic API docs version examples

## [3.2.4] - 2026-06-04

### Changed
- Other Platform as plain muted text (no badge pill)

## [3.2.3] - 2026-06-04

### Changed
- UI polish: score layout, confidence badges, finding cards, Missing section styling

## [3.2.2] - 2026-06-04

### Changed
- Semantic theme tokens, dark mode cards, homepage positioning

## [3.2.1] - 2026-06-04

### Fixed
- Audit metadata timestamp / local timezone display

## [3.2.0] - 2026-06-04

### Added
- Historical audit storage, benchmarking, audit confidence, domain normalization

## [3.1.3] - 2026-06-03

### Changed
- Dynamic API documentation base URL

## [3.1.2] - 2026-06-03

### Changed
- Scroll offset, mobile badges, dark mode headers

## [3.1.1] - 2026-06-03

### Changed
- Platform labels, recent audits layout, mobile nav, contributors admin

## [3.1.0] - 2026-06-03

### Fixed
- Invalid domain handling

## [3.0.4] - 2026-06-03

### Changed
- Dimension score UX

## [3.0.3] - 2026-06-03

### Changed
- Scroll to overview after audit

## [3.0.2] - 2026-06-03

### Fixed
- Miscellaneous bug fixes; version in header/footer

## [3.0.1] - 2026-06-03

### Fixed
- Removed artificial scoring; activity feed fixes

## [3.0.0] - 2026-06-02

### Added
- AI Commerce Readiness scoring, executive dashboard, visual refresh

## [2.8.1] - 2026-06-02

### Added
- Admin tools, single audit delete, banned domains, recent scans UX

## [2.8.0] - 2026-06-02

### Added
- Scan rate limits, banned domains, audit deduplication

## [2.6.0] - 2026-06-02

### Changed
- Product UX improvements from early user feedback

## [2.5.0] - 2026-06-02

### Changed
- Production cleanup before launch

## [2.4.0] - 2026-06-02

### Added
- Production readiness, shared activity, bot protection

## [2.3.0] - 2026-05-31

### Changed
- Community and product experience pages

## [2.2.0] - 2026-05-31

### Changed
- Product experience and positioning

## [2.1.0] - 2026-05-31

### Changed
- Generated assets UX improvements

## [2.0.0] - 2026-05-31

### Added
- AI commerce recommendations and generate-fixes API

## [1.5.0] - 2026-05-30

### Changed
- Validation reporting quality improvements

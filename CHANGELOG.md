# Changelog

All notable changes to Commerce Optimizer are documented here and on [/release-notes](/release-notes).

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

Release dates match git commits that bumped `lib/app-version.ts`. See `AGENTS.md` for the release workflow (`release:add` → one commit, or `release:docs` + amend if the version was committed first).

## [3.4.1] - 2026-06-06

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

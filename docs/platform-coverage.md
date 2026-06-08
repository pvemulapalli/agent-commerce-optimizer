# Platform Coverage

Internal reference for supported commerce platform detection in Merchant Signals.

Detection uses weighted signals across storefront assets (45%), JavaScript bundles (25%), URL patterns (20%), and hosting/IP clues (10%, supporting only). Assignment requires at least **6 primary points** and **2 distinct primary signal categories** unless a verified domain hint applies.

## Supported platforms

| Platform | Display label | Primary detection signals |
| --- | --- | --- |
| Shopify | Shopify | `cdn.shopify.com`, Shopify theme features, `/products/`, `/collections/`, cart endpoints |
| BigCommerce | BigCommerce | Stencil bundles (`stencil.bundle`), BigCommerce assets, `/p/` category URLs |
| Salesforce Commerce Cloud | Salesforce Commerce Cloud (Demandware) | `demandware.net`, `/on/demandware.store/`, SFCC product permalinks |
| Adobe Commerce | Adobe Commerce | Magento RequireJS, `mage-init`, static frontend paths, REST/GraphQL catalog endpoints |
| WooCommerce | WooCommerce | WooCommerce plugin paths, `wp-json/wc/`, product category permalinks |
| VTEX | VTEX | VTEX CDN assets, IO runtime scripts, `/p` and checkout hash routes |
| Fenicio | Fenicio | Fenicio CDN/API hosts, catalog URL structures, storefront branding |
| Shopware | Shopware | Theme `storefront.js` bundles, `swag-*` plugins, `<sw-*>` components, `/detail/` and `/checkout/` routes, `/bundles/` assets |
| Squarespace | Squarespace | Squarespace commerce assets and shop URL patterns |
| Wix | Wix | Wix runtime, Wix Stores assets, store URL patterns |
| commercetools | commercetools | commercetools composable commerce assets and API markers |
| Other Platforms | Other Platforms | Insufficient weighted signals for a dedicated platform |

## Shopware research notes (v3.5.5)

Validated against European storefront samples including STABILO, Miss Pompadour, 0815.eu, Gravado, BWT, Biomaris, Feelgood Shop, Caseys, and Juniper Jack.

Common Shopware 6 fingerprints:

- Theme JavaScript: `/theme/{hash}/js/storefront/storefront.js` or bundled `/theme/{hash}/js/all.js`
- Official plugins: `/js/swag-pay-pal/`, `/js/swag-cms-extensions/`, `/js/swag-amazon-pay/`
- Storefront web components: `<sw-cms-page>`, `<sw-listing>`, `<sw-offcanvas-cart>`, `data-sw-*` attributes
- Symfony bundle assets under `/bundles/`
- SEO product routes such as `/detail/{slug-id}`
- Checkout routes under `/checkout/`
- Category navigation routes under `/navigation/`
- Hosted CDN patterns such as `s3sw-*` (custom Shopware hosting)
- Runtime config markers: `sw-cookie`, `sw-environment`, `sw-base-url`, `sw-features`

**Note:** `armedangels.com` from the research set runs on Shopify, not Shopware. It is excluded from Shopware domain hints and used as a negative control in fixture validation.

## Domain hints

Verified storefront domains can receive high-confidence overrides when crawl fingerprints are weak:

- `lib/vtex-domain-hints.ts`
- `lib/fenicio-domain-hints.ts`
- `lib/magento-domain-hints.ts`
- `lib/commercetools-domain-hints.ts`
- `lib/shopware-domain-hints.ts`

## Validation

| Command | Purpose |
| --- | --- |
| `npm run validate:platforms` | Live crawl validation across `data/test-sites.json` |
| `npm run validate:shopware` | Offline Shopware fixture detection (`data/shopware-detection-fixtures.json`) |

## Ecommerce eligibility safeguard

Strong Shopware detection (`confidence !== low` and `confidenceScore >= 55`) prevents false **Non-Ecommerce** / content-site classification when storefront HTML signals are sparse but platform fingerprints are clear.

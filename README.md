# AI Commerce Discoverability Optimizer

Audit ecommerce websites and identify how easily AI systems, shopping agents, and large language models can discover, understand, and interact with merchant content.

Generate machine-readable assets such as:

* llms.txt
* Merchant profiles
* Organization schema
* Product schema templates
* FAQ schema templates
* AI Commerce Readiness reports

---

## Why I Built This

AI-powered commerce experiences are becoming increasingly common.

Consumers are beginning to discover products through ChatGPT, Claude, Perplexity, Gemini, and emerging shopping agents rather than traditional search engines.

Many merchant websites contain the information AI systems need, but that information is often difficult to discover, poorly structured, or missing entirely.

This project helps merchants understand:

* Can AI systems discover my products?
* Can AI systems understand my business?
* Are my policies easy to find?
* Is my catalog machine-readable?
* What structured assets are missing?

The goal is not SEO.

The goal is improving AI Commerce Discoverability.

---

## Features

### Ecommerce Audit

Analyze merchant websites for:

* Product discovery
* Catalog discovery
* Product pricing
* Product availability
* FAQ pages
* Shipping policies
* Return policies
* Contact information
* Structured data
* AI-readable assets

### Platform Detection

Detect major commerce platforms including:

* Shopify
* BigCommerce
* Salesforce Commerce Cloud
* WooCommerce
* Wix
* Squarespace
* Magento
* CommerceTools

### Generated Assets

Generate:

* llms.txt
* merchant-profile.md
* organization-schema.json
* product-schema-template.json
* faq-schema-template.json
* agent-commerce-readiness.md

---

## Screenshots

(Add screenshots here)

---

## Local Development

### Prerequisites

* Node.js 20+
* npm

### Install

```bash
git clone https://github.com/pvemulapalli/agent-commerce-optimizer.git

cd agent-commerce-optimizer

npm install
```

### Run

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

---

## Environment Variables

Create:

```bash
.env.local
```

Example:

```bash
AUDIT_CACHE_TTL_MINUTES=120

UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

SCAN_RATE_LIMIT_PER_HOUR=10

ENABLE_TURNSTILE=false

NEXT_PUBLIC_TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=
```

---

## Upstash Redis Setup

Create a free Redis database:

1. Sign in at https://upstash.com
2. Create a Redis database
3. Copy:

```bash
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
```

4. Add to .env.local

Redis is used for:

* Global scan counter
* Recent scans
* Rate limiting
* Shared activity feed

---

## Cloudflare Turnstile Setup

Turnstile is optional.

1. Create a Turnstile widget in Cloudflare.
2. Copy:

```bash
NEXT_PUBLIC_TURNSTILE_SITE_KEY
TURNSTILE_SECRET_KEY
```

3. Set:

```bash
ENABLE_TURNSTILE=true
```

Turnstile helps prevent automated abuse while keeping the experience frictionless for legitimate users.

---

## API

### Audit Website

POST

```text
/api/audit
```

Request:

```json
{
  "url": "https://www.gymshark.com"
}
```

### Generate Assets

POST

```text
/api/generate-fixes
```

Request:

```json
{
  "url": "https://www.gymshark.com"
}
```

---

## Roadmap

* Improved ecommerce discovery
* Merchant recommendations
* OpenAPI specification
* x402 compatibility
* Merchant endpoint integration
* Visa CLI onboarding exploration

---

## Disclaimer

This is a personal educational project created by Praveen Vemulapalli.

This project is not affiliated with, endorsed by, supported by, or representative of any employer, company, organization, or payment network.

Any opinions, code, demonstrations, examples, or workflows are personal and provided for educational purposes only.

---

## Contact

Praveen Vemulapalli

LinkedIn:
https://www.linkedin.com/in/praveenvemulapalli/

X:
https://x.com/PraveenVem

GitHub:
https://github.com/pvemulapalli

---

## License

Apache License 2.0

# AI Commerce Discoverability Optimizer

A personal, educational tool for auditing how well merchant websites expose signals that AI agents can discover and understand. It crawls public pages and discovery files, reports evidence-backed findings, and generates downloadable fix drafts — with no LLM calls, scoring, billing, or authentication.

**Disclaimer:** This project is for personal and educational use only. It is not production-ready software and is **not affiliated with or supported by Visa**.

## What it does

1. **Audit** — Crawls a merchant URL (robots.txt, sitemap, up to 20 prioritized pages, related support subdomains) and reports Detected / Missing / Needs Review findings with evidence URLs.
2. **Generate fixes** — After an audit, builds six downloadable assets from crawled evidence only:
   - `llms.txt`
   - `merchant-profile.md`
   - `organization-schema.json`
   - `product-schema-template.json`
   - `faq-schema-template.json`
   - `agent-commerce-readiness.md`

Missing facts are marked as `TODO` — nothing is invented.

## Getting started

Install dependencies and start the dev server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Optional cache TTL (minutes). Default is 120; set to `0` to bypass cache:

```bash
cp .env.local.example .env.local
# AUDIT_CACHE_TTL_MINUTES=120
```

## Run an audit

**UI:** Enter a merchant URL and click **Run Audit**.

**API:**

```bash
curl -s -X POST http://localhost:3000/api/audit \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com"}' | jq .
```

The response includes platform analysis, grouped findings, and cache status (`HIT`, `MISS`, or `BYPASS`).

## Generate fixes

Fix generation reuses the audit crawl and cache. Run it after an audit (the UI triggers this automatically) or call the API directly:

```bash
curl -s -X POST http://localhost:3000/api/generate-fixes \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com"}' | jq .
```

Example response shape:

```json
{
  "auditedUrl": "https://example.com",
  "generatedAt": "2026-05-30T12:00:00.000Z",
  "assets": [
    {
      "filename": "llms.txt",
      "contentType": "text/plain",
      "content": "..."
    }
  ]
}
```

In the UI, each asset shows a preview plus **Copy** and **Download** buttons.

## Other scripts

```bash
npm run validate:platforms   # Batch platform detection validation against test merchants
npm run build
npm run lint
```

## License

See repository license if present. Use at your own risk.

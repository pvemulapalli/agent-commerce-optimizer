/**
 * Optional live validation against production + password-gated Shopify development stores.
 *
 * Usage:
 *   STOREFRONT_PASSWORD='…' npx tsx scripts/validate-evidence-regression.mts
 *
 * Never commit passwords. Prints qualitative checks only — no cookies/passwords.
 * Writes a sanitized comparison JSON under /tmp (not the git tree).
 */

import { existsSync, readFileSync, writeFileSync } from "fs";
import os from "os";
import path from "path";
import {
  enrichAuditResponse,
  type EnrichedAuditResponse,
} from "../lib/enrich-audit-response";
import { generateFixAssets } from "../lib/generate-assets";
import { buildReadinessReport, SCORE_EVIDENCE_NOTE } from "../lib/readiness-score";
import { runFullReadinessAudit } from "../lib/run-audit";
import {
  SCORING_MODEL_LEGACY,
  type ScoringModelVersion,
} from "../lib/scoring-model";
import { getShareableReport } from "../lib/shareable-reports";
import { resolveStorefrontAccess } from "../lib/storefront-access";
import type { Finding, FindingStatus } from "../lib/types";

const PRODUCTION =
  process.env.EVIDENCE_PROD_URL ?? "https://www.zitasartstudio.com";
const DEVELOPMENT =
  process.env.EVIDENCE_DEV_URL ??
  "https://zitas-art-studio-development.myshopify.com";

const BASELINE_PROD_ID =
  process.env.EVIDENCE_PROD_REPORT_ID ?? "Eg_t6RD0brI9mkamEVT_Ww";
const BASELINE_DEV_ID =
  process.env.EVIDENCE_DEV_REPORT_ID ?? "L2CVH8p4w7U8fGogOsiBkA";

const KEY_FINDINGS = [
  "collection-pages",
  "product-pages",
  "product-schema",
  "offer-schema",
  "organization-schema",
  "faq-page",
  "help-center",
  "return-portal",
  "api-developer-docs",
  "refund-page",
  "returns-page",
  "cart-checkout-pages",
  "llms-txt",
  "item-list-schema",
] as const;

function loadEnvLocal(): void {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;

  const content = readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim();
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function assertNoSecrets(payload: unknown, label: string): void {
  const raw = JSON.stringify(payload);
  if (
    /storefront_digest=[A-Za-z0-9%._-]+/i.test(raw) ||
    /_secure_session_id=[A-Za-z0-9%._-]+/i.test(raw) ||
    /zita123/i.test(raw) ||
    /"cookieHeader"\s*:\s*"[^"]+"/i.test(raw)
  ) {
    throw new Error(`Secret material detected in ${label} output — aborting.`);
  }
}

function findingIndex(findings: Finding[]): Record<string, Finding> {
  return Object.fromEntries(findings.map((f) => [f.id, f]));
}

function statusCounts(findings: Finding[]): Record<FindingStatus, number> {
  return {
    detected: findings.filter((f) => f.status === "detected").length,
    missing: findings.filter((f) => f.status === "missing").length,
    needs_review: findings.filter((f) => f.status === "needs_review").length,
  };
}

function sanitizeUrl(url: string): string {
  return url.replace(/([?&](password|token|key)=)[^&]+/gi, "$1[REDACTED]");
}

function summarize(
  enriched: EnrichedAuditResponse,
  options?: { forceScoringModel?: ScoringModelVersion },
) {
  // Historical shareable records lack scoringModelVersion — preserve legacy math.
  const scoringModelVersion: ScoringModelVersion =
    options?.forceScoringModel ??
    enriched.scoringModelVersion ??
    SCORING_MODEL_LEGACY;
  const report = buildReadinessReport(enriched, {
    merchantName: enriched.auditMetadata?.merchantName,
    scoringModelVersion,
  });
  const byId = findingIndex(enriched.findings);
  const coverage = enriched.crawlSummary.coverage;
  const key = Object.fromEntries(
    KEY_FINDINGS.map((id) => {
      const f = byId[id];
      return [
        id,
        f
          ? {
              status: f.status,
              confidence: f.confidence,
              verificationLimitation: f.verificationLimitation ?? null,
              evidenceKind: f.evidenceKind ?? null,
              evidence: f.evidence.slice(0, 220),
              evidenceUrls: (f.evidenceUrls ?? []).slice(0, 5).map(sanitizeUrl),
            }
          : null,
      ];
    }),
  );

  return {
    scoringModelVersion,
    score: report.score,
    grade: report.grade,
    dimensions: Object.fromEntries(
      report.dimensions.map((d) => [d.id, { label: d.label, score: d.score }]),
    ),
    confidence: {
      label: enriched.auditConfidence.label,
      score: enriched.auditConfidence.score,
      signals: enriched.auditConfidence.signals,
    },
    coverage: coverage
      ? {
          urlsDiscovered: coverage.urlsDiscovered,
          urlsSelected: coverage.urlsSelected,
          urlsFetched: coverage.urlsFetched,
          urlsSucceeded: coverage.urlsSucceeded,
          blockedByPasswordGate: coverage.blockedByPasswordGate,
          redirectedToPassword: coverage.redirectedToPassword,
          fetchFailed: coverage.fetchFailed,
          skippedByBudget: coverage.skippedByBudget,
          storefrontAccess: coverage.storefrontAccess,
          pageClassCounts: coverage.pageClassCounts,
          collectionUrlsDiscovered: coverage.collectionUrlsDiscovered,
          collectionUrlsFetched: coverage.collectionUrlsFetched,
        }
      : null,
    pagesCrawled: enriched.crawlSummary.pagesCrawled,
    statusCounts: statusCounts(enriched.findings),
    keyFindings: key,
    scoreEvidenceNote: SCORE_EVIDENCE_NOTE,
  };
}

type Summary = ReturnType<typeof summarize>;

function diffFindings(before: Summary | null, after: Summary) {
  if (!before) return [];
  const changes: Array<{
    id: string;
    before: string | null;
    after: string;
    beforeLimitation: string | null;
    afterLimitation: string | null;
  }> = [];
  for (const id of KEY_FINDINGS) {
    const b = before.keyFindings[id];
    const a = after.keyFindings[id];
    if (!a) continue;
    const beforeStatus = b?.status ?? null;
    const afterStatus = a.status;
    const beforeLim = b?.verificationLimitation ?? null;
    const afterLim = a.verificationLimitation ?? null;
    if (beforeStatus !== afterStatus || beforeLim !== afterLim) {
      changes.push({
        id,
        before: beforeStatus,
        after: afterStatus,
        beforeLimitation: beforeLim,
        afterLimitation: afterLim,
      });
    }
  }
  return changes;
}

async function loadBaseline(reportId: string): Promise<Summary | null> {
  const record = await getShareableReport(reportId);
  if (!record?.result) {
    console.warn(`Baseline report ${reportId} not found or partial-only.`);
    return null;
  }
  assertNoSecrets(record.result, `baseline ${reportId}`);
  return summarize(record.result, {
    forceScoringModel: record.result.scoringModelVersion
      ? undefined
      : SCORING_MODEL_LEGACY,
  });
}

async function scan(label: string, url: string, password?: string) {
  console.log(`\n=== ${label}: ${url} ===`);
  const access = await resolveStorefrontAccess(url, password);
  const unlocked = Boolean(access.crawlContext?.cookieHeader);
  console.log(
    "auth",
    password ? (unlocked ? "unlocked (cookie redacted)" : "unlock failed") : "none",
  );

  const audit = await runFullReadinessAudit(url, {
    crawlContext: access.crawlContext,
    skipCache: true,
    skipInitialReachability: unlocked,
  });
  const enriched = await enrichAuditResponse({
    audit,
    crawlSummary: audit.crawlSummary,
    crawlDurationSec: null,
    generationContext: audit.generationContext,
  });

  assertNoSecrets(enriched, label);

  const summary = summarize(enriched);
  console.log("scoringModelVersion", summary.scoringModelVersion);
  console.log("overall", summary.score, summary.grade);
  console.log("confidence", summary.confidence.label, summary.confidence.score);
  console.log("coverage", summary.coverage);
  console.log("statusCounts", summary.statusCounts);
  for (const id of KEY_FINDINGS) {
    const f = summary.keyFindings[id];
    if (!f) continue;
    console.log(
      id,
      f.status,
      f.verificationLimitation ?? "-",
      f.evidenceUrls[0] ?? f.evidence.slice(0, 80),
    );
  }

  let productAssetNote: string | null = null;
  let productAssetHasDuplicateGuard = false;
  if (audit.generationContext) {
    const assets = generateFixAssets(audit.generationContext);
    const productAsset = assets.find(
      (a) => a.filename === "product-schema-template.json",
    );
    productAssetHasDuplicateGuard = Boolean(
      productAsset &&
        /do not (publish a |add a )?duplicate|already_detected|illustrative only/i.test(
          productAsset.content,
        ),
    );
    productAssetNote = productAsset
      ? `${productAsset.filename}: guard=${productAssetHasDuplicateGuard}; ${productAsset.content.slice(-320)}`
      : "no product asset generated";
    console.log(
      "productAsset",
      productAssetNote.replace(/\s+/g, " ").slice(0, 280),
    );
  }

  return {
    enriched,
    summary,
    productAssetNote,
    productAssetHasDuplicateGuard,
    unlocked,
  };
}

function printComparison(label: string, before: Summary | null, after: Summary) {
  console.log(`\n--- Comparison: ${label} ---`);
  if (!before) {
    console.log("Baseline unavailable; documenting new scan only.");
    console.log("after overall", after.score, "model", after.scoringModelVersion);
    return;
  }
  console.log(
    "overall",
    before.score,
    "→",
    after.score,
    `| model ${before.scoringModelVersion ?? "legacy"} → ${after.scoringModelVersion}`,
  );
  console.log(
    "confidence",
    before.confidence.label,
    before.confidence.score,
    "→",
    after.confidence.label,
    after.confidence.score,
  );
  const dimIds = new Set([
    ...Object.keys(before.dimensions),
    ...Object.keys(after.dimensions),
  ]);
  for (const id of [...dimIds].sort()) {
    const b = before.dimensions[id]?.score;
    const a = after.dimensions[id]?.score;
    if (b === undefined && a === undefined) continue;
    console.log(`  dim ${id}: ${b ?? "—"} → ${a ?? "—"}`);
  }
  console.log("statusCounts", before.statusCounts, "→", after.statusCounts);
  console.log("before pagesCrawled", before.pagesCrawled, "coverage", before.coverage);
  console.log("after pagesCrawled", after.pagesCrawled, "coverage", after.coverage);
  const changes = diffFindings(before, after);
  console.log("key finding changes", changes.length ? changes : "none among key set");
}

async function main() {
  loadEnvLocal();

  const password = process.env.STOREFRONT_PASSWORD?.trim();
  if (!password) {
    console.error("Set STOREFRONT_PASSWORD to unlock the development storefront.");
    process.exitCode = 1;
    return;
  }

  console.log("Loading baselines (read-only; not overwritten)…");
  const baselineProd = await loadBaseline(BASELINE_PROD_ID);
  const baselineDev = await loadBaseline(BASELINE_DEV_ID);
  console.log(
    "baselines",
    BASELINE_PROD_ID,
    baselineProd ? `score=${baselineProd.score}` : "MISSING",
    "|",
    BASELINE_DEV_ID,
    baselineDev ? `score=${baselineDev.score}` : "MISSING",
  );

  const prod = await scan("production", PRODUCTION);
  const dev = await scan("development", DEVELOPMENT, password);

  printComparison("production", baselineProd, prod.summary);
  printComparison("development", baselineDev, dev.summary);

  const checks: Array<{ name: string; ok: boolean; detail: string }> = [];

  const coll = dev.summary.keyFindings["collection-pages"];
  checks.push({
    name: "dev collections detected after auth",
    ok: coll?.status === "detected",
    detail: `${coll?.status} lim=${coll?.verificationLimitation} urls=${coll?.evidenceUrls?.join(",")}`,
  });

  checks.push({
    name: "dev auth persisted (unlocked + no password-gate evidence pages)",
    ok:
      dev.unlocked &&
      dev.summary.coverage?.storefrontAccess === "unlocked" &&
      (dev.summary.coverage?.blockedByPasswordGate ?? 0) === 0,
    detail: `unlocked=${dev.unlocked} access=${dev.summary.coverage?.storefrontAccess} blockedByPasswordGate=${dev.summary.coverage?.blockedByPasswordGate}`,
  });

  checks.push({
    name: "dev collection pages classified in coverage",
    ok: (dev.summary.coverage?.pageClassCounts?.collection ?? 0) > 0,
    detail: `collection count=${dev.summary.coverage?.pageClassCounts?.collection} fetched=${dev.summary.coverage?.collectionUrlsFetched}`,
  });

  for (const label of ["production", "development"] as const) {
    const summary = label === "production" ? prod.summary : dev.summary;
    for (const id of [
      "collection-pages",
      "faq-page",
      "help-center",
      "return-portal",
      "api-developer-docs",
    ] as const) {
      const f = summary.keyFindings[id];
      const urls = f?.evidenceUrls ?? [];
      const privacyHit = urls.some((u) => /privacy|\/policies\//i.test(u));
      checks.push({
        name: `${label} ${id} not evidenced by privacy/policy URL`,
        ok: !privacyHit,
        detail: `status=${f?.status} urls=${urls.join(",") || "-"}`,
      });
    }
  }

  const org = dev.summary.keyFindings["organization-schema"];
  checks.push({
    name: "dev Organization remains confirmed gap (missing)",
    ok: org?.status === "missing",
    detail: `${org?.status}`,
  });

  const product = dev.summary.keyFindings["product-schema"];
  const offer = dev.summary.keyFindings["offer-schema"];
  checks.push({
    name: "dev Product/Offer detected",
    ok: product?.status === "detected" && offer?.status === "detected",
    detail: `product=${product?.status} offer=${offer?.status}`,
  });

  checks.push({
    name: "product remediation does not urge blind duplicate",
    ok: dev.productAssetHasDuplicateGuard,
    detail: (dev.productAssetNote ?? "n/a").replace(/\s+/g, " ").slice(0, 240),
  });

  checks.push({
    name: "scoring model stamped evidence-v1",
    ok:
      prod.summary.scoringModelVersion === "2026-11-evidence-v1" &&
      dev.summary.scoringModelVersion === "2026-11-evidence-v1",
    detail: `prod=${prod.summary.scoringModelVersion} dev=${dev.summary.scoringModelVersion}`,
  });

  checks.push({
    name: "UCP/ACP copy identifies readiness proxies",
    ok: /readiness proxies|not verified protocol/i.test(SCORE_EVIDENCE_NOTE),
    detail: SCORE_EVIDENCE_NOTE.slice(0, 160),
  });

  checks.push({
    name: "coverage present for dashboard",
    ok: Boolean(prod.summary.coverage && dev.summary.coverage),
    detail: "coverage objects attached",
  });

  // If sitemap discovered collections but none fetched → needs_review + crawl_budget
  for (const [label, summary] of [
    ["production", prod.summary],
    ["development", dev.summary],
  ] as const) {
    const c = summary.coverage;
    if (
      c &&
      c.collectionUrlsDiscovered > 0 &&
      c.collectionUrlsFetched === 0
    ) {
      const finding = summary.keyFindings["collection-pages"];
      checks.push({
        name: `${label} unfetched collections → needs_review crawl_budget`,
        ok:
          finding?.status === "needs_review" &&
          finding.verificationLimitation === "crawl_budget",
        detail: `status=${finding?.status} lim=${finding?.verificationLimitation}`,
      });
    }
  }

  console.log("\n=== Acceptance checks ===");
  let failed = 0;
  for (const check of checks) {
    console.log(check.ok ? "PASS" : "FAIL", check.name, "—", check.detail);
    if (!check.ok) failed += 1;
  }

  const outPath = path.join(os.tmpdir(), "merchantsignals-evidence-validation-live.json");
  const payload = {
    generatedAt: new Date().toISOString(),
    baselines: {
      production: { reportId: BASELINE_PROD_ID, summary: baselineProd },
      development: { reportId: BASELINE_DEV_ID, summary: baselineDev },
    },
    fresh: {
      production: prod.summary,
      development: {
        ...dev.summary,
        productAssetNote: dev.productAssetNote,
      },
    },
    findingChanges: {
      production: diffFindings(baselineProd, prod.summary),
      development: diffFindings(baselineDev, dev.summary),
    },
    acceptance: checks,
  };
  assertNoSecrets(payload, "validation payload");
  writeFileSync(outPath, JSON.stringify(payload, null, 2));
  console.log("\nWrote sanitized comparison to", outPath);

  if (failed > 0) {
    console.error(`\n${failed} acceptance check(s) failed.`);
    process.exitCode = 1;
  } else {
    console.log("\nDevelopment collection detection: OK");
    console.log("All acceptance checks passed.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

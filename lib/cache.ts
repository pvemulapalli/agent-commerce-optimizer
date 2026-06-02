import { createHash } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { getRedis, isRedisConfigured } from "./redis";
import type {
  AuditApiResponse,
  AuditResult,
  GenerationContext,
  GroupedFindings,
} from "./types";

/**
 * Audit cache storage strategy:
 *
 * - Vercel serverless runs on a read-only filesystem at /var/task (except /tmp).
 *   Writing to process.cwd()/.cache fails in production with ENOENT/EACCES.
 * - Production should use Upstash Redis when UPSTASH_REDIS_REST_* is configured.
 * - Local file cache under process.cwd()/.cache is used only in development.
 * - If production has no Redis, cache is skipped gracefully (audit still runs).
 * - Cache read/write failures never fail the audit — errors are swallowed.
 */

const CACHE_DIR = path.join(process.cwd(), ".cache", "audits");
const REDIS_AUDIT_PREFIX = "aco:audit:";
const DEFAULT_TTL_MINUTES = 120;

export type CacheStatus = AuditApiResponse["cacheStatus"];

export interface CachedAuditPayload {
  url: string;
  crawledAt: string;
  expiresAt: string;
  result: AuditResult & { grouped: GroupedFindings };
  generationContext?: GenerationContext;
}

export interface CachedAuditReadResult extends AuditApiResponse {
  generationContext?: GenerationContext;
}

export function getCacheTtlMinutes(): number {
  const raw = process.env.AUDIT_CACHE_TTL_MINUTES;

  if (raw === undefined || raw.trim() === "") {
    return DEFAULT_TTL_MINUTES;
  }

  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed) || parsed < 0) {
    return DEFAULT_TTL_MINUTES;
  }

  return parsed;
}

function isDevelopmentEnvironment(): boolean {
  return process.env.NODE_ENV === "development";
}

function shouldUseFileCache(): boolean {
  return isDevelopmentEnvironment() && getCacheTtlMinutes() > 0;
}

function shouldUseRedisCache(): boolean {
  return !isDevelopmentEnvironment() && isRedisConfigured() && getCacheTtlMinutes() > 0;
}

export function isCacheEnabled(): boolean {
  return shouldUseFileCache() || shouldUseRedisCache();
}

export function normalizeAuditUrl(input: string): string {
  const trimmed = input.trim();
  const withProtocol =
    trimmed.startsWith("http://") || trimmed.startsWith("https://")
      ? trimmed
      : `https://${trimmed}`;

  const url = new URL(withProtocol);
  url.hash = "";

  if (url.pathname !== "/" && url.pathname.endsWith("/")) {
    url.pathname = url.pathname.slice(0, -1);
  }

  return url.href;
}

export function getCacheKey(normalizedUrl: string): string {
  const parsed = new URL(normalizedUrl);
  const hostname = parsed.hostname.toLowerCase();
  const pathHash = createHash("sha256")
    .update(`${parsed.pathname}${parsed.search}`)
    .digest("hex")
    .slice(0, 16);

  return `${hostname}__${pathHash}`;
}

function getCacheFilePath(cacheKey: string): string {
  return path.join(CACHE_DIR, `${cacheKey}.json`);
}

function getRedisAuditKey(cacheKey: string): string {
  return `${REDIS_AUDIT_PREFIX}${cacheKey}`;
}

function isCacheEntryValid(entry: CachedAuditPayload): boolean {
  return Date.parse(entry.expiresAt) > Date.now();
}

function payloadFromCacheRead(raw: unknown): CachedAuditPayload | null {
  if (!raw) {
    return null;
  }

  if (typeof raw === "string") {
    return JSON.parse(raw) as CachedAuditPayload;
  }

  return raw as CachedAuditPayload;
}

function toCachedAuditReadResult(
  entry: CachedAuditPayload,
): CachedAuditReadResult {
  return {
    ...entry.result,
    cacheStatus: "HIT",
    expiresAt: entry.expiresAt,
    generationContext: entry.generationContext,
  };
}

async function readFileCachedAudit(
  cacheKey: string,
): Promise<CachedAuditReadResult | null> {
  const filePath = getCacheFilePath(cacheKey);
  const raw = await readFile(filePath, "utf8");
  const entry = JSON.parse(raw) as CachedAuditPayload;

  if (!isCacheEntryValid(entry)) {
    return null;
  }

  return toCachedAuditReadResult(entry);
}

async function readRedisCachedAudit(
  cacheKey: string,
): Promise<CachedAuditReadResult | null> {
  const redis = getRedis();
  const raw = await redis.get(getRedisAuditKey(cacheKey));
  const entry = payloadFromCacheRead(raw);

  if (!entry || !isCacheEntryValid(entry)) {
    return null;
  }

  return toCachedAuditReadResult(entry);
}

export async function readCachedAudit(
  inputUrl: string,
): Promise<CachedAuditReadResult | null> {
  if (!isCacheEnabled()) {
    return null;
  }

  const cacheKey = getCacheKey(normalizeAuditUrl(inputUrl));

  try {
    if (shouldUseRedisCache()) {
      return await readRedisCachedAudit(cacheKey);
    }

    if (shouldUseFileCache()) {
      return await readFileCachedAudit(cacheKey);
    }
  } catch (error) {
    console.error("[audit-cache] read failed:", error);
  }

  return null;
}

async function writeFileCachedAudit(
  cacheKey: string,
  entry: CachedAuditPayload,
): Promise<string> {
  await mkdir(CACHE_DIR, { recursive: true });
  await writeFile(
    getCacheFilePath(cacheKey),
    JSON.stringify(entry, null, 2),
    "utf8",
  );

  return entry.expiresAt;
}

async function writeRedisCachedAudit(
  cacheKey: string,
  entry: CachedAuditPayload,
  ttlMinutes: number,
): Promise<string> {
  const redis = getRedis();
  const ttlSeconds = ttlMinutes * 60;

  await redis.set(getRedisAuditKey(cacheKey), JSON.stringify(entry), {
    ex: ttlSeconds,
  });

  return entry.expiresAt;
}

export async function writeCachedAudit(
  inputUrl: string,
  result: AuditResult & { grouped: GroupedFindings },
  generationContext?: GenerationContext,
): Promise<string | null> {
  const ttlMinutes = getCacheTtlMinutes();
  if (ttlMinutes <= 0 || !isCacheEnabled()) {
    return null;
  }

  const normalizedUrl = normalizeAuditUrl(inputUrl);
  const cacheKey = getCacheKey(normalizedUrl);
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString();

  const entry: CachedAuditPayload = {
    url: normalizedUrl,
    crawledAt: result.crawledAt,
    expiresAt,
    result,
    generationContext,
  };

  try {
    if (shouldUseRedisCache()) {
      return await writeRedisCachedAudit(cacheKey, entry, ttlMinutes);
    }

    if (shouldUseFileCache()) {
      return await writeFileCachedAudit(cacheKey, entry);
    }
  } catch (error) {
    console.error("[audit-cache] write failed:", error);
  }

  return null;
}

import { createHash } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import type {
  AuditApiResponse,
  AuditResult,
  GenerationContext,
  GroupedFindings,
} from "./types";

const CACHE_DIR = path.join(process.cwd(), ".cache", "audits");
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

export function isCacheEnabled(): boolean {
  return getCacheTtlMinutes() > 0;
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

function isCacheEntryValid(entry: CachedAuditPayload): boolean {
  return Date.parse(entry.expiresAt) > Date.now();
}

export async function readCachedAudit(
  inputUrl: string,
): Promise<CachedAuditReadResult | null> {
  if (!isCacheEnabled()) {
    return null;
  }

  const normalizedUrl = normalizeAuditUrl(inputUrl);
  const cacheKey = getCacheKey(normalizedUrl);
  const filePath = getCacheFilePath(cacheKey);

  try {
    const raw = await readFile(filePath, "utf8");
    const entry = JSON.parse(raw) as CachedAuditPayload;

    if (!isCacheEntryValid(entry)) {
      return null;
    }

    return {
      ...entry.result,
      cacheStatus: "HIT",
      expiresAt: entry.expiresAt,
      generationContext: entry.generationContext,
    };
  } catch {
    return null;
  }
}

export async function writeCachedAudit(
  inputUrl: string,
  result: AuditResult & { grouped: GroupedFindings },
  generationContext?: GenerationContext,
): Promise<string | null> {
  const ttlMinutes = getCacheTtlMinutes();
  if (ttlMinutes <= 0) {
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

  await mkdir(CACHE_DIR, { recursive: true });
  await writeFile(getCacheFilePath(cacheKey), JSON.stringify(entry, null, 2), "utf8");

  return expiresAt;
}

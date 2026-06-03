#!/usr/bin/env node
import { existsSync, readFileSync } from "fs";
import path from "path";
import { clearCommerceOptimizerRedisKeys } from "../lib/redis-admin";
import { isRedisConfigured } from "../lib/redis";

function loadEnvLocal(): void {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!existsSync(envPath)) {
    return;
  }

  const content = readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separator = trimmed.indexOf("=");
    if (separator === -1) {
      continue;
    }

    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim();
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

async function resetViaApi(baseUrl: string, token: string): Promise<number> {
  const response = await fetch(new URL("/api/admin/reset", baseUrl), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });

  const data = (await response.json()) as {
    status?: string;
    deletedKeys?: number;
    error?: string;
  };

  if (!response.ok) {
    throw new Error(data.error ?? `Reset request failed (${response.status})`);
  }

  return data.deletedKeys ?? 0;
}

async function main() {
  loadEnvLocal();

  const token = process.env.ADMIN_RESET_TOKEN?.trim();
  const baseUrl =
    process.env.ADMIN_RESET_BASE_URL?.trim() || "http://localhost:3000";

  if (token) {
    const deletedKeys = await resetViaApi(baseUrl, token);
    console.log(JSON.stringify({ status: "ok", deletedKeys }));
    return;
  }

  if (!isRedisConfigured()) {
    console.error(
      "Set ADMIN_RESET_TOKEN (for API reset) or UPSTASH_REDIS_REST_URL/TOKEN (for direct reset).",
    );
    process.exit(1);
  }

  const deletedKeys = await clearCommerceOptimizerRedisKeys();
  console.log(JSON.stringify({ status: "ok", deletedKeys }));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

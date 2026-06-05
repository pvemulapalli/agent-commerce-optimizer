#!/usr/bin/env npx tsx
import { readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const releasesPath = path.join(root, "content/releases.json");
const changelogPath = path.join(root, "CHANGELOG.md");

type ReleaseCategory = "UX" | "API" | "Admin" | "Scoring" | "Fixes";

interface ReleaseEntry {
  version: string;
  date: string;
  title: string;
  summary: string;
  categories: ReleaseCategory[];
  changes: string[];
}

interface ReleasesDocument {
  releases: ReleaseEntry[];
}

const VALID_CATEGORIES = new Set<ReleaseCategory>([
  "UX",
  "API",
  "Admin",
  "Scoring",
  "Fixes",
]);

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function parseCategories(input: string): ReleaseCategory[] {
  const values = input
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean) as ReleaseCategory[];

  for (const value of values) {
    if (!VALID_CATEGORIES.has(value)) {
      throw new Error(`Invalid category "${value}". Use: ${[...VALID_CATEGORIES].join(", ")}`);
    }
  }

  return values.length > 0 ? values : ["UX"];
}

function prependChangelog(entry: ReleaseEntry): void {
  const existing = readFileSync(changelogPath, "utf8");
  const block = `## [${entry.version}] - ${entry.date}

### Changed
${entry.changes.map((change) => `- ${change}`).join("\n")}

`;
  const marker = "## [";
  const insertAt = existing.indexOf(marker);
  const next =
    insertAt === -1
      ? `${existing.trimEnd()}\n\n${block}`
      : `${existing.slice(0, insertAt)}${block}${existing.slice(insertAt)}`;

  writeFileSync(changelogPath, next);
}

async function main() {
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  try {
    const version = (await rl.question("Version (e.g. 3.2.7): ")).trim();
    const title = (await rl.question("Title: ")).trim();
    const summary = (await rl.question("Summary: ")).trim();
    const dateInput = (await rl.question(`Date [${todayIsoDate()}]: `)).trim();
    const categoriesInput = (await rl.question("Categories (comma-separated, default UX): ")).trim();
    const changesInput = await rl.question(
      "Changes (one per line, blank line to finish):\n",
    );

    if (!version || !title || !summary) {
      throw new Error("Version, title, and summary are required.");
    }

    const changes = changesInput
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (changes.length === 0) {
      throw new Error("At least one change line is required.");
    }

    const entry: ReleaseEntry = {
      version,
      date: dateInput || todayIsoDate(),
      title,
      summary,
      categories: parseCategories(categoriesInput),
      changes,
    };

    const document = JSON.parse(readFileSync(releasesPath, "utf8")) as ReleasesDocument;
    const withoutDuplicate = document.releases.filter((release) => release.version !== version);
    document.releases = [entry, ...withoutDuplicate];
    writeFileSync(releasesPath, `${JSON.stringify(document, null, 2)}\n`);

    prependChangelog(entry);

    console.log(`\nAdded release ${version} to content/releases.json and CHANGELOG.md`);
    console.log("Remember to bump lib/app-version.ts and run npm run build.");
  } finally {
    rl.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

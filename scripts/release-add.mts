#!/usr/bin/env npx tsx
import { readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  getReleaseDateFromGit,
  readWorkingTreeVersion,
} from "./lib/release-dates";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const releasesPath = path.join(root, "content/releases.json");
const changelogPath = path.join(root, "CHANGELOG.md");
const appVersionPath = path.join(root, "lib/app-version.ts");

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

const docsOnly = process.argv.includes("--docs-only");

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

function bumpAppVersion(version: string): void {
  const content = `/** Bump when shipping a new version of the optimizer. */
export const APP_VERSION = "${version}";

export const APP_VERSION_LABEL = \`Version \${APP_VERSION}\`;
`;
  writeFileSync(appVersionPath, content);
}

function prependChangelog(entry: ReleaseEntry): void {
  const existing = readFileSync(changelogPath, "utf8");

  const sections = {
    Added: [] as string[],
    Changed: [] as string[],
    Fixed: [] as string[],
  };

  for (const change of entry.changes) {
    const added = change.match(/^\[(Added)\]\s*(.+)$/i);
    const fixed = change.match(/^\[(Fixed)\]\s*(.+)$/i);
    const changed = change.match(/^\[(Changed)\]\s*(.+)$/i);

    if (added) {
      sections.Added.push(added[2]);
    } else if (fixed) {
      sections.Fixed.push(fixed[2]);
    } else if (changed) {
      sections.Changed.push(changed[2]);
    } else {
      sections.Changed.push(change);
    }
  }

  const sectionBlocks = (["Added", "Changed", "Fixed"] as const)
    .filter((key) => sections[key].length > 0)
    .map(
      (key) =>
        `### ${key}\n${sections[key].map((change) => `- ${change}`).join("\n")}\n`,
    )
    .join("\n");

  const block = `## [${entry.version}] - ${entry.date}

${sectionBlocks}
`;
  const marker = "## [";
  const insertAt = existing.indexOf(marker);
  const next =
    insertAt === -1
      ? `${existing.trimEnd()}\n\n${block}`
      : `${existing.slice(0, insertAt)}${block}${existing.slice(insertAt)}`;

  writeFileSync(changelogPath, next);
}

function resolveReleaseDate(version: string, dateInput: string): string {
  const gitDate = getReleaseDateFromGit(version, root);
  const resolved = dateInput || gitDate;

  if (!resolved) {
    if (docsOnly) {
      throw new Error(
        `No git commit found for version ${version} in lib/app-version.ts. Commit the version bump first, then run release:add --docs-only.`,
      );
    }

    throw new Error(
      "No release date available from git. Commit lib/app-version.ts with the new version, then run release:add --docs-only, or enter a date explicitly.",
    );
  }

  return resolved;
}

async function main() {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const workingVersion = readWorkingTreeVersion(root);

  try {
    if (docsOnly) {
      console.log(
        "Docs-only mode: updates CHANGELOG.md and content/releases.json only (no lib/app-version.ts bump).",
      );
      if (workingVersion) {
        console.log(`Current lib/app-version.ts: ${workingVersion}`);
      }
    } else {
      console.log(
        "Standard mode: bumps lib/app-version.ts and adds release notes. Commit code + version + notes together in one commit.",
      );
    }

    const defaultVersion = docsOnly && workingVersion ? workingVersion : "";
    const version = (
      await rl.question(
        defaultVersion
          ? `Version [${defaultVersion}]: `
          : "Version (e.g. 3.3.0): ",
      )
    ).trim() || defaultVersion;

    const title = (await rl.question("Title: ")).trim();
    const summary = (await rl.question("Summary: ")).trim();
    const gitDate = version ? getReleaseDateFromGit(version, root) : null;
    const datePrompt = gitDate
      ? `Date [${gitDate} from git]: `
      : "Date (leave blank to use git after version commit): ";
    const dateInput = (await rl.question(datePrompt)).trim();
    const categoriesInput = (await rl.question("Categories (comma-separated, default UX): ")).trim();
    const changesInput = await rl.question(
      "Changes (one per line; prefix with [Added], [Changed], or [Fixed] — blank line to finish):\n",
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

    if (docsOnly) {
      if (workingVersion && workingVersion !== version) {
        console.warn(
          `Warning: lib/app-version.ts is ${workingVersion} but release entry is ${version}.`,
        );
      }
    } else {
      bumpAppVersion(version);
    }

    const resolvedDate = resolveReleaseDate(version, dateInput);

    const entry: ReleaseEntry = {
      version,
      date: resolvedDate,
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

    console.log(`\nAdded release ${version} to content/releases.json and CHANGELOG.md (date: ${resolvedDate}).`);
    console.log("Release Notes page reads content/releases.json automatically — no manual page edits needed.");

    if (docsOnly) {
      console.log(
        "Next: git add CHANGELOG.md content/releases.json && git commit --amend --no-edit",
      );
      console.log(
        "  (amend folds notes into the existing version commit if not pushed yet)",
      );
    } else {
      console.log(`Bumped lib/app-version.ts to ${version}.`);
      console.log(
        "Next: git add -A && git commit -m \"Version X.Y.Z - …\"  (one commit for code + version + notes)",
      );
    }

    console.log("Optional: npm run release:sync-dates  (verify dates match git)");
    console.log("Then: npm run build");
  } finally {
    rl.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

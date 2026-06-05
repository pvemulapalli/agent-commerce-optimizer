#!/usr/bin/env npx tsx
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  buildVersionDateMap,
  readWorkingTreeVersion,
  syncChangelogDates,
  syncReleasesJsonDates,
} from "./lib/release-dates";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const releasesPath = path.join(root, "content/releases.json");
const changelogPath = path.join(root, "CHANGELOG.md");

interface ReleasesDocument {
  releases: Array<{ version: string; date: string }>;
}

function main() {
  const versionDates = buildVersionDateMap(root);
  const workingVersion = readWorkingTreeVersion(root);

  if (workingVersion && !versionDates.has(workingVersion)) {
    console.warn(
      `Warning: ${workingVersion} is in lib/app-version.ts but has no git commit yet — date will not be synced until you commit and re-run npm run release:sync-dates.`,
    );
  }

  const changelog = readFileSync(changelogPath, "utf8");
  const changelogResult = syncChangelogDates(changelog, versionDates);
  writeFileSync(changelogPath, changelogResult.content);

  const document = JSON.parse(readFileSync(releasesPath, "utf8")) as ReleasesDocument;
  const releasesResult = syncReleasesJsonDates(document.releases, versionDates);
  writeFileSync(releasesPath, `${JSON.stringify(document, null, 2)}\n`);

  const allUpdated = [...changelogResult.updated, ...releasesResult.updated];
  const allMissing = [
    ...new Set([...changelogResult.missing, ...releasesResult.missing]),
  ].filter((version) => versionDates.has(version) === false);

  if (allUpdated.length === 0) {
    console.log("Release dates already match git history.");
  } else {
    console.log("Updated release dates from git:");
    for (const line of allUpdated) {
      console.log(`  ${line}`);
    }
  }

  if (allMissing.length > 0) {
    console.warn(
      "No git commit found in lib/app-version.ts for:",
      allMissing.join(", "),
    );
  }
}

main();

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

const APP_VERSION_FILE = "lib/app-version.ts";
const VERSION_PATTERN = /APP_VERSION\s*=\s*"([^"]+)"/;

/** Map each APP_VERSION value to the commit date that introduced it in lib/app-version.ts. */
export function buildVersionDateMap(repoRoot: string): Map<string, string> {
  const map = new Map<string, string>();

  let commits: string[];
  try {
    commits = execSync(`git log --format=%H --follow -- ${APP_VERSION_FILE}`, {
      cwd: repoRoot,
      encoding: "utf8",
    })
      .trim()
      .split("\n")
      .filter(Boolean);
  } catch {
    return map;
  }

  for (const hash of commits) {
    let content: string;
    try {
      content = execSync(`git show ${hash}:${APP_VERSION_FILE}`, {
        cwd: repoRoot,
        encoding: "utf8",
      });
    } catch {
      continue;
    }

    const version = content.match(VERSION_PATTERN)?.[1];
    if (!version || map.has(version)) {
      continue;
    }

    const date = execSync(`git log -1 --format=%ad --date=short ${hash}`, {
      cwd: repoRoot,
      encoding: "utf8",
    }).trim();

    map.set(version, date);
  }

  return map;
}

/** Session-clock date incorrectly used for post-3.2.7 releases — never reuse as default. */
export const FABRICATED_SESSION_DATE = "2026-05-30";

function resolveGitDate(version: string, versionDates: Map<string, string>): string | null {
  const direct = versionDates.get(version);
  if (direct) {
    return direct;
  }

  const parts = version.split(".");
  if (parts.length === 3 && parts[2] === "0") {
    const shortMinor = `${parts[0]}.${parts[1]}`;
    const shortMinorDate = versionDates.get(shortMinor);
    if (shortMinorDate) {
      return shortMinorDate;
    }
  }

  return null;
}

export function getReleaseDateFromGit(version: string, repoRoot: string): string | null {
  return resolveGitDate(version, buildVersionDateMap(repoRoot));
}

export function readWorkingTreeVersion(repoRoot: string): string | null {
  try {
    const content = readFileSync(path.join(repoRoot, APP_VERSION_FILE), "utf8");
    return content.match(VERSION_PATTERN)?.[1] ?? null;
  } catch {
    return null;
  }
}

export function syncChangelogDates(
  changelog: string,
  versionDates: Map<string, string>,
): { content: string; updated: string[]; missing: string[] } {
  const updated: string[] = [];
  const missing: string[] = [];

  const content = changelog.replace(
    /^## \[([^\]]+)\] - (\d{4}-\d{2}-\d{2})/gm,
    (line, version: string, currentDate: string) => {
      const gitDate = resolveGitDate(version, versionDates);
      if (!gitDate) {
        missing.push(version);
        return line;
      }

      if (gitDate !== currentDate) {
        updated.push(`${version}: ${currentDate} → ${gitDate}`);
        return `## [${version}] - ${gitDate}`;
      }

      return line;
    },
  );

  return { content, updated, missing };
}

export function syncReleasesJsonDates(
  releases: Array<{ version: string; date: string }>,
  versionDates: Map<string, string>,
): { updated: string[]; missing: string[] } {
  const updated: string[] = [];
  const missing: string[] = [];

  for (const release of releases) {
    const gitDate = resolveGitDate(release.version, versionDates);
    if (!gitDate) {
      if (
        release.date === FABRICATED_SESSION_DATE &&
        compareSemver(release.version, "3.2.7") > 0
      ) {
        missing.push(
          `${release.version} (had fabricated ${FABRICATED_SESSION_DATE} — commit lib/app-version.ts and re-run sync)`,
        );
      } else {
        missing.push(release.version);
      }
      continue;
    }

    if (release.date !== gitDate) {
      updated.push(`${release.version}: ${release.date} → ${gitDate}`);
      release.date = gitDate;
    }
  }

  return { updated, missing };
}

function compareSemver(left: string, right: string): number {
  const leftParts = left.split(".").map((part) => Number.parseInt(part, 10));
  const rightParts = right.split(".").map((part) => Number.parseInt(part, 10));
  const length = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < length; index += 1) {
    const delta = (leftParts[index] ?? 0) - (rightParts[index] ?? 0);
    if (delta !== 0) {
      return delta;
    }
  }

  return 0;
}

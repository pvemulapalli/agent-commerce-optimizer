import releasesDocument from "@/content/releases.json";

export type ReleaseCategory =
  | "Platform Detection"
  | "UX"
  | "Optimization"
  | "Admin"
  | "Data Quality"
  | "Infrastructure"
  | "API"
  | "Scoring"
  | "Fixes"
  | "Analytics"
  | "Scan Reliability"
  | "Product Feedback";

export interface ReleaseEntry {
  version: string;
  date: string;
  title: string;
  summary: string;
  categories: ReleaseCategory[];
  changes: string[];
  historical?: boolean;
}

export interface ReleaseMajorGroup {
  majorVersion: string;
  releases: ReleaseEntry[];
}

export interface ReleaseFamilyGroup {
  versionFamily: string;
  releases: ReleaseEntry[];
}

export function getReleases(): ReleaseEntry[] {
  return releasesDocument.releases as ReleaseEntry[];
}

export function getReleaseByVersion(version: string): ReleaseEntry | undefined {
  return getReleases().find((release) => release.version === version);
}

export function getVersionFamily(version: string): string {
  const parts = version.split(".");
  if (parts.length >= 2) {
    return `${parts[0]}.${parts[1]}`;
  }

  return parts[0] ?? version;
}

function compareVersionFamilies(left: string, right: string): number {
  const [leftMajor = 0, leftMinor = 0] = left.split(".").map((part) => Number.parseInt(part, 10));
  const [rightMajor = 0, rightMinor = 0] = right.split(".").map((part) => Number.parseInt(part, 10));

  if (leftMajor !== rightMajor) {
    return rightMajor - leftMajor;
  }

  return rightMinor - leftMinor;
}

export function groupReleasesByMajorVersion(releases: ReleaseEntry[]): ReleaseMajorGroup[] {
  const groups = new Map<string, ReleaseEntry[]>();

  for (const release of releases) {
    const major = release.version.split(".")[0] ?? release.version;
    const bucket = groups.get(major) ?? [];
    bucket.push(release);
    groups.set(major, bucket);
  }

  return [...groups.entries()]
    .sort((left, right) => Number.parseInt(right[0], 10) - Number.parseInt(left[0], 10))
    .map(([majorVersion, bucket]) => ({
      majorVersion,
      releases: bucket,
    }));
}

export function groupReleasesByVersionFamily(releases: ReleaseEntry[]): ReleaseFamilyGroup[] {
  const groups = new Map<string, ReleaseEntry[]>();

  for (const release of releases) {
    const family = getVersionFamily(release.version);
    const bucket = groups.get(family) ?? [];
    bucket.push(release);
    groups.set(family, bucket);
  }

  return [...groups.entries()]
    .sort((left, right) => compareVersionFamilies(left[0], right[0]))
    .map(([versionFamily, bucket]) => ({
      versionFamily,
      releases: bucket,
    }));
}

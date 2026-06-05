import releasesDocument from "@/content/releases.json";

export type ReleaseCategory =
  | "UX"
  | "API"
  | "Admin"
  | "Scoring"
  | "Fixes";

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

export function getReleases(): ReleaseEntry[] {
  return releasesDocument.releases as ReleaseEntry[];
}

export function getReleaseByVersion(version: string): ReleaseEntry | undefined {
  return getReleases().find((release) => release.version === version);
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

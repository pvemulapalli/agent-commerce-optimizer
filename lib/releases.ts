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
}

export function getReleases(): ReleaseEntry[] {
  return releasesDocument.releases as ReleaseEntry[];
}

export function getReleaseByVersion(version: string): ReleaseEntry | undefined {
  return getReleases().find((release) => release.version === version);
}

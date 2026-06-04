import { getRedis, isRedisConfigured } from "./redis";

const REDIS_CONTRIBUTORS_KEY = "aco:admin:contributors";

export interface ContributorEntry {
  name: string;
  linkedinUrl: string;
}

export interface ContributorsContent {
  intro: string;
  contributors: ContributorEntry[];
}

export const DEFAULT_CONTRIBUTORS_INTRO =
  "The following individuals provided feedback, testing, and ideas that helped improve the project.";

export const DEFAULT_CONTRIBUTORS: ContributorsContent = {
  intro: DEFAULT_CONTRIBUTORS_INTRO,
  contributors: [],
};

let memoryContributors: ContributorsContent = DEFAULT_CONTRIBUTORS;

function normalizeContributor(entry: unknown): ContributorEntry | null {
  if (!entry || typeof entry !== "object") {
    return null;
  }

  const record = entry as Record<string, unknown>;
  const name = typeof record.name === "string" ? record.name.trim() : "";
  const linkedinUrl =
    typeof record.linkedinUrl === "string" ? record.linkedinUrl.trim() : "";

  if (!name) {
    return null;
  }

  return { name, linkedinUrl };
}

function parseContributorsContent(raw: unknown): ContributorsContent | null {
  if (!raw) {
    return null;
  }

  let parsed: unknown = raw;

  if (typeof raw === "string") {
    parsed = JSON.parse(raw) as unknown;
  }

  if (!parsed || typeof parsed !== "object") {
    return null;
  }

  const record = parsed as Record<string, unknown>;
  const intro =
    typeof record.intro === "string" && record.intro.trim()
      ? record.intro.trim()
      : DEFAULT_CONTRIBUTORS_INTRO;

  const contributors = Array.isArray(record.contributors)
    ? record.contributors
        .map(normalizeContributor)
        .filter((entry): entry is ContributorEntry => Boolean(entry))
    : [];

  return { intro, contributors };
}

export async function getContributorsContent(): Promise<ContributorsContent> {
  if (isRedisConfigured()) {
    try {
      const redis = getRedis();
      const raw = await redis.get(REDIS_CONTRIBUTORS_KEY);
      const parsed = parseContributorsContent(raw);

      if (parsed) {
        return parsed;
      }
    } catch (error) {
      console.error("[contributors] read failed:", error);
    }
  }

  return memoryContributors;
}

export async function saveContributorsContent(
  content: ContributorsContent,
): Promise<ContributorsContent> {
  const normalized: ContributorsContent = {
    intro: content.intro.trim() || DEFAULT_CONTRIBUTORS_INTRO,
    contributors: content.contributors
      .map(normalizeContributor)
      .filter((entry): entry is ContributorEntry => Boolean(entry)),
  };

  if (!isRedisConfigured()) {
    memoryContributors = normalized;
    return normalized;
  }

  const redis = getRedis();
  await redis.set(REDIS_CONTRIBUTORS_KEY, JSON.stringify(normalized));

  return normalized;
}

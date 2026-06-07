import dns from "node:dns/promises";
import type { CommercePlatform } from "./types";

const HOSTING_LOOKUP_TIMEOUT_MS = 4_000;
const RDAP_TIMEOUT_MS = 3_000;

export interface HostingProfile {
  hostname: string;
  ipv4: string[];
  ipv6: string[];
  cnames: string[];
  reverseDns: string[];
  /** ASN organization from RDAP when available. */
  asnOrganization: string | null;
  /** ASN number string when available (e.g. AS13335). */
  asn: string | null;
  genericCdn: string[];
}

export interface PlatformHostingHint {
  platform: CommercePlatform;
  label: string;
}

const GENERIC_CDN_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /cloudflare/i, label: "Cloudflare" },
  { pattern: /akamai/i, label: "Akamai" },
  { pattern: /fastly/i, label: "Fastly" },
  { pattern: /incapsula|imperva/i, label: "Imperva" },
  { pattern: /edgecast/i, label: "Edgecast" },
  { pattern: /stackpath/i, label: "StackPath" },
];

const PLATFORM_HOSTING_PATTERNS: Array<{
  platform: CommercePlatform;
  pattern: RegExp;
  label: string;
}> = [
  {
    platform: "Shopify",
    pattern: /myshopify\.com|shops\.shopify|shopify\.com/i,
    label: "Shopify hosting DNS (CNAME or reverse DNS)",
  },
  {
    platform: "VTEX",
    pattern: /vtexcommercestable|vteximg|vtexcdn|\.vtex\.|vtex\.com/i,
    label: "VTEX hosting DNS (CNAME or reverse DNS)",
  },
  {
    platform: "Fenicio",
    pattern: /fenicio\.app|fenicio\.io|f\.fcdn\.app|fnstatic\.com/i,
    label: "Fenicio hosting DNS (CNAME or reverse DNS)",
  },
  {
    platform: "Salesforce Commerce Cloud",
    pattern: /demandware\.net|commercecloud/i,
    label: "Salesforce Commerce Cloud hosting DNS",
  },
  {
    platform: "BigCommerce",
    pattern: /mybigcommerce\.com|bigcommerce\.com/i,
    label: "BigCommerce hosting DNS",
  },
  {
    platform: "Wix",
    pattern: /wixdns\.net|wix\.com/i,
    label: "Wix hosting DNS",
  },
  {
    platform: "Squarespace",
    pattern: /squarespace\.com|sqsp\.net/i,
    label: "Squarespace hosting DNS",
  },
  {
    platform: "Magento",
    pattern: /magentositecloud|magento\.cloud|adobecommerce/i,
    label: "Adobe Commerce cloud hosting DNS",
  },
];

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
  ]);
}

async function resolveReverseDns(ips: string[]): Promise<string[]> {
  const hostnames = new Set<string>();

  await Promise.all(
    ips.slice(0, 4).map(async (ip) => {
      try {
        const names = await withTimeout(dns.reverse(ip), HOSTING_LOOKUP_TIMEOUT_MS);
        names?.forEach((name) => hostnames.add(name.toLowerCase()));
      } catch {
        // Reverse DNS is often unavailable; ignore.
      }
    }),
  );

  return [...hostnames];
}

async function lookupRdap(ip: string): Promise<{ asn: string | null; org: string | null }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), RDAP_TIMEOUT_MS);
    const response = await fetch(`https://rdap.org/ip/${encodeURIComponent(ip)}`, {
      signal: controller.signal,
      headers: { Accept: "application/rdap+json" },
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return { asn: null, org: null };
    }

    const payload = (await response.json()) as {
      name?: string;
      entities?: Array<{
        roles?: string[];
        vcardArray?: unknown;
      }>;
    };

    let asn: string | null = null;
    let org: string | null = payload.name ?? null;

    for (const entity of payload.entities ?? []) {
      if (!entity.roles?.includes("registrant") && !entity.roles?.includes("technical")) {
        continue;
      }

      const vcard = entity.vcardArray;
      if (!Array.isArray(vcard) || !Array.isArray(vcard[1])) continue;

      for (const entry of vcard[1]) {
        if (
          Array.isArray(entry) &&
          entry[0] === "fn" &&
          typeof entry[1] === "string" &&
          !org
        ) {
          org = entry[1];
        }
      }
    }

    const asnMatch = org?.match(/\b(AS\d+)\b/i);
    if (asnMatch) {
      asn = asnMatch[1].toUpperCase();
    }

    return { asn, org };
  } catch {
    return { asn: null, org: null };
  }
}

export async function resolveHostingProfile(hostname: string): Promise<HostingProfile> {
  const normalizedHost = hostname.toLowerCase().replace(/^www\./, "");

  const [ipv4Result, ipv6Result, cnameResult] = await Promise.allSettled([
    dns.resolve4(normalizedHost),
    dns.resolve6(normalizedHost),
    dns.resolveCname(normalizedHost),
  ]);

  const ipv4 = ipv4Result.status === "fulfilled" ? ipv4Result.value : [];
  const ipv6 = ipv6Result.status === "fulfilled" ? ipv6Result.value : [];
  const cnames =
    cnameResult.status === "fulfilled"
      ? (Array.isArray(cnameResult.value) ? cnameResult.value : [cnameResult.value]).map(
          (value) => value.toLowerCase(),
        )
      : [];

  if (ipv4.length === 0 && ipv6.length === 0) {
    try {
      const lookedUp = await dns.lookup(normalizedHost, { all: true });
      for (const entry of lookedUp) {
        if (entry.family === 4) ipv4.push(entry.address);
        if (entry.family === 6) ipv6.push(entry.address);
      }
    } catch {
      // Leave empty; platform detection falls back to storefront signals.
    }
  }

  const reverseDns = await resolveReverseDns([...ipv4, ...ipv6]);
  const rdap = ipv4[0] ? await lookupRdap(ipv4[0]) : { asn: null, org: null };

  const haystack = [...cnames, ...reverseDns, rdap.org ?? ""].join(" ").toLowerCase();
  const genericCdn = GENERIC_CDN_PATTERNS.filter(({ pattern }) => pattern.test(haystack)).map(
    ({ label }) => label,
  );

  return {
    hostname: normalizedHost,
    ipv4,
    ipv6,
    cnames,
    reverseDns,
    asnOrganization: rdap.org,
    asn: rdap.asn,
    genericCdn,
  };
}

export function inferPlatformHostingHints(profile: HostingProfile): PlatformHostingHint[] {
  const haystack = [
    ...profile.cnames,
    ...profile.reverseDns,
    profile.asnOrganization ?? "",
  ]
    .join(" ")
    .toLowerCase();

  if (!haystack.trim()) {
    return [];
  }

  const platformSpecific = PLATFORM_HOSTING_PATTERNS.filter(({ pattern }) =>
    pattern.test(haystack),
  );

  if (platformSpecific.length > 0) {
    return platformSpecific.map(({ platform, label }) => ({ platform, label }));
  }

  // Generic CDN only — do not infer a commerce platform from IP/hosting alone.
  if (profile.genericCdn.length > 0) {
    return [];
  }

  return [];
}

export function formatHostingEvidence(profile: HostingProfile): string[] {
  const lines: string[] = [];

  if (profile.ipv4.length > 0) {
    lines.push(`IPv4: ${profile.ipv4.slice(0, 3).join(", ")}`);
  }

  if (profile.cnames.length > 0) {
    lines.push(`CNAME: ${profile.cnames.join(", ")}`);
  }

  if (profile.reverseDns.length > 0) {
    lines.push(`Reverse DNS: ${profile.reverseDns.slice(0, 3).join(", ")}`);
  }

  if (profile.asnOrganization) {
    lines.push(`Hosting ASN/org: ${profile.asnOrganization}`);
  }

  if (profile.genericCdn.length > 0) {
    lines.push(`Generic CDN detected: ${profile.genericCdn.join(", ")} (not used for platform assignment)`);
  }

  return lines;
}

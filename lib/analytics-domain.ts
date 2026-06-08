import { normalizeAuditUrl } from "@/lib/audit-url";
import { getRegistrableDomain } from "@/lib/domains";

export function analyticsDomainFromUrl(url: string): string {
  try {
    const hostname = new URL(normalizeAuditUrl(url)).hostname.toLowerCase();
    return getRegistrableDomain(hostname);
  } catch {
    return url.trim().toLowerCase();
  }
}

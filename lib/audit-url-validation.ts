import { normalizeAuditUrl } from "./audit-url";

export const INVALID_AUDIT_URL_MESSAGE =
  "Enter a valid website URL or domain";

function isValidDnsLabel(label: string): boolean {
  if (!label || label.length > 63) {
    return false;
  }

  if (label.length === 1) {
    return /^[a-z0-9]$/i.test(label);
  }

  return /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/i.test(label);
}

/** Validates hostname structure before DNS or HTTP reachability checks. */
export function isValidAuditHostname(hostname: string): boolean {
  if (!hostname || hostname.length > 253) {
    return false;
  }

  if (hostname.startsWith(".") || hostname.endsWith(".")) {
    return false;
  }

  if (hostname === "localhost") {
    return true;
  }

  if (!hostname.includes(".")) {
    return false;
  }

  if (!/^[a-z0-9.-]+$/i.test(hostname)) {
    return false;
  }

  const labels = hostname.split(".");
  if (labels.some((label) => !isValidDnsLabel(label))) {
    return false;
  }

  const tld = labels.at(-1);
  if (!tld || !/^[a-z]{2,63}$/i.test(tld)) {
    return false;
  }

  return true;
}

export function getAuditUrlValidationError(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) {
    return INVALID_AUDIT_URL_MESSAGE;
  }

  try {
    const withProtocol =
      trimmed.startsWith("http://") || trimmed.startsWith("https://")
        ? trimmed
        : `https://${trimmed}`;
    const normalized = normalizeAuditUrl(withProtocol);
    const parsed = new URL(normalized);

    if (!["http:", "https:"].includes(parsed.protocol)) {
      return INVALID_AUDIT_URL_MESSAGE;
    }

    if (!isValidAuditHostname(parsed.hostname)) {
      return INVALID_AUDIT_URL_MESSAGE;
    }

    return null;
  } catch {
    return INVALID_AUDIT_URL_MESSAGE;
  }
}

export function isValidAuditUrlInput(input: string): boolean {
  return getAuditUrlValidationError(input) === null;
}

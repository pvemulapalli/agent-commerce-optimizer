export const BANNED_DOMAIN_TITLE = "Scanning Restricted";

export const BANNED_DOMAIN_MESSAGE =
  "This domain has been intentionally excluded from scanning.";

export const BANNED_DOMAIN_CODE = "SCANNING_RESTRICTED";

export function isBannedDomainError(error: string | null | undefined): boolean {
  if (!error) {
    return false;
  }

  return (
    error === BANNED_DOMAIN_MESSAGE ||
    error.includes("not supported for scanning") ||
    error.includes("intentionally excluded")
  );
}

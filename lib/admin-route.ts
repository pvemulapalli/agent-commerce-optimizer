/** Default obscure path for the maintenance UI (not linked from the public site). */
export const DEFAULT_ADMIN_PAGE_PATH = "ops-ms-7k2p9x";

/** Public URL segment for the maintenance page. Override with ADMIN_ROUTE_PATH. */
export function resolveAdminPagePath(): string {
  const configured = process.env.ADMIN_ROUTE_PATH?.trim();
  if (!configured) {
    return DEFAULT_ADMIN_PAGE_PATH;
  }

  return configured.replace(/^\/+|\/+$/g, "");
}

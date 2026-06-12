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

/** Client-safe admin path for links in browser UI. Prefer passing routePath from the server. */
export function resolveAdminPagePathClient(): string {
  return resolveAdminPagePath();
}

export function adminPageHref(suffix = "", routePath?: string): string {
  const configured = (routePath ?? resolveAdminPagePath()).replace(/^\/+|\/+$/g, "");
  const base = `/${configured}`;
  if (!suffix) {
    return base;
  }

  return `${base}${suffix.startsWith("/") ? suffix : `/${suffix}`}`;
}

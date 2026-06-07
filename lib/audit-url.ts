/** Client-safe audit URL normalization (no Node.js filesystem imports). */
export function normalizeAuditUrl(input: string): string {
  const trimmed = input.trim();
  const withProtocol =
    trimmed.startsWith("http://") || trimmed.startsWith("https://")
      ? trimmed
      : `https://${trimmed}`;

  const url = new URL(withProtocol);
  url.hash = "";
  url.hostname = url.hostname.toLowerCase().replace(/^www\./, "");

  if (url.pathname !== "/" && url.pathname.endsWith("/")) {
    url.pathname = url.pathname.slice(0, -1);
  }

  return url.href;
}

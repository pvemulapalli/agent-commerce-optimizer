export function buildShareReportPath(reportId: string): string {
  return `/report/${reportId}`;
}

export function buildShareReportUrl(
  reportId: string,
  origin?: string,
): string {
  const base = origin ?? (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}${buildShareReportPath(reportId)}`;
}

export function buildShareReportUrl(reportId: string, origin?: string): string {
  const base = origin ?? (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}/report/${reportId}`;
}

import { headers } from "next/headers";

/** Resolve the public origin for the running deployment (Vercel, custom domain, or local dev). */
export async function getAppOrigin(): Promise<string> {
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");

  if (host) {
    const proto =
      headerList.get("x-forwarded-proto") ??
      (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
    return `${proto}://${host.split(",")[0]?.trim()}`;
  }

  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) {
    return `https://${vercelUrl}`;
  }

  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim() || process.env.APP_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }

  return "http://localhost:3000";
}

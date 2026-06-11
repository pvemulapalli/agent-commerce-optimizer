import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { resolveAdminPagePath } from "@/lib/admin-route";

function acceptsMarkdown(request: NextRequest): boolean {
  const accept = request.headers.get("accept") ?? "";
  return accept.includes("text/markdown");
}

function handleAdminRouting(request: NextRequest): NextResponse | null {
  const adminPath = resolveAdminPagePath();
  const pathname = request.nextUrl.pathname;

  if (pathname === `/${adminPath}`) {
    return NextResponse.rewrite(new URL("/admin", request.url));
  }

  if (pathname === "/admin" && adminPath !== "admin") {
    return new NextResponse(null, { status: 404 });
  }

  return null;
}

export function middleware(request: NextRequest) {
  const adminResponse = handleAdminRouting(request);
  if (adminResponse) {
    return adminResponse;
  }

  if (!acceptsMarkdown(request)) {
    return NextResponse.next();
  }

  const path = request.nextUrl.pathname;

  if (path === "/") {
    return NextResponse.rewrite(new URL("/api/markdown/home", request.url));
  }

  if (path === "/about") {
    return NextResponse.rewrite(new URL("/api/markdown/about", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/about",
    "/admin",
    "/ops-ms-7k2p9x",
    "/((?!api|_next/static|_next/image|.*\\..*).*)",
  ],
};

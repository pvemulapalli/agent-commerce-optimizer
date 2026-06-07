import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

function acceptsMarkdown(request: NextRequest): boolean {
  const accept = request.headers.get("accept") ?? "";
  return accept.includes("text/markdown");
}

export function middleware(request: NextRequest) {
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
  matcher: ["/", "/about"],
};

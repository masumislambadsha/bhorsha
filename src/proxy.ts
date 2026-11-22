import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic redirect only. Real authorization happens in each role layout
 * and again in every API route.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const area = /^\/(customer|staff|admin)(\/|$)/.exec(pathname)?.[1];
  if (!area) return NextResponse.next();

  if (!getSessionCookie(request)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(`${pathname}${search}`)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/customer/:path*", "/staff/:path*", "/admin/:path*"],
};

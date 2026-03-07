import { NextRequest, NextResponse } from "next/server";

// Routes under /(dashboard) require a valid Firebase session cookie
const PROTECTED_PREFIX = "/dashboard";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only guard dashboard routes
  if (!pathname.startsWith(PROTECTED_PREFIX)) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get("__session")?.value;

  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Token verification happens in the API layer (Admin SDK can't run at the edge).
  // Here we just gate on cookie presence; API routes do full Admin SDK verification.
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};

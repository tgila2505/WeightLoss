import { NextRequest, NextResponse } from 'next/server';

/**
 * Route protection middleware.
 *
 * Strategy: on login/logout, auth.ts syncs a lightweight `has_session=1`
 * cookie alongside the JWT in localStorage. This middleware reads that cookie
 * (accessible in the Edge runtime) and redirects unauthenticated requests to
 * /funnel before the app shell is ever rendered — eliminating the flash of
 * authenticated UI that occurred with client-side-only useEffect redirects.
 *
 * The cookie is a routing hint only; real auth is enforced by the backend JWT
 * check on every API call.
 */

// Paths that do NOT require authentication.
const PUBLIC_PREFIXES = [
  '/_next',
  '/favicon.ico',
  '/robots.txt',
  '/sitemap.xml',
  '/api/',           // Next.js API routes (meal-plan, og, etc.)
  '/login',
  '/register',
  '/funnel',
  '/onboarding',
  '/wizard',
  '/plan/',          // pSEO public plan pages
  '/blog/',          // public blog
  '/results/',       // public UGC result pages
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Root path and all public prefixes pass through unconditionally.
  if (pathname === '/' || PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // For all other paths, require the session cookie.
  const hasSession = request.cookies.get('has_session')?.value === '1';
  if (!hasSession) {
    const loginUrl = new URL('/funnel', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Run on all routes except Next.js static asset internals and image optimization.
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

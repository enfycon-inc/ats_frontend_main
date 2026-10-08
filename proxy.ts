import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "./auth";

const publicRoutes = [
  "/auth/login",
  "/auth/register",
  "/auth/forgot-password",
  "/auth/create-password",
];

const PASSTHROUGH_SUBDOMAINS = ['api', 'auth', 'db', 'www'];
const PLATFORM_SUBDOMAINS    = ['admin'];
const MAIN_DOMAIN            = 'enfyjobs.com';

function getSubdomain(hostname: string): string | null {
  const host = hostname.split(':')[0].toLowerCase();
  if (host === MAIN_DOMAIN || host === `www.${MAIN_DOMAIN}`) return null;
  if (host === 'localhost' || host === '127.0.0.1') return null;
  if (host.endsWith('.localhost')) { return host.slice(0, host.length - '.localhost'.length) || null; } if (host.endsWith(`.${MAIN_DOMAIN}`)) {
    return host.slice(0, host.length - MAIN_DOMAIN.length - 1) || null;
  }
  return null;
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hostname = req.headers.get('host') || '';

  // Always allow static assets, Next.js internals, API routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/images") ||
    pathname.startsWith("/public") ||
    pathname.startsWith("/manifest.json")
  ) {
    return NextResponse.next();
  }

  // --- SUBDOMAIN LOGIC ---
  const subdomain = getSubdomain(hostname);
  let response = NextResponse.next();

  if (subdomain) {
    if (PASSTHROUGH_SUBDOMAINS.includes(subdomain)) {
      // passthrough
    } else if (PLATFORM_SUBDOMAINS.includes(subdomain)) {
      response.headers.set('x-platform-subdomain', subdomain);
    }
  }

  // --- AUTH LOGIC ---
  let session = null;
  try {
    session = await auth();
  } catch (error) {
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }

  const isPublic = publicRoutes.some((route) => pathname.startsWith(route));

  if (!session?.user && !isPublic) {
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }

  // If we added headers in subdomain logic, we must return that response object,
  // but if we do NextResponse.next() above, we can't easily merge without modifying headers.
  // We already created 'response = NextResponse.next()', so we just return it.
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};

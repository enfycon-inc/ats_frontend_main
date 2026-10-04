import { NextRequest, NextResponse } from 'next/server';

/**
 * Middleware — Multi-tenant subdomain routing & guard
 *
 * Rules:
 *  - enfyjobs.com / www.enfyjobs.com     → normal platform (register + login)
 *  - admin.enfyjobs.com                  → super admin login (no register button)
 *  - api.enfyjobs.com / auth.enfyjobs.com → pass-through (handled by Caddy)
 *  - <tenant>.enfyjobs.com               → tenant workspace login
 *  - anything else / unknown subdomains  → redirect to enfyjobs.com
 */

const PASSTHROUGH_SUBDOMAINS = ['api', 'auth', 'db', 'www'];
const PLATFORM_SUBDOMAINS    = ['admin'];           // show login, no register
const MAIN_DOMAIN            = 'enfyjobs.com';
const FALLBACK_URL           = 'https://enfyjobs.com';

function getSubdomain(hostname: string): string | null {
  // Strip port for local dev
  const host = hostname.split(':')[0].toLowerCase();
  if (host === MAIN_DOMAIN || host === `www.${MAIN_DOMAIN}`) return null;
  if (host === 'localhost' || host === '127.0.0.1') return null;
  if (host.endsWith(`.${MAIN_DOMAIN}`)) {
    const sub = host.slice(0, host.length - MAIN_DOMAIN.length - 1);
    return sub || null;
  }
  // Custom domain — let it pass
  return null;
}

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const { pathname } = request.nextUrl;

  // Always allow static assets, Next.js internals, API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/public')
  ) {
    return NextResponse.next();
  }

  const subdomain = getSubdomain(hostname);

  // No subdomain = root domain (enfyjobs.com) → serve normally
  if (!subdomain) {
    return NextResponse.next();
  }

  // Passthrough subdomains (api, auth, db) — caddy handles these, but just in case
  if (PASSTHROUGH_SUBDOMAINS.includes(subdomain)) {
    return NextResponse.next();
  }

  // Platform subdomains (admin) — serve the app but mark as platform
  if (PLATFORM_SUBDOMAINS.includes(subdomain)) {
    // Inject a header so the login page can detect it's on admin subdomain
    const response = NextResponse.next();
    response.headers.set('x-platform-subdomain', subdomain);
    return response;
  }

  // Any other subdomain = tenant workspace → serve normally
  // The login page's checkIsSubdomain() + getTenantAuthPolicy() handles validation
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except Next.js internals
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};

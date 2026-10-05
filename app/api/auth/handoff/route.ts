import { NextRequest, NextResponse } from 'next/server';
import { encode, decode } from 'next-auth/jwt';
import { getApiBase } from '@/lib/ats-api';
import { getBaseDomain, getCurrentSubdomain } from '@/utils/subdomain-helper';

const name = 'ats_session_handoff';
const secret = () => process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || '';
const options = (req: NextRequest) => ({
  httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const,
  path: '/api/auth/handoff', domain: getBaseDomain(req.headers.get('host') || '').split(':')[0],
});
const unavailable = () => NextResponse.json({ message: 'Workspace sign-in is temporarily unavailable.' }, { status: 503 });

// Transfer only encrypted renewal credentials; never put refresh tokens in a URL or readable cookie.
export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin');
  const expectedOrigin = `${process.env.NODE_ENV === 'production' ? 'https:' : req.nextUrl.protocol}//${req.headers.get('host')}`;
  if (origin !== expectedOrigin) return new NextResponse(null, { status: 403 });
  if (!secret()) return unavailable();
  try {
    const { accessToken, refreshToken, destination } = await req.json();
    if (typeof accessToken !== 'string' || typeof refreshToken !== 'string' ||
        typeof destination !== 'string' || !/^[a-z0-9-]+$/.test(destination)) {
      return new NextResponse(null, { status: 400 });
    }
    const me = await fetch(`${getApiBase()}/api/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` }, cache: 'no-store', signal: AbortSignal.timeout(8000),
    });
    if (!me.ok) return new NextResponse(null, { status: me.status === 401 ? 401 : 503 });
    const profile = await me.json();
    const user = profile.user || profile;
    if ((user.tenantDomain || user.tenant_domain || '').split('.')[0] !== destination) {
      return new NextResponse(null, { status: 403 });
    }
    const value = await encode({ secret: secret(), salt: name, maxAge: 30, token: { refreshToken, destination, userId: user.id } });
    if (value.length > 3800) return unavailable();
    const response = NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
    response.cookies.set(name, value, { ...options(req), maxAge: 30 });
    return response;
  } catch { return unavailable(); }
}

export async function GET(req: NextRequest) {
  if (!secret()) return unavailable();
  try {
    const token = await decode({ secret: secret(), salt: name, token: req.cookies.get(name)?.value }).catch(() => null);
    if (!token || token.destination !== getCurrentSubdomain(req.headers.get('host') || '') ||
        typeof token.refreshToken !== 'string') return new NextResponse(null, { status: 401 });
    const renewed = await fetch(`${getApiBase()}/api/auth/refresh`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: token.refreshToken }), cache: 'no-store', signal: AbortSignal.timeout(15000),
    });
    if (!renewed.ok) return new NextResponse(null, { status: renewed.status === 401 ? 401 : 503 });
    const data = await renewed.json();
    const me = await fetch(`${getApiBase()}/api/auth/me`, {
      headers: { Authorization: `Bearer ${data.accessToken}` }, cache: 'no-store', signal: AbortSignal.timeout(8000),
    });
    if (!me.ok) return unavailable();
    const profile = await me.json();
    const user = profile.user || profile;
    if (user.id !== token.userId || (user.tenantDomain || user.tenant_domain || '').split('.')[0] !== token.destination) {
      return new NextResponse(null, { status: 403 });
    }
    const response = NextResponse.json({ ...data, user }, { headers: { 'Cache-Control': 'no-store' } });
    response.cookies.set(name, '', { ...options(req), maxAge: 0 });
    return response;
  } catch { return unavailable(); }
}

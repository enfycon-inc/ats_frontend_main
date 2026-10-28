import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { randomBytes } from 'node:crypto';
import { auth } from '@/auth';
import { getApiBase } from '@/lib/ats-api';

export const dynamic = 'force-dynamic';
const actions = new Set(['context', 'claim', 'decision', 'outcome', 'withdraw', 'challenge', 'check']);

async function handle(request: NextRequest, context: { params: Promise<{ action: string }> }) {
  const { action } = await context.params;
  if (!actions.has(action) || (request.method === 'GET') !== (action === 'context')) return NextResponse.json({ message: 'Not found.' }, { status: 404 });
  if (request.method !== 'GET' && request.headers.get('origin') !== request.nextUrl.origin) {
    return NextResponse.json({ message: 'Invalid request origin.' }, { status: 403 });
  }
  try {
    const session = await auth();
    const user = session?.user as any;
    if (!user?.accessToken) return NextResponse.json({ message: 'Sign in to manage your location preference.' }, { status: 401 });
    const jar = await cookies();
    const secure = process.env.NODE_ENV === 'production';
    const name = secure ? '__Host-ats-office-browser' : 'ats-office-browser';
    let browser = jar.get(name)?.value;
    if (!browser || !/^[a-f0-9]{64}$/.test(browser)) {
      if (request.method !== 'GET') return NextResponse.json({ message: 'Enable cookies and retry this optional check.' }, { status: 400 });
      browser = randomBytes(32).toString('hex');
      jar.set(name, browser, { httpOnly: true, secure, sameSite: 'lax', path: '/', maxAge: 365 * 86400 });
    }
    const headers: Record<string, string> = {
      authorization: `Bearer ${user.accessToken}`, 'content-type': 'application/json',
      'x-ats-office-login': user.officeLoginReceipt || '', 'x-ats-office-browser': browser,
      'x-ats-office-origin': request.nextUrl.origin,
    };
    const role = request.headers.get('x-active-role-id');
    if (role) headers['x-active-role-id'] = role;
    let body: string | undefined;
    if (request.method !== 'GET') {
      const text = await request.text();
      if (text.length > 4096) return NextResponse.json({ message: 'Request too large.' }, { status: 413 });
      body = JSON.stringify(JSON.parse(text || '{}'));
    }
    const base = (process.env.INTERNAL_API_URL || getApiBase()).replace(/\/$/, '');
    const response = await fetch(`${base}/api/user-management/me/location-consent${action === 'context' ? '' : `/${action}`}`, {
      method: request.method, headers, body, cache: 'no-store', signal: AbortSignal.timeout(15000),
    });
    const data = await response.json().catch(() => ({ message: 'Office verification is temporarily unavailable.' }));
    return NextResponse.json(response.status >= 500 ? { message: 'Office verification is temporarily unavailable. You can continue using ATS.' } : data,
      { status: response.status, headers: { 'cache-control': 'no-store' } });
  } catch {
    return NextResponse.json({ message: 'Office verification is temporarily unavailable. You can continue using ATS.' }, { status: 503 });
  }
}
export const GET = handle;
export const POST = handle;

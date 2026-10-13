import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getApiBase } from '@/lib/ats-api';
import { getCurrentSubdomain } from '@/utils/subdomain-helper';

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) return new NextResponse(null, { status: 404 });
  const session = await auth();
  const user = session?.user as { accessToken?: string; tenantId?: string } | undefined;
  if (!user?.accessToken) return new NextResponse(null, { status: 401 });
  try {
    const response = await fetch(`${getApiBase()}/api/auth/me/photos/${id}`, {
      headers: {
        Authorization: `Bearer ${user.accessToken}`,
        ...(user.tenantId ? { 'x-tenant-id': user.tenantId } : {}),
        'x-tenant-domain': getCurrentSubdomain(request.headers.get('host') || '') || '',
      },
      cache: 'no-store', signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return new NextResponse(null, { status: response.status });
    return new NextResponse(await response.arrayBuffer(), {
      headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'private, max-age=300', 'X-Content-Type-Options': 'nosniff' },
    });
  } catch { return new NextResponse(null, { status: 503 }); }
}

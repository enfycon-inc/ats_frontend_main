import { getApiBase } from '@/lib/ats-api';

// Proxy the same permanent path on every workspace domain. The backend owns
// the shared files, so frontend rebuilds and blue/green switches cannot lose them.
export async function GET(_request: Request, context: { params: Promise<{ tenantId: string; filename: string }> }) {
  const { tenantId, filename } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(tenantId) || !/^[a-f0-9]{64}\.(png|jpg|gif|webp)$/.test(filename)) {
    return new Response(null, { status: 404 });
  }
  try {
    const response = await fetch(`${getApiBase().replace(/\/$/, '')}/public/image/logos/${tenantId}/${filename}`, {
      signal: AbortSignal.timeout(10000), cache: 'no-store',
    });
    if (!response.ok) return new Response(null, { status: response.status === 404 ? 404 : 502 });
    return new Response(response.body, { headers: {
      'Content-Type': response.headers.get('content-type') || 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
    } });
  } catch {
    return new Response(null, { status: 503 });
  }
}

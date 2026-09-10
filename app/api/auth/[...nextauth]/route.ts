import { handlers } from "@/auth";
import { NextRequest } from "next/server";

function fixIncomingRequest(req: NextRequest | Request): NextRequest | Request {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") || "https";

  if (host && (req.url.includes("0.0.0.0") || req.url.includes("127.0.0.1"))) {
    try {
      const parsed = new URL(req.url);
      parsed.host = host;
      parsed.protocol = proto.endsWith(":") ? proto : `${proto}:`;
      return new NextRequest(parsed.toString(), req as any);
    } catch {
      return req;
    }
  }
  return req;
}

async function wrapHandler(handler: (req: any) => Promise<Response>, req: NextRequest): Promise<Response> {
  const fixedReq = fixIncomingRequest(req);
  const res = await handler(fixedReq);
  const location = res.headers.get("Location");
  if (location && (location.includes("0.0.0.0:3000") || location.includes("127.0.0.1:3000"))) {
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "enfyjobs.com";
    const proto = req.headers.get("x-forwarded-proto") || "https";
    const cleanLocation = location
      .replace(/https?:\/\/0\.0\.0\.0:3000/g, `${proto}://${host}`)
      .replace(/https?:\/\/127\.0\.0\.1:3000/g, `${proto}://${host}`);
    const newHeaders = new Headers(res.headers);
    newHeaders.set("Location", cleanLocation);
    return new Response(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers: newHeaders,
    });
  }
  return res;
}

export const GET = (req: NextRequest) => wrapHandler(handlers.GET, req);
export const POST = (req: NextRequest) => wrapHandler(handlers.POST, req);
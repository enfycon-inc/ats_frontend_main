import { handlers } from "@/auth";
import { NextRequest } from "next/server";

function fixIncomingRequest(req: NextRequest | Request): NextRequest | Request {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const defaultProto = req.url.startsWith("https") ? "https" : (host?.includes("localhost") ? "http" : "https");
  const proto = req.headers.get("x-forwarded-proto") || defaultProto;

  if (host) {
    try {
      const parsed = new URL(req.url);
      const targetProto = proto.endsWith(":") ? proto : `${proto}:`;
      if (parsed.host !== host || parsed.protocol !== targetProto) {
        parsed.host = host;
        parsed.protocol = targetProto;
        return new NextRequest(parsed.toString(), req as any);
      }
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
  if (location) {
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
    const defaultProto = req.url.startsWith("https") ? "https" : (host?.includes("localhost") ? "http" : "https");
    const proto = req.headers.get("x-forwarded-proto") || defaultProto;

    if (host) {
      try {
        const parsedLoc = new URL(location, `${proto}://${host}`);
        // If redirecting internally or back to localhost / 127.0.0.1 / 0.0.0.0, preserve host
        if (
          parsedLoc.hostname === "localhost" ||
          parsedLoc.hostname === "127.0.0.1" ||
          parsedLoc.hostname === "0.0.0.0"
        ) {
          if (parsedLoc.host !== host) {
            parsedLoc.host = host;
            parsedLoc.protocol = proto.endsWith(":") ? proto : `${proto}:`;
            const newHeaders = new Headers(res.headers);
            newHeaders.set("Location", parsedLoc.toString());
            return new Response(res.body, {
              status: res.status,
              statusText: res.statusText,
              headers: newHeaders,
            });
          }
        }
      } catch {}
    }
  }
  return res;
}

export const GET = handlers.GET;
export const POST = handlers.POST;
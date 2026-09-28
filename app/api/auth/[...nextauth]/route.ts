import { handlers } from "@/auth";
import { NextRequest } from "next/server";

function fixIncomingRequest(req: NextRequest | Request): NextRequest | Request {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") || "https";

  if (host) {
    // Keep port for local development so redirects don't break
    const isLocal = host.includes("localhost") || host.includes("127.0.0.1");
    const cleanHost = isLocal ? host : host.split(":")[0];
    const finalPort = isLocal ? (host.split(":")[1] || "") : "";
    
    try {
      const parsed = new URL(req.url);
      parsed.host = cleanHost;
      parsed.port = finalPort;
      parsed.protocol = isLocal ? "http:" : (proto.endsWith(":") ? proto : `${proto}:`);
      
      const newHeaders = new Headers(req.headers);
      newHeaders.set("host", cleanHost);
      newHeaders.set("x-forwarded-host", cleanHost);
      newHeaders.set("x-forwarded-port", isLocal ? (finalPort || "80") : (proto === "https" ? "443" : "80"));

      return new NextRequest(parsed.toString(), {
        headers: newHeaders,
        method: req.method,
        // @ts-ignore
        body: req.body,
        duplex: "half",
        signal: req.signal
      } as any);
    } catch {
      return req;
    }
  }
  return req;
}

export const GET = (req: NextRequest) => handlers.GET(fixIncomingRequest(req) as any);
export const POST = (req: NextRequest) => handlers.POST(fixIncomingRequest(req) as any);
import { handlers } from "@/auth";
import { NextRequest } from "next/server";

function fixIncomingRequest(req: NextRequest | Request): NextRequest | Request {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") || "https";

  if (host) {
    // Strip any internal port like :3000 that might have leaked
    const cleanHost = host.split(":")[0];
    try {
      const parsed = new URL(req.url);
      parsed.host = cleanHost;
      parsed.port = "";
      parsed.protocol = proto.endsWith(":") ? proto : `${proto}:`;
      
      const newHeaders = new Headers(req.headers);
      newHeaders.set("host", cleanHost);
      newHeaders.set("x-forwarded-host", cleanHost);
      newHeaders.set("x-forwarded-port", proto === "https" ? "443" : "80");

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
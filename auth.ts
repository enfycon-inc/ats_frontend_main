import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import GitHub from "next-auth/providers/github"
import Google from "next-auth/providers/google"
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id"
import { ZodError } from "zod"
import { loginSchema } from "./lib/zod"

const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID || "d3b07384-d113-49c3-a555-9ee75c13ca33";
const isProd = process.env.NODE_ENV === "production";
const cookiePrefix = isProd ? "__Secure-" : "";

async function fetchBackend(path: string, options: RequestInit = {}): Promise<Response> {
  const internalBase = process.env.INTERNAL_API_URL || (isProd ? "http://backend_blue:5000" : (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000"));
  try {
    const res = await fetch(`${internalBase}${path}`, options);
    if (res) return res;
  } catch (err) {
    console.warn(`[auth.ts] Internal fetch to ${internalBase}${path} failed, trying fallback:`, (err as any)?.message || err);
  }

  const publicBase = (process.env.NEXT_PUBLIC_API_URL && !process.env.NEXT_PUBLIC_API_URL.includes("localhost"))
    ? process.env.NEXT_PUBLIC_API_URL
    : "https://api.enfyjobs.com";
  return fetch(`${publicBase}${path}`, options);
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  // AUTH_SECRET is required. Generate one with: openssl rand -base64 32
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  trustHost: true,
  // Redirect all NextAuth errors to the login page instead of the generic /api/auth/error
  pages: {
    error: "/auth/login",
    signIn: "/auth/login",
  },
  session: {
    strategy: "jwt",
    // Matches Keycloak's SSO Session Max. Set KEYCLOAK_REFRESH_TOKEN_TTL_SECONDS in .env.
    maxAge: parseInt(process.env.KEYCLOAK_REFRESH_TOKEN_TTL_SECONDS || '86400'), // Default 24 hours (supports 12h idle timeout)
  },
  cookies: {
    sessionToken: {
      name: `${cookiePrefix}ats.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isProd,
        // Host-only cookie: isolates each tenant subdomain session (csm.enfyjobs.com vs enfycon.enfyjobs.com)
        domain: undefined,
      },
    },
  },

  providers: [
    Credentials({
      id: "token-handoff",
      name: "Token Handoff",
      credentials: {
        token: {},
        userJson: {},
      },
      authorize: async (credentials) => {
        if (!credentials?.token) return null;
        try {
          // 1. Direct handoff: if userJson payload is provided from client login, hydrate session immediately
          if (credentials.userJson) {
            try {
              const u = JSON.parse(credentials.userJson as string);
              if (u && (u.id || u.email)) {
                return {
                  id: u.id,
                  name: u.fullName || u.full_name || u.name,
                  email: u.email,
                  image: "/images/users/user-1.jpg",
                  permissions: u.permissions || [],
                  roles: u.roles || [],
                  accessToken: credentials.token as string,
                  tenantDomain: u.tenantDomain || u.tenant_domain || (u.tenant && (u.tenant.domain || u.tenant.tenantDomain)) || "",
                  systemRole: u.systemRole || "",
                  podId: u.podId || u.pod_id || null,
                  branchId: u.branchId || u.branch_id || null,
                  branchName: u.branchName || u.branch_name || null,
                  tenantId: u.tenantId || u.tenant_id || DEFAULT_TENANT_ID,
                  defaultMarket: u.defaultMarket || u.default_market || "US",
                };
              }
            } catch {}
          }

          // 2. Network verification fallback against backend API
          const res = await fetchBackend(`/api/auth/me`, {
            headers: {
              Authorization: `Bearer ${credentials.token}`,
            },
          }).catch(() => null);
          if (res && res.ok) {
            const data = await res.json();
            const u = data?.user || data;
            if (u && u.id) {
              return {
                id: u.id,
                name: u.fullName || u.full_name || u.name,
                email: u.email,
                image: "/images/users/user-1.jpg",
                permissions: u.permissions || [],
                roles: u.roles || [],
                accessToken: credentials.token as string,
                tenantDomain: u.tenantDomain || u.tenant_domain || (u.tenant && (u.tenant.domain || u.tenant.tenantDomain)) || "",
                systemRole: u.systemRole || "",
                podId: u.podId || u.pod_id || null,
                branchId: u.branchId || u.branch_id || null,
                branchName: u.branchName || u.branch_name || null,
                tenantId: u.tenantId || u.tenant_id || DEFAULT_TENANT_ID,
                defaultMarket: u.defaultMarket || u.default_market || "US",
              };
            }
          }
        } catch (e) {
          console.error("Token handoff authentication error:", e);
        }
        return null;
      },
    }),
    Credentials({
      credentials: {
        email: {},
        password: {},
        subdomain: {},
      },
      authorize: async (credentials) => {
        try {
          const parsed = await loginSchema.parseAsync(credentials);
          const { email, password } = parsed;
          const subdomain = credentials?.subdomain || "";

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 6000);
          const res = await fetchBackend(`/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password, subdomain }),
            signal: controller.signal,
          }).catch(() => null);
          clearTimeout(timeoutId);

          if (res && res.ok) {
            const data = await res.json();
            const u = data?.user || data;
            if (data && u) {
              return {
                id: u.id,
                name: u.fullName || u.full_name || u.name,
                email: u.email,
                image: "/images/users/user-1.jpg",
                permissions: u.permissions || [],
                roles: u.roles || [],
                accessToken: data.accessToken,
                refreshToken: data.refreshToken || null,
                expiresIn: data.expiresIn || 36000,
                tenantDomain: u.tenantDomain || u.tenant_domain || "",
                systemRole: u.systemRole || "RECRUITER",
                podId: u.podId || u.pod_id || null,
                branchId: u.branchId || u.branch_id || null,
                branchName: u.branchName || u.branch_name || null,
                tenantId: u.tenantId || u.tenant_id || DEFAULT_TENANT_ID,
                defaultMarket: u.defaultMarket || u.default_market || "US",
              };
            }
          } else {
            const errBody = res ? await res.text().catch(() => "") : "";
            console.warn(`[auth.ts] Backend authentication failed with status ${res?.status}: ${errBody}`);
          }
          return null
        } catch (error: any) {
          console.error(`[auth.ts] Authorize error: ${error.message}`);
          return null
        }
      }
    }),

    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
    MicrosoftEntraID({
      clientId: process.env.MICROSOFT_CLIENT_ID,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
      issuer: "https://login.microsoftonline.com/common/v2.0",
    }),
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google" || account?.provider === "microsoft-entra-id" || account?.provider === "microsoft") {
        try {
          const provider = account.provider.includes("microsoft") ? "microsoft" : "google";
          const res = await fetchBackend(`/api/auth/sso-login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              provider,
              email: user.email,
              name: user.name,
              picture: user.image,
              microsoftTenantId: (profile as any)?.tid || null,
            }),
          }).catch(() => null);

          if (res && res.ok) {
            const data = await res.json();
            if (data?.user) {
              user.id = data.user.id;
              user.name = data.user.fullName;
              user.email = data.user.email;
              (user as any).permissions = data.user.permissions || [];
              (user as any).roles = data.user.roles || [];
              (user as any).accessToken = data.accessToken;
              (user as any).tenantDomain = data.user.tenantDomain || "";
              (user as any).systemRole = data.user.systemRole || "";
              (user as any).podId = data.user.podId || null;
              (user as any).branchId = data.user.branchId || null;
              (user as any).branchName = data.user.branchName || null;
              (user as any).tenantId = data.user.tenantId || DEFAULT_TENANT_ID;
              (user as any).defaultMarket = data.user.defaultMarket || "US";
              return true;
            }
          }
          // SSO backend rejected — redirect to login with error message
          const errData = res ? await res.json().catch(() => ({})) : {};
          console.warn(`SSO authentication rejected: ${errData.message || res?.statusText}`);
          return `/auth/login?error=AccessDenied`;
        } catch (err) {
          console.error("SSO signIn callback error:", err);
          return `/auth/login?error=AccessDenied`;
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      // ── First login: populate token from user object returned by authorize() ──
      if (user) {
        token.id = user.id
        token.permissions = (user as any).permissions || []
        token.roles = (user as any).roles || []
        token.accessToken = (user as any).accessToken
        token.refreshToken = (user as any).refreshToken || null
        // Use actual Keycloak expiresIn — do not apply a local default
        token.accessTokenExpiry = Date.now() + (((user as any).expiresIn || 3600) * 1000)
        token.tenantDomain = (user as any).tenantDomain
        token.systemRole = (user as any).systemRole
        token.podId = (user as any).podId
        token.branchId = (user as any).branchId
        token.branchName = (user as any).branchName
        token.tenantId = (user as any).tenantId
        token.defaultMarket = (user as any).defaultMarket
        delete token.error
        return token
      }

      // ── Subsequent session checks: silently refresh access token if expired ──
      const now = Date.now()
      const expiry = token.accessTokenExpiry as number | undefined

      // Token still valid (more than 1 min remaining) — return as-is
      if (expiry && now < expiry - 60 * 1000) {
        delete token.error
        return token
      }

      // Token expired or about to expire — try silent refresh via backend
      if (token.refreshToken) {
        try {
          const res = await fetchBackend(`/api/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken: token.refreshToken }),
          }).catch(() => null)

          if (res && res.ok) {
            const data = await res.json()
            token.accessToken = data.accessToken
            if (data.refreshToken) token.refreshToken = data.refreshToken
            token.accessTokenExpiry = Date.now() + ((data.expiresIn || 36000) * 1000)
            delete token.error
            console.log('[auth.ts jwt] Access token silently refreshed.')
            return token
          }
        } catch (e) {
          console.error('[auth.ts jwt] Silent token refresh failed:', e)
        }
      }

      // If token still has an accessToken and hasn't definitely expired, keep using it
      if (!expiry || now < expiry) {
        delete token.error
        return token
      }

      // Definitively expired and refresh failed — mark error so client redirects to login
      token.error = 'RefreshAccessTokenError'
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).permissions = token.permissions || [];
        (session.user as any).roles = token.roles || [];
        (session.user as any).accessToken = token.accessToken;
        (session.user as any).tenantDomain = token.tenantDomain;
        (session.user as any).systemRole = token.systemRole;
        (session.user as any).podId = token.podId;
        (session.user as any).branchId = token.branchId;
        (session.user as any).branchName = token.branchName;
        (session.user as any).tenantId = token.tenantId;
        (session.user as any).defaultMarket = token.defaultMarket;
        // Forward refresh error so client can detect and redirect to login
        (session as any).error = token.error || null;
      }
      return session
    }
  },
})
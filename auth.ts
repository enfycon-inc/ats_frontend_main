import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import GitHub from "next-auth/providers/github"
import Google from "next-auth/providers/google"
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id"
import { ZodError } from "zod"
import { loginSchema } from "./lib/zod"

const DEFAULT_TENANT_ID = "d3b07384-d113-49c3-a555-9ee75c13ca33";
const isProd = process.env.NODE_ENV === "production";
const baseDomain = process.env.BASE_DOMAIN || "enfyjobs.com";
const cookieDomain = isProd ? `.${baseDomain.includes('localhost') ? 'localhost' : baseDomain}` : undefined;

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "1kc7Cf4Z2V2XX0WfGLrET9iZzWyDkar9RlqjIK3Vkxo",
  trustHost: true,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 Days
  },
  cookies: {
    sessionToken: {
      name: `authjs.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isProd,
        domain: cookieDomain,
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
                  tenantDomain: u.tenantDomain || u.tenant_domain || "",
                  systemRole: u.systemRole || "RECRUITER",
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
          let apiBase = process.env.NEXT_PUBLIC_API_URL || "https://api.enfyjobs.com";
          if (process.env.NODE_ENV === "production" && apiBase.includes("localhost")) {
            apiBase = "https://api.enfyjobs.com";
          }
          const res = await fetch(`${apiBase}/api/auth/me`, {
            headers: {
              Authorization: `Bearer ${credentials.token}`,
            },
          });
          if (res.ok) {
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
                tenantDomain: u.tenantDomain || u.tenant_domain || "",
                systemRole: u.systemRole || "RECRUITER",
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

          let apiBase = process.env.NEXT_PUBLIC_API_URL || "https://api.enfyjobs.com";
          if (process.env.NODE_ENV === "production" && apiBase.includes("localhost")) {
            apiBase = "https://api.enfyjobs.com";
          }

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 4000);
          const res = await fetch(`${apiBase}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password, subdomain }),
            signal: controller.signal,
          });
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
          let apiBase = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000";
          if (process.env.NODE_ENV === "production" && !process.env.NEXT_PUBLIC_API_URL) {
            apiBase = "http://backend:5000";
          }

          const res = await fetch(`${apiBase}/api/auth/sso-login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              provider,
              email: user.email,
              name: user.name,
              picture: user.image,
              microsoftTenantId: (profile as any)?.tid || null,
            }),
          });

          if (res.ok) {
            const data = await res.json();
            if (data?.user) {
              user.id = data.user.id;
              user.name = data.user.fullName;
              user.email = data.user.email;
              (user as any).permissions = data.user.permissions || [];
              (user as any).roles = data.user.roles || [];
              (user as any).accessToken = data.accessToken;
              (user as any).tenantDomain = data.user.tenantDomain || "";
              (user as any).systemRole = data.user.systemRole || "RECRUITER";
              (user as any).podId = data.user.podId || null;
              (user as any).branchId = data.user.branchId || null;
              (user as any).branchName = data.user.branchName || null;
              (user as any).tenantId = data.user.tenantId || DEFAULT_TENANT_ID;
              (user as any).defaultMarket = data.user.defaultMarket || "US";
              return true;
            }
          } else {
            const errData = await res.json().catch(() => ({}));
            console.warn(`SSO authentication rejected: ${errData.message || res.statusText}`);
            return false;
          }
        } catch (err) {
          console.error("SSO signIn callback error:", err);
          return false;
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
        token.accessTokenExpiry = Date.now() + (((user as any).expiresIn || 604800) * 1000)
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
          // Docker-internal URL (production), env var fallback (dev)
          const apiBase =
            process.env.NODE_ENV === 'production'
              ? 'http://backend:5000'
              : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000')

          const res = await fetch(`${apiBase}/api/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken: token.refreshToken }),
          }).catch(() => null)

          if (res && res.ok) {
            const data = await res.json()
            token.accessToken = data.accessToken
            if (data.refreshToken) token.refreshToken = data.refreshToken
            token.accessTokenExpiry = Date.now() + ((data.expiresIn || 300) * 1000)
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
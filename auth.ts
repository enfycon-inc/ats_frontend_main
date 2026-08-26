import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import GitHub from "next-auth/providers/github"
import Google from "next-auth/providers/google"
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id"
import { ZodError } from "zod"
import { loginSchema } from "./lib/zod"
import { getUserFromDb } from "./utils/db"

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
      name: isProd ? `__Secure-authjs.session-token` : `authjs.session-token`,
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
      },
      authorize: async (credentials) => {
        if (!credentials?.token) return null;
        try {
          let apiBase = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000";
          if (process.env.NODE_ENV === "production" && !process.env.NEXT_PUBLIC_API_URL) {
            apiBase = "http://backend:5000";
          }
          const res = await fetch(`${apiBase}/api/auth/me`, {
            headers: {
              Authorization: `Bearer ${credentials.token}`,
            },
          });
          if (res.ok) {
            const data = await res.json();
            if (data?.user) {
              return {
                id: data.user.id,
                name: data.user.fullName,
                email: data.user.email,
                image: "/images/users/user-1.jpg",
                permissions: data.user.permissions || [],
                roles: data.user.roles || [],
                accessToken: credentials.token as string,
                tenantDomain: data.user.tenantDomain || "",
                systemRole: data.user.systemRole || "RECRUITER",
                podId: data.user.podId || null,
                branchId: data.user.branchId || null,
                branchName: data.user.branchName || null,
                tenantId: data.user.tenantId || DEFAULT_TENANT_ID,
                defaultMarket: data.user.defaultMarket || "US",
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
        const fs = require('fs');
        const path = require('path');
        const logPath = path.join(process.cwd(), 'nextauth_debug.log');
        const log = (msg: any) => {
          console.log(msg);
          try { fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${msg}\n`); } catch(e) {}
        };
        
        try {
          log(`Authorize started for email: ${credentials?.email}`);
          const parsed = await loginSchema.parseAsync(credentials)
          const { email, password } = parsed
          const subdomain = credentials?.subdomain || ""
          log(`Parsed credentials: email=${email}, subdomain=${subdomain}`);

          // 1. Try to authenticate against the NestJS Backend first
          try {
            let apiBase = 'http://backend:5000'
            let res

            try {
              log(`Attempting fetch to Docker backend: ${apiBase}/api/auth/login`);
              const controller = new AbortController()
              const timeoutId = setTimeout(() => controller.abort(), 1000)
              res = await fetch(`${apiBase}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, subdomain }),
                signal: controller.signal,
              })
              clearTimeout(timeoutId)
              log(`Docker backend response status: ${res?.status}`);
            } catch (dockerErr: any) {
              log(`Docker backend failed: ${dockerErr.message}. Trying localhost fallback.`);
              apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace('localhost', '127.0.0.1')
              log(`Attempting fetch to localhost backend: ${apiBase}/api/auth/login`);
              res = await fetch(`${apiBase}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, subdomain }),
              })
              log(`Localhost backend response status: ${res?.status}`);
            }

            if (res && res.ok) {
              const data = await res.json()
              log(`Backend login successful. User data: ${JSON.stringify(data.user)}`);
              if (data && data.user) {
                return {
                  id: data.user.id,
                  name: data.user.fullName,
                  email: data.user.email,
                  image: '/images/users/user-1.jpg',
                  permissions: data.user.permissions || [],
                  roles: data.user.roles || [],
                  accessToken: data.accessToken,
                  tenantDomain: data.user.tenantDomain || '',
                  systemRole: data.user.systemRole || 'RECRUITER',
                  podId: data.user.podId || null,
                  branchId: data.user.branchId || null,
                  branchName: data.user.branchName || null,
                  tenantId: data.user.tenantId || DEFAULT_TENANT_ID,
                  defaultMarket: data.user.defaultMarket || 'US',
                }
              }
            } else {
              const errBody = res ? await res.text().catch(() => '') : '';
              log(`Backend login failed with status ${res?.status}. Body: ${errBody}`);
            }
          } catch (apiErr: any) {
            log(`Backend auth encountered exception: ${apiErr.message}\n${apiErr.stack}`);
            console.warn("Backend auth attempt encountered an error. Falling back to local mock data.", apiErr)
          }

          // 2. Fallback: Authenticate using hardcoded local mock data
          log(`Falling back to local mock database for ${email}`);
          const user = await getUserFromDb(email, password)
          if (user) {
            const resolvedRole = email === 'admin@enfycon.com' ? 'SUPER_ADMIN' : (user.name.toUpperCase().includes('ADMIN') ? 'ADMIN' : 'RECRUITER');
            log(`Found mock user: ${user.name}, resolvedRole: ${resolvedRole}`);
            return {
              id: user.email,
              name: user.name,
              email: user.email,
              image: user.image,
              permissions: ['job:create', 'job:edit', 'job:view', 'candidate:create', 'candidate:view', 'submission:create', 'submission:edit', 'tenant:settings', 'user:manage'],
              roles: resolvedRole === 'SUPER_ADMIN' ? ['ADMIN', 'SUPER_ADMIN'] : [resolvedRole],
              accessToken: 'mock-jwt-token',
              tenantDomain: '',
              systemRole: resolvedRole,
              podId: null,
              tenantId: DEFAULT_TENANT_ID,
              defaultMarket: resolvedRole === 'SUPER_ADMIN' ? 'US' : 'IN',
            }
          }

          log(`No mock user found for ${email}`);
          return null
        } catch (error: any) {
          log(`Authorize caught global exception: ${error.message}\n${error.stack}`);
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
      if (user) {
        token.id = user.id
        token.permissions = (user as any).permissions || []
        token.roles = (user as any).roles || []
        token.accessToken = (user as any).accessToken
        token.tenantDomain = (user as any).tenantDomain
        token.systemRole = (user as any).systemRole
        token.podId = (user as any).podId
        token.branchId = (user as any).branchId
        token.branchName = (user as any).branchName
        token.tenantId = (user as any).tenantId
        token.defaultMarket = (user as any).defaultMarket
      }
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
      }
      return session
    }
  },
})
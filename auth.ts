import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import GitHub from "next-auth/providers/github"
import Google from "next-auth/providers/google"
import { ZodError } from "zod"
import { loginSchema } from "./lib/zod"
import { getUserFromDb } from "./utils/db"

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: {
    strategy: "jwt",
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        domain: process.env.NODE_ENV === "production" ? ".enfycon.com" : undefined,
      },
    },
  },
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
        subdomain: {},
      },
      authorize: async (credentials) => {
        try {
          const parsed = await loginSchema.parseAsync(credentials)
          const { email, password } = parsed
          const subdomain = credentials?.subdomain || ""

          // 1. Try to authenticate against the NestJS Backend first
          try {
            let apiBase = 'http://backend:5000'
            let res

            try {
              const controller = new AbortController()
              const timeoutId = setTimeout(() => controller.abort(), 1000)
              res = await fetch(`${apiBase}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, subdomain }),
                signal: controller.signal,
              })
              clearTimeout(timeoutId)
            } catch (dockerErr) {
              apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace('localhost', '127.0.0.1')
              res = await fetch(`${apiBase}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, subdomain }),
              })
            }

            if (res && res.ok) {
              const data = await res.json()
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
                }
              }
            }
          } catch (apiErr) {
            console.warn("Backend auth attempt encountered an error. Falling back to local mock data.", apiErr)
          }

          // 2. Fallback: Authenticate using hardcoded local mock data
          const user = await getUserFromDb(email, password)
          if (user) {
            const resolvedRole = user.name.toUpperCase().includes('ADMIN') ? 'ADMIN' : 'RECRUITER';
            return {
              id: user.email,
              name: user.name,
              email: user.email,
              image: user.image,
              permissions: ['job:create', 'job:edit', 'job:view', 'candidate:create', 'candidate:view', 'submission:create', 'submission:edit', 'tenant:settings', 'user:manage'],
              roles: [resolvedRole],
              accessToken: 'mock-jwt-token',
              tenantDomain: '',
              systemRole: resolvedRole,
              podId: null,
            }
          }

          return null
        } catch (error) {
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
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.permissions = (user as any).permissions || []
        token.roles = (user as any).roles || []
        token.accessToken = (user as any).accessToken
        token.tenantDomain = (user as any).tenantDomain
        token.systemRole = (user as any).systemRole
        token.podId = (user as any).podId
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
      }
      return session
    }
  },
})
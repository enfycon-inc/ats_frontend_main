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
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      authorize: async (credentials) => {
        try {
          const parsed = await loginSchema.parseAsync(credentials)
          const { email, password } = parsed

          // 1. Try to authenticate against the NestJS Backend first
          try {
            let apiBase = 'http://backend:5000'
            let res

            try {
              res = await fetch(`${apiBase}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
              })
            } catch (dockerErr) {
              apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace('localhost', '127.0.0.1')
              res = await fetch(`${apiBase}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
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
                }
              }
            }
          } catch (apiErr) {
            console.warn("Backend auth attempt encountered an error. Falling back to local mock data.", apiErr)
          }

          // 2. Fallback: Authenticate using hardcoded local mock data
          const user = await getUserFromDb(email, password)
          if (user) {
            return {
              id: user.email,
              name: user.name,
              email: user.email,
              image: user.image,
              permissions: ['job:create', 'job:edit', 'job:view', 'candidate:create', 'candidate:view', 'submission:create', 'submission:edit', 'tenant:settings', 'user:manage'],
              roles: [user.name.toUpperCase().includes('ADMIN') ? 'ADMIN' : 'RECRUITER'],
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
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).permissions = token.permissions || [];
        (session.user as any).roles = token.roles || [];
      }
      return session
    }
  },
})
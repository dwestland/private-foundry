import NextAuth from 'next-auth'
import GitHub from 'next-auth/providers/github'
import Google from 'next-auth/providers/google'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from '@/lib/prisma'
import Resend from 'next-auth/providers/resend'

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID!,
      clientSecret: process.env.AUTH_GITHUB_SECRET!,
    }),
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
    Resend({
      from: process.env.AUTH_RESEND_FROM!,
      apiKey: process.env.AUTH_RESEND_KEY!,
    }),
  ],
  session: {
    strategy: 'database',
  },
  secret: process.env.AUTH_SECRET!,
  debug: process.env.NODE_ENV === 'development',

  // Added to stop error from known issue with next-auth v5
  logger: {
    error(error: Error) {
      if (error.message.includes('installHook.js.map')) return
      console.error(error)
    },
    warn(code: string) {
      console.warn(code)
    },
    debug(code: string) {
      console.debug(code)
    },
  },

  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id
      }
      return session
    },
  },
})

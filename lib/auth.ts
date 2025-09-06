// lib/auth.ts - FIXED to avoid conflicts with authUtils
import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import { prisma } from "./prisma"
import bcrypt from "bcryptjs"

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              password: true,
              image: true
            }
          })

          if (!user || !user.password) {
            return null
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password
          )

          if (!isPasswordValid) {
            return null
          }

          // FIXED: Don't call toString() on string IDs
          return {
            id: user.id, // Already a string from Prisma
            email: user.email!,
            name: user.name,
            role: user.role,
            image: user.image,
          }
        } catch (error) {
          console.error("NextAuth authorize error:", error)
          return null
        }
      }
    })
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user, account, trigger }) {
      console.log("JWT Callback - Input:", { 
        hasUser: !!user, 
        hasToken: !!token, 
        trigger,
        tokenId: token?.id,
        tokenRole: token?.role 
      })

      // Initial sign in
      if (user) {
        token.id = user.id
        token.role = user.role
        token.email = user.email
        console.log("JWT: Set from user", { id: token.id, role: token.role })
        return token
      }

      // For existing tokens, validate we have required data
      if (token.email && (!token.id || !token.role)) {
        try {
          console.log("JWT: Fetching missing data for", token.email)
          const dbUser = await prisma.user.findUnique({
            where: { email: token.email as string },
            select: { id: true, role: true }
          })
          
          if (dbUser) {
            token.id = dbUser.id // Already a string
            token.role = dbUser.role
            console.log("JWT: Updated from DB", { id: token.id, role: token.role })
          } else {
            console.warn("JWT: User not found in DB for email:", token.email)
          }
        } catch (error) {
          console.error("JWT: Database error:", error)
        }
      }

      console.log("JWT Callback - Output:", { 
        id: token.id, 
        role: token.role, 
        email: token.email 
      })
      
      return token
    },
    
    async session({ session, token }) {
      console.log("Session Callback - Input:", { 
        hasSession: !!session,
        tokenId: token?.id,
        tokenRole: token?.role,
        tokenEmail: token?.email
      })

      if (session.user && token) {
        session.user.id = token.id as string
        session.user.role = (token.role as string) || 'USER'
        session.user.email = token.email as string
        
        console.log("Session Callback - Output:", {
          id: session.user.id,
          email: session.user.email,
          role: session.user.role
        })
      }
      
      return session
    },

    async signIn({ user, account, profile }) {
      console.log("SignIn Callback:", { 
        userEmail: user.email, 
        provider: account?.provider,
        userId: user.id
      })
      
      // For Google OAuth, ensure consistency
      if (account?.provider === "google" && user.email) {
        try {
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email },
            select: { id: true, role: true }
          })
          
          if (existingUser) {
            user.id = existingUser.id // Already a string
            user.role = existingUser.role
            console.log("SignIn: Updated OAuth user", { id: user.id, role: user.role })
          }
        } catch (error) {
          console.error("SignIn: Error updating OAuth user:", error)
        }
      }
      
      return true
    }
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: false, // Disable debug in production to reduce noise
  
  // Simplified cookies for production
  useSecureCookies: process.env.NODE_ENV === "production",
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === "production" 
        ? "__Secure-next-auth.session-token" 
        : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        maxAge: 30 * 24 * 60 * 60,
      },
    },
  },
  
  events: {
    async signIn(message) {
      console.log("✅ User signed in:", {
        email: message.user.email,
        provider: message.account?.provider
      })
    },
    async signOut(message) {
      console.log("👋 User signed out:", message.token?.email)
    },
    async session(message) {
      // Only log errors in production
      if (!message.session?.user?.id) {
        console.error("⚠️ Session missing user ID:", {
          email: message.session?.user?.email,
          tokenId: message.token?.id
        })
      }
    }
  }
}
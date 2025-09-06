// lib/auth.ts - FIXED PRODUCTION VERSION
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

          // Return user data for NextAuth - CRITICAL: ensure ID is string
          return {
            id: user.id.toString(), // Ensure string ID
            email: user.email!,
            name: user.name,
            role: user.role,
            image: user.image,
          }
        } catch (error) {
          console.error("Auth error:", error)
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
    async jwt({ token, user, account }) {
      // SIMPLIFIED: Only set token data on initial sign in
      if (user) {
        token.id = user.id
        token.role = user.role
        token.email = user.email
        console.log("JWT: Setting initial token data", { id: token.id, role: token.role, email: token.email })
        return token
      }

      // For existing tokens, only fetch from DB if we're missing critical data
      if (!token.id || !token.role) {
        try {
          console.log("JWT: Missing data, fetching from DB for email:", token.email)
          const dbUser = await prisma.user.findUnique({
            where: { email: token.email as string },
            select: { id: true, role: true }
          })
          
          if (dbUser) {
            token.id = dbUser.id.toString()
            token.role = dbUser.role
            console.log("JWT: Updated token from DB", { id: token.id, role: token.role })
          }
        } catch (error) {
          console.error("JWT: Error fetching user data:", error)
        }
      }
      
      return token
    },
    
    async session({ session, token }) {
      // SIMPLIFIED: Direct assignment from token
      if (session.user && token) {
        session.user.id = token.id as string
        session.user.role = token.role as string || 'USER'
        session.user.email = token.email as string
        
        console.log("Session: Final user data", {
          id: session.user.id,
          email: session.user.email,
          role: session.user.role
        })
      }
      
      return session
    },

    async signIn({ user, account }) {
      console.log("SignIn: User attempting to sign in", { 
        email: user.email, 
        provider: account?.provider,
        userId: user.id
      })
      
      // For Google OAuth, ensure user exists and update ID
      if (account?.provider === "google" && user.email) {
        try {
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email },
            select: { id: true, name: true, image: true }
          })
          
          if (existingUser) {
            user.id = existingUser.id.toString()
            console.log("SignIn: Updated Google user ID", { id: user.id })
          }
        } catch (error) {
          console.error("SignIn: Error updating Google user:", error)
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
  debug: process.env.NODE_ENV === "development",
  
  // FIXED: Simplified cookie configuration
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
  
  // Enhanced production events
  events: {
    async signIn(message) {
      console.log("✅ SignIn event:", {
        user: message.user.email,
        account: message.account?.provider,
        isSignIn: message.isNewUser === false ? 'returning' : 'new'
      })
    },
    async signOut(message) {
      console.log("👋 SignOut event:", message.token?.email)
    },
    async session(message) {
      if (!message.session?.user?.id) {
        console.error("⚠️ Session missing user ID:", {
          email: message.session?.user?.email,
          hasToken: !!message.token,
          tokenId: message.token?.id
        })
      }
    }
  }
}
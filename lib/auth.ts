// lib/auth.ts - PRODUCTION OPTIMIZED VERSION
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

          // Return user data for NextAuth
          return {
            id: user.id,
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
      // Debug logging for production troubleshooting
      const isProduction = process.env.NODE_ENV === 'production'
      
      if (!isProduction) {
        console.log("=== JWT Callback ===")
        console.log("Token before:", { id: token.id, email: token.email, sub: token.sub })
        console.log("User:", user ? { id: user.id, email: user.email } : null)
        console.log("Account provider:", account?.provider)
      }

      // Initial sign in - user object is available
      if (user) {
        if (!isProduction) console.log("Setting token from user object")
        token.id = user.id
        token.role = user.role
        token.email = user.email
        return token
      }

      // Subsequent requests - token exists but might be missing ID
      if (!token.id && token.email) {
        if (!isProduction) console.log("Token missing ID, looking up by email:", token.email)
        
        try {
          // Use a more robust database query with timeout
          const dbUser = await Promise.race([
            prisma.user.findUnique({
              where: { email: token.email },
              select: { id: true, role: true, email: true }
            }),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Database timeout')), 5000)
            )
          ]) as any
          
          if (dbUser) {
            if (!isProduction) console.log("Found user in DB:", dbUser.id)
            token.id = dbUser.id
            token.role = dbUser.role
          } else {
            if (!isProduction) console.log("User not found in DB for email:", token.email)
          }
        } catch (error) {
          console.error("Error fetching user by email:", error)
          // Don't throw, just continue without ID - will be handled in session callback
        }
      }

      // Final fallback: use sub as ID for OAuth providers
      if (!token.id && token.sub) {
        if (!isProduction) console.log("Using sub as fallback ID:", token.sub)
        token.id = token.sub
      }

      if (!isProduction) {
        console.log("Token after:", { id: token.id, email: token.email, role: token.role })
      }
      
      return token
    },
    
    async session({ session, token }) {
      const isProduction = process.env.NODE_ENV === 'production'
      
      if (!isProduction) {
        console.log("=== Session Callback ===")
        console.log("Token:", { id: token.id, email: token.email, role: token.role, sub: token.sub })
      }
      
      if (session.user) {
        // Primary: use token.id
        let userId = token.id as string
        
        // Fallback 1: use token.sub (for OAuth)
        if (!userId && token.sub) {
          userId = token.sub as string
        }
        
        // Fallback 2: look up by email if we still don't have ID
        if (!userId && token.email) {
          if (!isProduction) console.log("Session: Looking up user by email")
          
          try {
            const dbUser = await Promise.race([
              prisma.user.findUnique({
                where: { email: token.email },
                select: { id: true, role: true }
              }),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Database timeout')), 3000)
              )
            ]) as any
            
            if (dbUser) {
              userId = dbUser.id
              // Update token for next time
              token.id = dbUser.id
              token.role = dbUser.role
            }
          } catch (error) {
            console.error("Session: Error fetching user:", error)
            // Continue without userId - will cause issues but won't crash
          }
        }

        session.user.id = userId
        session.user.role = (token.role as string) || 'USER'
        session.user.email = token.email as string
        
        if (!isProduction) {
          console.log("Final session user:", {
            id: session.user.id,
            email: session.user.email,
            role: session.user.role
          })
        }
      }
      
      return session
    },

    async signIn({ user, account, profile }) {
      const isProduction = process.env.NODE_ENV === 'production'
      
      if (!isProduction) {
        console.log("=== SignIn Callback ===")
        console.log("User:", { id: user.id, email: user.email })
        console.log("Account:", account?.provider)
      }
      
      // For OAuth providers, ensure user exists and is properly set up
      if (account?.provider === "google" && user.email) {
        try {
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email }
          })
          
          if (!existingUser) {
            if (!isProduction) console.log("New OAuth user will be created by PrismaAdapter")
          } else {
            if (!isProduction) console.log("OAuth user exists:", existingUser.id)
            // Update user object to ensure consistency
            user.id = existingUser.id
          }
        } catch (error) {
          console.error("SignIn callback error:", error)
          // Don't prevent signin, just log the error
        }
      }
      
      return true
    }
  },
  pages: {
    signIn: "/auth/signin",
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
  
  // Add production-specific configurations
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
      },
    },
  },
}
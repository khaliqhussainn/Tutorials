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
    async jwt({ token, user, account, trigger }) {
      const isProduction = process.env.NODE_ENV === 'production'
      
      if (!isProduction) {
        console.log("=== JWT Callback ===")
        console.log("Token before:", { id: token.id, email: token.email, sub: token.sub })
        console.log("User:", user ? { id: user.id, email: user.email } : null)
        console.log("Account provider:", account?.provider)
        console.log("Trigger:", trigger)
      }

      // Initial sign in - user object is available
      if (user) {
        if (!isProduction) console.log("Setting token from user object")
        token.id = user.id
        token.role = user.role
        token.email = user.email
        return token
      }

      // Subsequent requests - ensure we have user ID
      if (!token.id && token.email) {
        if (!isProduction) console.log("Token missing ID, looking up by email:", token.email)
        
        try {
          // Add timeout and retry logic for production
          const dbUser = await Promise.race([
            prisma.user.findUnique({
              where: { email: token.email },
              select: { id: true, role: true, email: true }
            }),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Database timeout')), 8000)
            )
          ]) as any
          
          if (dbUser) {
            if (!isProduction) console.log("Found user in DB:", dbUser.id)
            token.id = dbUser.id
            token.role = dbUser.role
          } else {
            console.warn("User not found in DB for email:", token.email)
          }
        } catch (error) {
          console.error("Error fetching user by email:", error)
          // In production, don't throw - continue with limited token
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
        // Ensure we have a user ID
        let userId = token.id as string
        
        // Fallback to sub if no ID
        if (!userId && token.sub) {
          userId = token.sub as string
        }
        
        // Last resort: lookup by email (with caching)
        if (!userId && token.email && session.user.email) {
          try {
            // Add shorter timeout for session callback
            const dbUser = await Promise.race([
              prisma.user.findUnique({
                where: { email: session.user.email },
                select: { id: true, role: true }
              }),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Database timeout')), 5000)
              )
            ]) as any
            
            if (dbUser) {
              userId = dbUser.id
              // Update token for future requests
              token.id = dbUser.id
              token.role = dbUser.role
            }
          } catch (error) {
            console.error("Session: Error fetching user:", error)
            // Continue with whatever we have
          }
        }

        // Set session data
        session.user.id = userId
        session.user.role = (token.role as string) || 'USER'
        session.user.email = token.email as string || session.user.email
        
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
      
      // Enhanced OAuth handling
      if (account?.provider === "google" && user.email) {
        try {
          // Check if user exists
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email },
            select: { id: true, name: true, image: true }
          })
          
          if (existingUser) {
            // Update user ID to ensure consistency
            user.id = existingUser.id
            
            // Update profile information if needed
            if (!existingUser.name && user.name) {
              await prisma.user.update({
                where: { id: existingUser.id },
                data: { 
                  name: user.name,
                  image: user.image 
                }
              })
            }
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
    error: "/auth/error",
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
  
  // Production-specific configurations
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
        maxAge: 30 * 24 * 60 * 60, // 30 days
      },
    },
    callbackUrl: {
      name: process.env.NODE_ENV === "production" 
        ? "__Secure-next-auth.callback-url" 
        : "next-auth.callback-url",
      options: {
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
    csrfToken: {
      name: process.env.NODE_ENV === "production" 
        ? "__Host-next-auth.csrf-token" 
        : "next-auth.csrf-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  
  // Add production events for debugging
  events: {
    async signIn(message) {
      if (process.env.NODE_ENV === 'production') {
        console.log("✅ SignIn event:", {
          user: message.user.email,
          account: message.account?.provider
        })
      }
    },
    async signOut(message) {
      if (process.env.NODE_ENV === 'production') {
        console.log("👋 SignOut event:", message.token?.email)
      }
    },
    async session(message) {
      // Only log errors in production to avoid spam
      if (process.env.NODE_ENV === 'production' && !message.session?.user?.id) {
        console.error("⚠️ Session missing user ID:", message.session?.user?.email)
      }
    }
  }
}
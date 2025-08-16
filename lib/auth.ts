// lib/auth.ts - COMPLETELY FIXED VERSION
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

          // Return user data for NextAuth (this is crucial)
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
    async jwt({ token, user, account, profile }) {
      console.log("=== JWT Callback ===")
      console.log("Token before:", { id: token.id, email: token.email, sub: token.sub })
      console.log("User:", user ? { id: user.id, email: user.email } : null)
      console.log("Account provider:", account?.provider)

      // Initial sign in
      if (user) {
        console.log("Setting token from user object")
        token.id = user.id
        token.role = user.role
        token.email = user.email
      }

      // Handle cases where token.id might be missing but we have email
      if (!token.id && token.email) {
        console.log("Token missing ID, looking up by email:", token.email)
        try {
          const dbUser = await prisma.user.findUnique({
            where: { email: token.email },
            select: { id: true, role: true, email: true }
          })
          
          if (dbUser) {
            console.log("Found user in DB:", dbUser.id)
            token.id = dbUser.id
            token.role = dbUser.role
          } else {
            console.log("User not found in DB for email:", token.email)
          }
        } catch (error) {
          console.error("Error fetching user by email:", error)
        }
      }

      // Fallback: use sub as ID if still no ID (for OAuth providers)
      if (!token.id && token.sub) {
        console.log("Using sub as fallback ID:", token.sub)
        token.id = token.sub
      }

      console.log("Token after:", { id: token.id, email: token.email, role: token.role })
      return token
    },
    
    async session({ session, token }) {
      console.log("=== Session Callback ===")
      console.log("Token:", { id: token.id, email: token.email, role: token.role, sub: token.sub })
      
      // Ensure we have user data in session
      if (session.user) {
        // Use token.id, fallback to token.sub, fallback to looking up by email
        let userId = token.id as string || token.sub as string

        // If we still don't have an ID but have email, look it up
        if (!userId && token.email) {
          console.log("Session: Looking up user by email")
          try {
            const dbUser = await prisma.user.findUnique({
              where: { email: token.email },
              select: { id: true, role: true }
            })
            if (dbUser) {
              userId = dbUser.id
              token.role = dbUser.role // Update token too
            }
          } catch (error) {
            console.error("Session: Error fetching user:", error)
          }
        }

        session.user.id = userId
        session.user.role = token.role as string
        session.user.email = token.email as string
        
        console.log("Final session user:", {
          id: session.user.id,
          email: session.user.email,
          role: session.user.role
        })
      }
      
      return session
    },

    async signIn({ user, account, profile }) {
      console.log("=== SignIn Callback ===")
      console.log("User:", user)
      console.log("Account:", account?.provider)
      
      // For OAuth providers, ensure user exists in database
      if (account?.provider === "google" && user.email) {
        try {
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email }
          })
          
          if (!existingUser) {
            console.log("Creating new OAuth user")
            // User will be created by PrismaAdapter, but we can log it
          } else {
            console.log("OAuth user exists:", existingUser.id)
          }
        } catch (error) {
          console.error("SignIn callback error:", error)
        }
      }
      
      return true
    }
  },
  pages: {
    signIn: "/auth/signin",
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development", // Enable debug logs in development
}
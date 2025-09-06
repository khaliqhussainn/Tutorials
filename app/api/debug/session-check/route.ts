// Create this debug API route to check what's happening
// app/api/debug/session-check/route.ts

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { NextResponse } from "next/server"
import { headers, cookies } from "next/headers"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    const headersList = headers()
    const cookieStore = cookies()
    
    // Get all cookies
    const allCookies = cookieStore.getAll()
    const sessionCookie = cookieStore.get('next-auth.session-token') || 
                         cookieStore.get('__Secure-next-auth.session-token')

    const debugInfo = {
      timestamp: new Date().toISOString(),
      session: {
        exists: !!session,
        user: session?.user ? {
          id: session.user.id,
          email: session.user.email,
          role: session.user.role,
          name: session.user.name
        } : null
      },
      cookies: {
        sessionCookieExists: !!sessionCookie,
        sessionCookieName: sessionCookie?.name,
        sessionCookieValue: sessionCookie?.value?.slice(0, 20) + '...',
        totalCookies: allCookies.length,
        allCookieNames: allCookies.map(c => c.name)
      },
      headers: {
        userAgent: headersList.get('user-agent')?.slice(0, 100),
        referer: headersList.get('referer'),
        host: headersList.get('host'),
        authorization: headersList.get('authorization') ? 'Present' : 'Missing'
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
        nextAuthUrl: process.env.NEXTAUTH_URL,
        hasDatabaseUrl: !!process.env.DATABASE_URL
      }
    }

    return NextResponse.json(debugInfo, { status: 200 })

  } catch (error) {
    console.error('Debug session check error:', error)
    return NextResponse.json({
      error: 'Failed to check session',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
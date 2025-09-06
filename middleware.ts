// middleware.ts - MINIMAL VERSION TO STOP REDIRECT LOOPS
import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl
    const token = req.nextauth.token
    
    // Only log in production for debugging
    if (process.env.NODE_ENV === 'production') {
      console.log("🔍 Middleware:", {
        pathname,
        hasToken: !!token,
        role: token?.role,
        isAdmin: token?.role === 'ADMIN'
      })
    }

    // ONLY protect admin routes - nothing else
    if (pathname.startsWith('/admin')) {
      if (!token || token.role !== 'ADMIN') {
        console.log("❌ Admin access denied")
        // Use absolute URL to prevent redirect loops
        const signInUrl = new URL('/auth/signin', req.url)
        signInUrl.searchParams.set('callbackUrl', req.url)
        return NextResponse.redirect(signInUrl)
      }
      console.log("✅ Admin access granted")
    }

    // Allow everything else
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl
        
        // CRITICAL: Only block admin routes, allow everything else
        if (pathname.startsWith('/admin')) {
          return !!token && token.role === 'ADMIN'
        }
        
        // Allow all other requests - no authentication required
        return true
      },
    },
  }
)

// CRITICAL: Only match admin routes to prevent interference
export const config = {
  matcher: [
    '/admin/:path*'
  ],
}
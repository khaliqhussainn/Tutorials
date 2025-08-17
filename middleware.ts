// middleware.ts - UPDATED VERSION
import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl
    const token = req.nextauth.token
    
    // Production debugging
    if (process.env.NODE_ENV === 'production') {
      console.log("🔒 Middleware:", {
        pathname,
        hasToken: !!token,
        userEmail: token?.email,
        userId: token?.id,
        role: token?.role
      })
    }

    // Admin routes
    if (pathname.startsWith('/admin')) {
      if (!token || token.role !== 'ADMIN') {
        console.log("❌ Admin access denied for:", token?.email || 'anonymous')
        const url = new URL('/auth/signin', req.url)
        url.searchParams.set('callbackUrl', pathname)
        url.searchParams.set('error', 'AdminRequired')
        return NextResponse.redirect(url)
      }
    }

    // Video pages - require authentication and valid session
    if (pathname.includes('/course/') && pathname.includes('/video/')) {
      if (!token) {
        console.log("❌ Video access denied - no token")
        const url = new URL('/auth/signin', req.url)
        url.searchParams.set('callbackUrl', pathname)
        return NextResponse.redirect(url)
      }

      // Check for valid session data
      if (!token.email && !token.id) {
        console.log("❌ Video access denied - invalid token")
        const url = new URL('/auth/signin', req.url)
        url.searchParams.set('callbackUrl', pathname)
        url.searchParams.set('error', 'SessionRequired')
        return NextResponse.redirect(url)
      }
    }

    // Dashboard - require authentication
    if (pathname.startsWith('/dashboard')) {
      if (!token) {
        console.log("❌ Dashboard access denied - no token")
        const url = new URL('/auth/signin', req.url)
        url.searchParams.set('callbackUrl', pathname)
        return NextResponse.redirect(url)
      }

      // Check for valid session data
      if (!token.email && !token.id) {
        console.log("❌ Dashboard access denied - invalid token")
        const url = new URL('/auth/signin', req.url)
        url.searchParams.set('callbackUrl', pathname)
        url.searchParams.set('error', 'SessionRequired')
        return NextResponse.redirect(url)
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl
        
        // For protected routes, we need a valid token
        if (
          pathname.startsWith('/admin') ||
          pathname.startsWith('/dashboard') ||
          (pathname.includes('/course/') && pathname.includes('/video/'))
        ) {
          // Let the middleware function handle the detailed checks
          return true
        }

        // For all other routes, allow access
        return true
      },
    },
  }
)

export const config = {
  matcher: [
    '/admin/:path*',
    '/course/:path*/video/:path*',
    '/dashboard/:path*'
  ]
}
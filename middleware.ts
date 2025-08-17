// middleware.ts - SIMPLIFIED FINAL VERSION
import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl
    const token = req.nextauth.token
    
    console.log("🔒 Middleware:", {
      pathname,
      hasToken: !!token,
      userEmail: token?.email
    })

    // Admin routes only
    if (pathname.startsWith('/admin')) {
      if (!token || token.role !== 'ADMIN') {
        console.log("❌ Admin access denied")
        return NextResponse.redirect(new URL('/auth/signin', req.url))
      }
    }

    // Protected user pages - require authentication
    if (
      pathname.startsWith('/dashboard') || 
      pathname.startsWith('/profile') || 
      pathname.startsWith('/favorites') ||
      (pathname.includes('/course/') && pathname.includes('/video/'))
    ) {
      if (!token) {
        console.log("❌ Protected page access denied:", pathname)
        const url = new URL('/auth/signin', req.url)
        url.searchParams.set('callbackUrl', pathname)
        return NextResponse.redirect(url)
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl
        
        // Allow access to public pages
        if (
          pathname === '/' ||
          pathname.startsWith('/courses') ||
          pathname.startsWith('/auth/') ||
          pathname.startsWith('/api/auth/')
        ) {
          return true
        }

        // For protected routes, require authentication
        if (
          pathname.startsWith('/admin') ||
          pathname.startsWith('/dashboard') ||
          pathname.startsWith('/profile') ||
          pathname.startsWith('/favorites') ||
          (pathname.includes('/course/') && pathname.includes('/video/'))
        ) {
          return !!token
        }

        // Default: allow access
        return true
      },
    },
  }
)

export const config = {
  matcher: [
    '/admin/:path*',
    '/dashboard/:path*',
    '/profile/:path*',
    '/favorites/:path*',
    '/course/:path*/video/:path*'
  ]
}
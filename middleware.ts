// middleware.ts - SIMPLIFIED PERMISSIVE VERSION
import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl
    const token = req.nextauth.token
    
    console.log("🔍 Middleware:", {
      pathname,
      hasToken: !!token,
      email: token?.email,
      role: token?.role,
      cookies: Object.keys(req.cookies.getAll().reduce((acc, cookie) => {
        acc[cookie.name] = cookie.value
        return acc
      }, {} as Record<string, string>))
    })

    // Only protect admin routes - be very specific
    if (pathname.startsWith('/admin')) {
      if (!token) {
        console.log("❌ No token for admin route")
        const url = new URL('/auth/signin', req.url)
        url.searchParams.set('callbackUrl', req.url)
        return NextResponse.redirect(url)
      }
      
      if (token.role !== 'ADMIN') {
        console.log("❌ Non-admin role for admin route:", token.role)
        return NextResponse.redirect(new URL('/', req.url))
      }
      
      console.log("✅ Admin access granted")
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl
        
        // Be very permissive - only check admin routes strictly
        if (pathname.startsWith('/admin')) {
          return !!token && token.role === 'ADMIN'
        }
        
        // Allow everything else through
        // Let the pages handle their own auth checks
        return true
      },
    },
    // Add pages configuration to avoid redirect loops
    pages: {
      signIn: '/auth/signin',
      error: '/auth/error',
    }
  }
)

export const config = {
  // Be more specific about what to match
  matcher: [
    '/admin/:path*',
    '/dashboard/:path*',
    '/profile/:path*',
    '/favorites/:path*'
  ],
}
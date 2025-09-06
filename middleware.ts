// middleware.ts - FIXED VERSION
import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl
    const token = req.nextauth.token
    
    console.log("🔍 Middleware:", {
      pathname,
      hasToken: !!token,
      tokenId: token?.id,
      tokenRole: token?.role,
      userAgent: req.headers.get('user-agent')?.slice(0, 30)
    })

    // Admin routes protection
    if (pathname.startsWith('/admin')) {
      if (!token || !token.id || token.role !== 'ADMIN') {
        console.log("❌ Admin access denied:", { hasToken: !!token, hasId: !!token?.id, role: token?.role })
        const signInUrl = new URL('/auth/signin', req.url)
        signInUrl.searchParams.set('callbackUrl', req.url)
        return NextResponse.redirect(signInUrl)
      }
      console.log("✅ Admin access granted")
    }

    // Protected routes (dashboard, profile, etc.)
    const protectedRoutes = ['/dashboard', '/profile', '/favorites']
    const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
    
    if (isProtectedRoute) {
      if (!token || !token.id) {
        console.log("❌ Protected route access denied:", { hasToken: !!token, hasId: !!token?.id })
        const signInUrl = new URL('/auth/signin', req.url)
        signInUrl.searchParams.set('callbackUrl', req.url)
        return NextResponse.redirect(signInUrl)
      }
      console.log("✅ Protected route access granted")
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl
        
        // Admin routes - strict check
        if (pathname.startsWith('/admin')) {
          return !!token && !!token.id && token.role === 'ADMIN'
        }

        // Protected routes - basic auth check
        const protectedRoutes = ['/dashboard', '/profile', '/favorites']
        const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
        
        if (isProtectedRoute) {
          return !!token && !!token.id
        }

        // Allow all other requests
        return true
      },
    },
    pages: {
      signIn: '/auth/signin',
    }
  }
)

export const config = {
  matcher: [
    // Match protected routes but exclude auth pages and API routes
    '/((?!api/auth|auth/signin|auth/signup|auth/error|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|css|js)$).*)',
  ],
}
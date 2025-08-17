// middleware.ts - PRODUCTION ROBUST VERSION
import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl
    const token = req.nextauth.token
    
    // More detailed logging for production debugging
    if (process.env.NODE_ENV === 'production') {
      console.log("🔒 Middleware Check:", {
        pathname,
        hasToken: !!token,
        tokenEmail: token?.email,
        tokenId: token?.id,
        tokenSub: token?.sub,
        cookies: req.cookies.getAll().map(c => c.name),
      })
    }

    // Admin routes protection
    if (pathname.startsWith('/admin')) {
      if (!token || token.role !== 'ADMIN') {
        console.log("❌ Admin access denied")
        return NextResponse.redirect(new URL('/auth/signin', req.url))
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl
        
        // More permissive approach - let most requests through
        // and handle auth at the page level for better reliability
        
        // Only block admin routes at middleware level
        if (pathname.startsWith('/admin')) {
          const isAuthorized = !!token && token.role === 'ADMIN'
          console.log("Admin auth check:", { hasToken: !!token, role: token?.role, authorized: isAuthorized })
          return isAuthorized
        }

        // For all other protected routes, be more permissive
        // Let the page components handle the detailed auth checks
        if (
          pathname.startsWith('/dashboard') ||
          pathname.startsWith('/profile') ||
          pathname.startsWith('/favorites') ||
          (pathname.includes('/course/') && pathname.includes('/video/'))
        ) {
          // Check if we have any form of authentication indicator
          const hasAuth = !!(
            token?.email || 
            token?.id || 
            token?.sub ||
            req.cookies.get('next-auth.session-token') ||
            req.cookies.get('__Secure-next-auth.session-token')
          )
          
          console.log("Protected route auth check:", { 
            pathname, 
            hasAuth, 
            hasToken: !!token,
            hasCookie: !!(req.cookies.get('next-auth.session-token') || req.cookies.get('__Secure-next-auth.session-token'))
          })
          
          return hasAuth
        }

        // Allow all other requests
        return true
      },
    },
  }
)

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (NextAuth API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)  
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|css|js)$).*)',
  ],
}
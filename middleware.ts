// middleware.ts - FIXED PRODUCTION VERSION
import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl
    const token = req.nextauth.token
    
    console.log("🔒 Middleware Check:", {
      pathname,
      hasToken: !!token,
      tokenEmail: token?.email,
      tokenId: token?.id,
      tokenRole: token?.role,
      userAgent: req.headers.get('user-agent')?.slice(0, 50)
    })

    // Admin routes protection - FIXED: More robust check
    if (pathname.startsWith('/admin')) {
      if (!token) {
        console.log("❌ Admin access denied - No token")
        const signInUrl = new URL('/auth/signin', req.url)
        signInUrl.searchParams.set('callbackUrl', req.url)
        return NextResponse.redirect(signInUrl)
      }
      
      if (token.role !== 'ADMIN') {
        console.log("❌ Admin access denied - Role:", token.role, "Required: ADMIN")
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
        
        console.log("Authorization check:", { 
          pathname, 
          hasToken: !!token,
          tokenId: token?.id,
          tokenRole: token?.role
        })
        
        // Admin routes - strict check
        if (pathname.startsWith('/admin')) {
          const isAuthorized = !!token && token.role === 'ADMIN'
          console.log("Admin authorization:", { 
            hasToken: !!token, 
            role: token?.role, 
            authorized: isAuthorized 
          })
          return isAuthorized
        }

        // Other protected routes - more lenient
        const protectedRoutes = [
          '/dashboard',
          '/profile',
          '/favorites'
        ]
        
        const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
        
        if (isProtectedRoute) {
          const isAuthorized = !!token && !!(token.email || token.id)
          console.log("Protected route authorization:", { 
            pathname,
            hasToken: !!token,
            hasEmail: !!token?.email,
            hasId: !!token?.id,
            authorized: isAuthorized 
          })
          return isAuthorized
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
     * Match all request paths except:
     * - api/auth (NextAuth API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)  
     * - favicon.ico (favicon file)
     * - public assets
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|css|js)$).*)',
  ],
}
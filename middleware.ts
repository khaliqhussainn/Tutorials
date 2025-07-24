import { withAuth } from "next-auth/middleware"

export default withAuth(
  function middleware(req) {
    // Add custom middleware logic here
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl
        
        // Admin routes
        if (pathname.startsWith('/admin')) {
          return token?.role === 'ADMIN'
        }
        
        // Protected course content
        if (pathname.includes('/course/') && pathname.includes('/video/')) {
          return !!token
        }
        
        return true
      },
    },
  }
)

export const config = {
  matcher: ['/admin/:path*', '/course/:path*/video/:path*', '/dashboard/:path*']
}
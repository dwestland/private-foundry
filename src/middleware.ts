import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Check for the session cookie
  const sessionToken =
    request.cookies.get('authjs.session-token')?.value ||
    request.cookies.get('__Secure-authjs.session-token')?.value

  // Define the routes to protect.
  const protectedRoutes = ['/user-info', '/test']

  // Check if the current request matches any of the protected routes.
  const isProtected = protectedRoutes.some(
    (route) => request.nextUrl.pathname === route
  )

  // No session found for a protected route, redirecting to Sign-In
  if (isProtected && !sessionToken) {
    const signInUrl = new URL('/auth/signin', request.url)
    return NextResponse.redirect(signInUrl)
  }

  return NextResponse.next()
}

// Executes middleware on all routes except api and trpc
export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
}

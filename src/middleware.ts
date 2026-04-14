import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/pricing(.*)',
  '/api/webhooks(.*)',
])

export default clerkMiddleware(async (auth, request) => {
  const { pathname } = request.nextUrl

  try {
    const { userId } = await auth()

    // Redirect logged-in users away from auth pages
    if (userId && (pathname.startsWith('/sign-in') || pathname.startsWith('/sign-up'))) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // Protect non-public routes
    if (!isPublicRoute(request) && !userId) {
      return NextResponse.redirect(new URL('/sign-in', request.url))
    }
  } catch (error) {
    console.error('AUTH MIDDLEWARE ERROR:', error)
    throw error
  }
})

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

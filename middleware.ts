import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  
  // Public routes - no authentication required
  const publicRoutes = ['/', '/api/health', '/api/auth/callback']
  if (publicRoutes.some(route => pathname === route || pathname.startsWith(route + '/'))) {
    return NextResponse.next()
  }
  
  // Create Supabase client for middleware
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Cookies will be set on the response by NextResponse
          cookiesToSet.forEach(({ name, value, options }) => {
            req.cookies.set(name, value)
          })
        },
      },
    }
  )
  
  // Get current session
  const { data: { session }, error } = await supabase.auth.getSession()
  
  // Create a response object for setting cookies
  let res = NextResponse.next()
  
  // Protected teacher routes - require authentication and teacher role
  if (pathname.startsWith('/teacher')) {
    if (!session) {
      // Not authenticated - redirect to home with auth required flag
      const url = req.nextUrl.clone()
      url.pathname = '/'
      url.searchParams.set('auth_required', '1')
      return NextResponse.redirect(url)
    }
    
    // Check if user is a teacher
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()
    
    if (profile?.role !== 'teacher') {
      // User is not a teacher - redirect to adolescent page
      const url = req.nextUrl.clone()
      url.pathname = '/adolescent'
      return NextResponse.redirect(url)
    }
  }
  
  // Adolescent routes - accessible to all (with optional auth)
  if (pathname.startsWith('/adolescent')) {
    // No restrictions - allow access for both authenticated and anonymous users
    // Consent check will be handled in the component itself
  }
  
  // Settings route - require authentication
  if (pathname.startsWith('/settings')) {
    if (!session) {
      const url = req.nextUrl.clone()
      url.pathname = '/'
      url.searchParams.set('auth_required', '1')
      return NextResponse.redirect(url)
    }
  }
  
  return res
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

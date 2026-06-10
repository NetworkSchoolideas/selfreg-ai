import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Public routes - no authentication required
  const publicRoutes = [
    "/",
    "/role-selection",
    "/api/health",
    "/api/auth/callback",
    "/teacher/register",
  ];
  if (publicRoutes.some((route) => pathname === route || pathname.startsWith(route + "/"))) {
    return NextResponse.next();
  }

  // Create Supabase client for middleware
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            req.cookies.set(name, value);
          });
        },
      },
    }
  );

  // Get current session
  const { data: { session }, error } = await supabase.auth.getSession();

  // Create response object
  let res = NextResponse.next();

  // Check if user is authenticated
  if (session) {
    // Get user role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single();

    // If user has no role set, redirect to role selection
    if (!profile || profile.role === null) {
      if (!pathname.startsWith("/role-selection")) {
        const url = req.nextUrl.clone();
        url.pathname = "/role-selection";
        return NextResponse.redirect(url);
      }
    }
  }

  // Protected teacher routes - require authentication and teacher role
  if (pathname.startsWith("/teacher")) {
    if (!session) {
      const url = req.nextUrl.clone();
      url.pathname = "/";
      url.searchParams.set("auth_required", "1");
      return NextResponse.redirect(url);
    }

    // Check if user is a teacher
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single();

    if (!profile || profile.role === null || profile.role === "student") {
      // User doesn't have teacher role - redirect to role selection
      const url = req.nextUrl.clone();
      url.pathname = "/role-selection";
      return NextResponse.redirect(url);
    }
  }

  // Adolescent routes - accessible to all (with optional auth)
  if (pathname.startsWith("/adolescent")) {
    // No restrictions - allow access for both authenticated and anonymous users
  }

  // Settings route - require authentication
  if (pathname.startsWith("/settings")) {
    if (!session) {
      const url = req.nextUrl.clone();
      url.pathname = "/";
      url.searchParams.set("auth_required", "1");
      return NextResponse.redirect(url);
    }
  }

  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

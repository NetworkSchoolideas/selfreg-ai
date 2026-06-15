/**
 * SelfReg AI — Proxy (Next.js 16 middleware replacement)
 *
 * Route protection and auth-based redirects.
 * - Public routes: /, /auth/login, /auth/register, /role-selection, /adolescent, /api/*
 * - Unauthenticated users on protected routes → /auth/login
 * - Authenticated users without role → /role-selection
 * - Teachers on /student/* → /teacher
 * - Students on /teacher/* → /student/dashboard
 * - Preserves ?lang= parameter across all redirects
 */

import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function withLang(url: URL, request: NextRequest): URL {
  const lang = request.nextUrl.searchParams.get("lang");
  if (lang === "en" || lang === "ru") {
    url.searchParams.set("lang", lang);
  }
  return url;
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ── Public routes (no auth required) ──────────────────────────
  const publicRoutes = [
    "/",
    "/auth/login",
    "/auth/register",
    "/role-selection",
    "/adolescent",
    "/api/health",
    "/api/auth/callback",
    "/_next",
  ];
  if (publicRoutes.some((route) => pathname === route || pathname.startsWith(route + "/"))) {
    return NextResponse.next();
  }

  // ── Static files ──────────────────────────────────────────────
  if (pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico|css|js|json)$/)) {
    return NextResponse.next();
  }

  // ── Check Supabase session ────────────────────────────────────
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If Supabase is not configured, allow all routes (mock mode)
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next();
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
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
  });

  const { data: { session } } = await supabase.auth.getSession();

  // ── Unauthenticated → redirect to login ───────────────────────
  if (!session) {
    // API routes without session — allow (they handle auth internally)
    if (pathname.startsWith("/api/")) {
      return NextResponse.next();
    }

    const url = req.nextUrl.clone();
    url.pathname = "/auth/login";
    withLang(url, req);
    return NextResponse.redirect(url);
  }

  // ── Authenticated — check role ────────────────────────────────
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", session.user.id)
    .single();

  const role = profile?.role as string | null | undefined;

  // No role set → redirect to role selection
  if (!role) {
    if (!pathname.startsWith("/role-selection")) {
      const url = req.nextUrl.clone();
      url.pathname = "/role-selection";
      withLang(url, req);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // ── Role-based route enforcement ──────────────────────────────

  // Teacher routes — only for teachers
  if (pathname.startsWith("/teacher")) {
    if (role !== "teacher") {
      // Student trying to access teacher routes → redirect to student dashboard
      const url = req.nextUrl.clone();
      url.pathname = "/student/dashboard";
      withLang(url, req);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // Student routes — only for students
  if (pathname.startsWith("/student")) {
    if (role !== "student") {
      // Teacher trying to access student routes → redirect to teacher dashboard
      const url = req.nextUrl.clone();
      url.pathname = "/teacher";
      withLang(url, req);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // Settings — any authenticated user
  if (pathname.startsWith("/settings")) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
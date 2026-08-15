/**
 * SelfReg AI proxy for route protection and auth redirects.
 *
 * Rules:
 * - Public routes bypass auth checks
 * - API routes stay responsible for their own auth
 * - Local development may open teacher/student prototype routes without auth
 * - Production still requires a real Supabase session
 */

import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { shouldBypassAuthForLocalDev } from "@/lib/proxy-auth";

function withLang(url: URL, request: NextRequest): URL {
  const lang = request.nextUrl.searchParams.get("lang");
  if (lang === "en" || lang === "ru") {
    url.searchParams.set("lang", lang);
  }
  return url;
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const publicRoutes = [
    "/",
    "/auth/login",
    "/auth/register",
    "/auth/callback",
    "/role-selection",
    "/adolescent",
    "/teacher/register",
    "/teacher/register-success",
    "/api/health",
    "/api/auth/callback",
    "/_next",
  ];

  if (publicRoutes.some((route) => pathname === route || pathname.startsWith(route + "/"))) {
    return NextResponse.next();
  }

  if (pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico|css|js|json)$/)) {
    return NextResponse.next();
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request: req });
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          req.cookies.set(name, value);
        });
        response = NextResponse.next({ request: req });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: claimsData,
    error: claimsError,
  } = await supabase.auth.getClaims();
  const userId = typeof claimsData?.claims?.sub === "string" ? claimsData.claims.sub : null;

  if (claimsError || !userId) {
    if (
      shouldBypassAuthForLocalDev({
        pathname,
        hasSession: false,
        nodeEnv: process.env.NODE_ENV,
      })
    ) {
      return NextResponse.next();
    }

    if (pathname.startsWith("/api/")) {
      return NextResponse.next();
    }

    const url = req.nextUrl.clone();
    url.pathname = "/auth/login";
    withLang(url, req);
    return NextResponse.redirect(url);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  const role = profile?.role as string | null | undefined;

  if (!role) {
    if (!pathname.startsWith("/role-selection")) {
      const url = req.nextUrl.clone();
      url.pathname = "/role-selection";
      withLang(url, req);
      return NextResponse.redirect(url);
    }
    return response;
  }

  if (pathname.startsWith("/teacher")) {
    if (role !== "teacher") {
      const url = req.nextUrl.clone();
      url.pathname = "/student/dashboard";
      withLang(url, req);
      return NextResponse.redirect(url);
    }
    return response;
  }

  if (pathname.startsWith("/student")) {
    if (role !== "student") {
      const url = req.nextUrl.clone();
      url.pathname = "/teacher";
      withLang(url, req);
      return NextResponse.redirect(url);
    }
    return response;
  }

  if (pathname.startsWith("/settings")) {
    return response;
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

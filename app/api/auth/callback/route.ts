/**
 * SelfReg AI - Auth Callback
 *
 * Handles OAuth callbacks from Supabase (Google sign-in).
 * - Exchanges auth code for a server-managed session
 * - Persists auth cookies on the redirect response
 * - Upserts user profile with role in the profiles table
 * - Redirects based on role: /teacher or /student/dashboard
 */

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

interface ResponseCookie {
  name: string;
  value: string;
  options?: Record<string, unknown>;
}

function buildRedirectResponse(
  requestUrl: URL,
  pathname: string,
  lang: string,
  extraSearchParams?: Record<string, string>
) {
  const redirectUrl = new URL(pathname, requestUrl.origin);
  redirectUrl.searchParams.set("lang", lang);

  for (const [key, value] of Object.entries(extraSearchParams || {})) {
    redirectUrl.searchParams.set(key, value);
  }

  return NextResponse.redirect(redirectUrl);
}

function copyCookies(source: NextResponse, target: NextResponse) {
  for (const cookie of source.cookies.getAll()) {
    target.cookies.set(cookie);
  }

  return target;
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const error = requestUrl.searchParams.get("error");
  const roleParam = requestUrl.searchParams.get("role");
  const lang = requestUrl.searchParams.get("lang") || "ru";

  if (error) {
    console.error("[Auth Callback] OAuth error:", error);
    return buildRedirectResponse(requestUrl, "/auth/login", lang, { auth: "error" });
  }

  if (!code) {
    return buildRedirectResponse(requestUrl, "/auth/login", lang);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn("[Auth Callback] Supabase not configured");
    return buildRedirectResponse(requestUrl, "/auth/login", lang, { auth: "error" });
  }

  const authResponse = NextResponse.next({ request });
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: ResponseCookie[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          authResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  try {
    const {
      data: { session },
      error: exchangeError,
    } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError || !session) {
      console.error("[Auth Callback] Failed to exchange code:", exchangeError);
      return buildRedirectResponse(requestUrl, "/auth/login", lang, { auth: "error" });
    }

    const userId = session.user.id;
    const userEmail = session.user.email || "";
    const userName =
      session.user.user_metadata?.full_name ||
      session.user.user_metadata?.name ||
      userEmail.split("@")[0];

    let role = roleParam || "student";

    if (!roleParam) {
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .maybeSingle();

      if (existingProfile?.role) {
        role = existingProfile.role;
      }
    }

    const { error: upsertError } = await supabase.from("profiles").upsert(
      {
        id: userId,
        email: userEmail,
        full_name: userName,
        role,
        avatar_url:
          session.user.user_metadata?.avatar_url ||
          session.user.user_metadata?.picture ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=4f46e5&color=fff`,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

    if (upsertError) {
      console.error("[Auth Callback] Failed to upsert profile:", upsertError);
    }

    const redirectPath = role === "teacher" ? "/teacher" : "/student/dashboard";
    return copyCookies(
      authResponse,
      buildRedirectResponse(requestUrl, redirectPath, lang, { auth: "success" })
    );
  } catch (err) {
    console.error("[Auth Callback] Exception:", err);
    return buildRedirectResponse(requestUrl, "/auth/login", lang, { auth: "error" });
  }
}

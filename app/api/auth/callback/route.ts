/**
 * SelfReg AI - Auth Callback
 *
 * Handles Supabase auth callbacks (OAuth and email confirmation).
 * - Exchanges auth code or verifies email token for a server-managed session
 * - Persists auth cookies on the redirect response
 * - Upserts user profile with role in the profiles table
 * - Redirects based on role: /teacher or /student/dashboard
 */

import { createServerClient } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { ensureStudentChildForAuthUserInSupabase } from "@/lib/server-storage";

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

function generateTeacherCode(seed: string) {
  const prefix = seed.trim().charAt(0).toUpperCase().replace(/[^A-Z]/, "") || "T";
  return `${prefix}${Date.now().toString().slice(-6)}`;
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const error = requestUrl.searchParams.get("error");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const otpType = requestUrl.searchParams.get("type") as EmailOtpType | null;
  const roleParam = requestUrl.searchParams.get("role");
  const lang = requestUrl.searchParams.get("lang") || "ru";

  if (error) {
    console.error("[Auth Callback] OAuth error:", error);
    return buildRedirectResponse(requestUrl, "/auth/login", lang, { auth: "error" });
  }

  if (!code && !(tokenHash && otpType)) {
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
    const authResult = code
      ? await supabase.auth.exchangeCodeForSession(code)
      : await supabase.auth.verifyOtp({
          token_hash: tokenHash!,
          type: otpType!,
        });

    const session = authResult.data.session;
    const authUser = session?.user || authResult.data.user;

    if (authResult.error || !authUser) {
      console.error("[Auth Callback] Failed to finalize auth callback:", authResult.error);
      return buildRedirectResponse(requestUrl, "/auth/login", lang, { auth: "error" });
    }

    const userId = authUser.id;
    const userEmail = authUser.email || "";
    const userName =
      authUser.user_metadata?.full_name ||
      authUser.user_metadata?.name ||
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

    const { data: profileForMetadata } = await supabase
      .from("profiles")
      .select("metadata")
      .eq("id", userId)
      .maybeSingle();

    const existingMetadata =
      profileForMetadata?.metadata &&
      typeof profileForMetadata.metadata === "object" &&
      !Array.isArray(profileForMetadata.metadata)
        ? profileForMetadata.metadata
        : {};

    const userMetadata =
      authUser.user_metadata &&
      typeof authUser.user_metadata === "object" &&
      !Array.isArray(authUser.user_metadata)
        ? authUser.user_metadata
        : {};

    const mergedMetadata: Record<string, unknown> = {
      ...existingMetadata,
    };

    if (typeof userMetadata.school === "string") {
      mergedMetadata.school = userMetadata.school;
    }

    if (typeof userMetadata.teacher_code === "string") {
      mergedMetadata.teacher_code = userMetadata.teacher_code;
    }

    const hadTeacherCode = typeof mergedMetadata.teacher_code === "string" && mergedMetadata.teacher_code.trim();

    if (role === "teacher" && !hadTeacherCode) {
      mergedMetadata.teacher_code = generateTeacherCode(userName || userEmail);
    }

    const { error: upsertError } = await supabase.from("profiles").upsert(
      {
        id: userId,
        email: userEmail,
        full_name: userName,
        role,
        metadata: Object.keys(mergedMetadata).length > 0 ? mergedMetadata : null,
        avatar_url:
          authUser.user_metadata?.avatar_url ||
          authUser.user_metadata?.picture ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=4f46e5&color=fff`,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

    if (upsertError) {
      console.error("[Auth Callback] Failed to upsert profile:", upsertError);
    }

    if (role === "student") {
      await ensureStudentChildForAuthUserInSupabase({
        userId,
        email: userEmail,
        fullName: userName,
      });
    }

    const generatedTeacherCode =
      role === "teacher" && !hadTeacherCode && typeof mergedMetadata.teacher_code === "string"
        ? mergedMetadata.teacher_code
        : null;

    const redirectPath = generatedTeacherCode ? "/teacher/register-success" : role === "teacher" ? "/teacher" : "/student/dashboard";
    const redirectParams: Record<string, string> = generatedTeacherCode
      ? { auth: "success", teacherCode: generatedTeacherCode, next: "dashboard" }
      : { auth: "success" };

    return copyCookies(
      authResponse,
      buildRedirectResponse(requestUrl, redirectPath, lang, redirectParams)
    );
  } catch (err) {
    console.error("[Auth Callback] Exception:", err);
    return buildRedirectResponse(requestUrl, "/auth/login", lang, { auth: "error" });
  }
}

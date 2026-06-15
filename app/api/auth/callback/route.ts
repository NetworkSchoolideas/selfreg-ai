/**
 * SelfReg AI — Auth Callback
 *
 * Handles OAuth callbacks from Supabase (Google sign-in).
 * - Exchanges auth code for session
 * - Reads ?role parameter from redirect URL
 * - Upserts user profile with role in the profiles table
 * - Redirects based on role: /teacher or /student/dashboard
 */

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const error = requestUrl.searchParams.get("error");
  const roleParam = requestUrl.searchParams.get("role"); // "teacher" | "student" | null
  const lang = requestUrl.searchParams.get("lang") || "ru";

  if (error) {
    console.error("[Auth Callback] OAuth error:", error);
    return NextResponse.redirect(`${requestUrl.origin}/auth/login?lang=${lang}&auth=error`);
  }

  if (code) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn("[Auth Callback] Supabase not configured");
      return NextResponse.redirect(`${requestUrl.origin}/auth/login?lang=${lang}&auth=error`);
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    try {
      // Exchange code for session
      const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code);

      if (error || !session) {
        console.error("[Auth Callback] Failed to exchange code:", error);
        return NextResponse.redirect(`${requestUrl.origin}/auth/login?lang=${lang}&auth=error`);
      }

      const userId = session.user.id;
      const userEmail = session.user.email || "";
      const userName = session.user.user_metadata?.full_name ||
                       session.user.user_metadata?.name ||
                       userEmail.split("@")[0];

      // Determine role: from URL param > localStorage fallback > existing profile > default "student"
      let role = roleParam || "student";

      // If no role in URL, try to read from localStorage (passed via redirect state)
      // This is a best-effort approach — the role will be set in profiles table
      if (!roleParam) {
        // Check if user already has a profile
        const { data: existingProfile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", userId)
          .single();

        if (existingProfile?.role) {
          role = existingProfile.role;
        }
      }

      // Upsert profile with role
      const { error: upsertError } = await supabase
        .from("profiles")
        .upsert({
          id: userId,
          email: userEmail,
          full_name: userName,
          role: role,
          avatar_url: session.user.user_metadata?.avatar_url ||
                      session.user.user_metadata?.picture ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=4f46e5&color=fff`,
          updated_at: new Date().toISOString(),
        }, { onConflict: "id" });

      if (upsertError) {
        console.error("[Auth Callback] Failed to upsert profile:", upsertError);
      }

      // Redirect based on role
      if (role === "teacher") {
        return NextResponse.redirect(`${requestUrl.origin}/teacher?lang=${lang}&auth=success`);
      } else {
        return NextResponse.redirect(`${requestUrl.origin}/student/dashboard?lang=${lang}&auth=success`);
      }
    } catch (err) {
      console.error("[Auth Callback] Exception:", err);
      return NextResponse.redirect(`${requestUrl.origin}/auth/login?lang=${lang}&auth=error`);
    }
  }

  // No code — redirect to login
  return NextResponse.redirect(`${requestUrl.origin}/auth/login?lang=${lang}`);
}

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// This route handles OAuth callbacks from Supabase
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const error = requestUrl.searchParams.get("error");

  if (error) {
    console.error("[Auth Callback] OAuth error:", error);
    return NextResponse.redirect(`${requestUrl.origin}/?auth=error`);
  }

  if (code) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn("[Auth Callback] Supabase not configured");
      return NextResponse.redirect(`${requestUrl.origin}/?auth=error`);
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    try {
      // Exchange code for session
      const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code);

      if (error || !session) {
        console.error("[Auth Callback] Failed to exchange code:", error);
        return NextResponse.redirect(`${requestUrl.origin}/?auth=error`);
      }

      // User is authenticated - redirect based on role
      // We'll check the profile table to determine role
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single();

      const role = profile?.role || "student";

      // Redirect based on role
      if (role === "teacher") {
        return NextResponse.redirect(`${requestUrl.origin}/teacher?auth=success`);
      } else {
        return NextResponse.redirect(`${requestUrl.origin}/adolescent?auth=success`);
      }
    } catch (err) {
      console.error("[Auth Callback] Exception:", err);
      return NextResponse.redirect(`${requestUrl.origin}/?auth=error`);
    }
  }

  // No code - redirect to home
  return NextResponse.redirect(requestUrl.origin);
}

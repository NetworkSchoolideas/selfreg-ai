import { NextResponse } from "next/server";
import { fetchChildrenFromSupabase, computeTeacherAnalytics } from "@/lib/server-storage";
import { serverError } from "@/lib/api-errors";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

async function getCurrentTeacherId(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return null;
    }

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // Read-only in API route
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return null;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    return profile?.role === "teacher" ? user.id : null;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const teacherId = url.searchParams.get("teacherId") || (await getCurrentTeacherId()) || undefined;
    const includeAnalytics = url.searchParams.get("analytics") === "true";

    if (!teacherId) {
      return NextResponse.json({
        ok: true,
        children: [],
        analytics: null,
      });
    }

    const children = await fetchChildrenFromSupabase(teacherId);

    let analytics = null;
    if (includeAnalytics) {
      analytics = await computeTeacherAnalytics(teacherId);
    }

    return NextResponse.json({
      ok: true,
      children,
      analytics,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load teacher data";
    return serverError(message, "TEACHER_DATA_ERROR");
  }
}

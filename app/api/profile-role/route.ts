import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { z } from "zod";
import { clientError, createErrorResponse, serverError } from "@/lib/api-errors";
import { ensureStudentChildForAuthUserInSupabase } from "@/lib/server-storage";

const RolePayload = z.object({
  role: z.enum(["teacher", "student"]),
});

interface ResponseCookie {
  name: string;
  value: string;
  options?: Record<string, unknown>;
}

function generateTeacherCode(seed: string) {
  const prefix = seed.trim().charAt(0).toUpperCase().replace(/[^A-Z]/, "") || "T";
  return `${prefix}${Date.now().toString().slice(-6)}`;
}

function asMetadata(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? { ...(value as Record<string, unknown>) }
    : {};
}

export async function POST(request: Request) {
  try {
    const payload = RolePayload.parse(await request.json());
    const cookieStore = await cookies();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return serverError("Supabase is not configured", "SUPABASE_NOT_CONFIGURED");
    }

    const response = NextResponse.next();
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: ResponseCookie[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return createErrorResponse("Authentication required", 401, "AUTH_REQUIRED");
    }

    const { data: existingProfile, error: existingProfileError } = await supabase
      .from("profiles")
      .select("role, metadata")
      .eq("id", user.id)
      .maybeSingle();

    if (existingProfileError) {
      return serverError(existingProfileError.message, "PROFILE_ROLE_LOOKUP_ERROR");
    }

    const existingRole = existingProfile?.role;
    if (existingRole === "teacher" || existingRole === "student") {
      if (payload.role !== existingRole) {
        return createErrorResponse("Profile role cannot be changed", 409, "PROFILE_ROLE_IMMUTABLE");
      }

      const metadata = asMetadata(existingProfile?.metadata);
      let teacherCode = existingRole === "teacher" && typeof metadata.teacher_code === "string"
        ? metadata.teacher_code
        : null;

      if (existingRole === "teacher" && !teacherCode) {
        teacherCode = generateTeacherCode(user.email || user.id);
        metadata.teacher_code = teacherCode;

        const { error: teacherCodeUpdateError } = await supabase
          .from("profiles")
          .update({ metadata, updated_at: new Date().toISOString() })
          .eq("id", user.id);

        if (teacherCodeUpdateError) {
          return serverError(teacherCodeUpdateError.message, "TEACHER_CODE_SAVE_ERROR");
        }
      }

      return NextResponse.json({
        ok: true,
        role: existingRole,
        nextPath:
          existingRole === "teacher" && teacherCode
            ? `/teacher/register-success?auth=success&teacherCode=${encodeURIComponent(teacherCode)}&next=dashboard`
            : existingRole === "teacher"
              ? "/teacher?auth=success"
              : "/student/dashboard?auth=success",
        teacherCode,
      });
    }

    const metadata = asMetadata(existingProfile?.metadata);
    const fullName =
      typeof user.user_metadata?.full_name === "string"
        ? user.user_metadata.full_name
        : typeof user.user_metadata?.name === "string"
          ? user.user_metadata.name
          : user.email?.split("@")[0] || "";

    if (payload.role === "teacher" && typeof metadata.teacher_code !== "string") {
      metadata.teacher_code = generateTeacherCode(fullName || user.email || user.id);
    }

    const { error: upsertError } = await supabase.from("profiles").upsert(
      {
        id: user.id,
        email: user.email || "",
        full_name: fullName,
        avatar_url:
          user.user_metadata?.avatar_url ||
          user.user_metadata?.picture ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName || "User")}&background=4f46e5&color=fff`,
        role: payload.role,
        metadata: Object.keys(metadata).length > 0 ? metadata : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

    if (upsertError) {
      return serverError(upsertError.message, "PROFILE_ROLE_SAVE_ERROR");
    }

    if (payload.role === "student") {
      await ensureStudentChildForAuthUserInSupabase({
        userId: user.id,
        email: user.email || "",
        fullName,
      });
    }

    const teacherCode = payload.role === "teacher" && typeof metadata.teacher_code === "string"
      ? metadata.teacher_code
      : null;

    return NextResponse.json({
      ok: true,
      role: payload.role,
      nextPath:
        payload.role === "teacher" && teacherCode
          ? `/teacher/register-success?auth=success&teacherCode=${encodeURIComponent(teacherCode)}&next=dashboard`
          : payload.role === "teacher"
            ? "/teacher?auth=success"
            : "/student/dashboard?auth=success",
      teacherCode,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return clientError("Invalid role payload", "VALIDATION_ERROR");
    }

    const message = error instanceof Error ? error.message : "Failed to save role";
    return serverError(message, "PROFILE_ROLE_ERROR");
  }
}

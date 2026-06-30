import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createErrorResponse } from "@/lib/api-errors";

interface TeacherAccessResult {
  teacherId?: string;
  response?: ReturnType<typeof createErrorResponse>;
}

function isE2ETeacherAccessBypassEnabled() {
  return process.env.NODE_ENV !== "production" && process.env.SELFREG_E2E_TEACHER_ACCESS_BYPASS === "1";
}

async function getAuthenticatedTeacherId(): Promise<string | null> {
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
        setAll() {},
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

export async function resolveTeacherAccess(requestedTeacherId?: string | null): Promise<TeacherAccessResult> {
  if (requestedTeacherId && isE2ETeacherAccessBypassEnabled()) {
    return { teacherId: requestedTeacherId };
  }

  const authenticatedTeacherId = await getAuthenticatedTeacherId();

  if (!requestedTeacherId) {
    return { teacherId: authenticatedTeacherId ?? undefined };
  }

  if (authenticatedTeacherId === requestedTeacherId) {
    return { teacherId: requestedTeacherId };
  }

  return {
    response: createErrorResponse("Teacher access denied", 403, "TEACHER_ACCESS_DENIED"),
  };
}

export async function requireTeacherAccess(requestedTeacherId?: string | null): Promise<TeacherAccessResult> {
  const access = await resolveTeacherAccess(requestedTeacherId);
  if (access.teacherId || access.response) {
    return access;
  }

  return {
    response: createErrorResponse("Teacher authentication required", 401, "TEACHER_AUTH_REQUIRED"),
  };
}

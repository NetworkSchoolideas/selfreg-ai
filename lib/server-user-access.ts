import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createErrorResponse, serverError } from "@/lib/api-errors";
import { getSupabaseAdmin, isSupabaseAdminAvailable } from "@/lib/supabase";

export type AppRole = "teacher" | "student";
export type ChildAccessKind = "owner" | "linked-teacher";

export interface ServerUserAccessContext {
  userId: string;
  role: AppRole;
}

export interface ChildAccessContext extends ServerUserAccessContext {
  childId: string;
  accessKind: ChildAccessKind;
}

type AccessFailure = {
  response: ReturnType<typeof createErrorResponse>;
};

type ServerUserAccessResult =
  | { context: ServerUserAccessContext; response?: never }
  | { context?: never; response: ReturnType<typeof createErrorResponse> };

type ChildAccessResult =
  | { context: ChildAccessContext; response?: never }
  | { context?: never; response: ReturnType<typeof createErrorResponse> };

function getServerAuthConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY;

  return { url, key };
}

function isAppRole(value: unknown): value is AppRole {
  return value === "teacher" || value === "student";
}

/**
 * Creates a request-scoped, cookie-backed Supabase client for server routes.
 * This module must only be imported by Route Handlers or other server-only code.
 */
async function getServerAuthClient() {
  const cookieStore = await cookies();
  const { url, key } = getServerAuthConfig();

  if (!url || !key) {
    return null;
  }

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll() {},
    },
  });
}

/**
 * Returns an identity verified by Supabase Auth and a role read from profiles.
 * User metadata and request parameters are deliberately excluded from authorization.
 */
export async function requireServerUserAccess(): Promise<ServerUserAccessResult> {
  try {
    const supabase = await getServerAuthClient();
    if (!supabase) {
      return { response: serverError("Supabase authentication is not configured", "SUPABASE_AUTH_UNAVAILABLE") };
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { response: createErrorResponse("Authentication required", 401, "AUTH_REQUIRED") };
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      return { response: serverError(profileError.message, "PROFILE_LOOKUP_ERROR") };
    }

    if (!isAppRole(profile?.role)) {
      return { response: createErrorResponse("A permitted account role is required", 403, "ROLE_REQUIRED") };
    }

    return { context: { userId: user.id, role: profile.role } };
  } catch {
    return { response: serverError("Unable to verify authenticated user", "AUTH_CONTEXT_ERROR") };
  }
}

export async function requireServerRole(role: AppRole): Promise<ServerUserAccessResult> {
  const access = await requireServerUserAccess();
  if (access.response) {
    return access;
  }

  if (access.context.role !== role) {
    return { response: createErrorResponse("Role access denied", 403, "ROLE_ACCESS_DENIED") };
  }

  return access;
}

async function getChildAccessForContext(
  context: ServerUserAccessContext,
  childId: string,
): Promise<ChildAccessResult> {
  if (!isSupabaseAdminAvailable()) {
    return { response: serverError("Supabase admin client is not configured", "SUPABASE_ADMIN_UNAVAILABLE") };
  }

  const supabaseAdmin: any = getSupabaseAdmin();
  const { data: child, error } = await supabaseAdmin
    .from("children")
    .select("id, user_id, teacher_id")
    .eq("id", childId)
    .maybeSingle();

  if (error) {
    return { response: serverError(error.message, "CHILD_ACCESS_LOOKUP_ERROR") };
  }

  if (!child) {
    return { response: createErrorResponse("Child not found", 404, "CHILD_NOT_FOUND") };
  }

  if (context.role === "student" && child.user_id === context.userId) {
    return { context: { ...context, childId, accessKind: "owner" } };
  }

  if (context.role === "teacher" && child.teacher_id === context.userId) {
    return { context: { ...context, childId, accessKind: "linked-teacher" } };
  }

  return { response: createErrorResponse("Child access denied", 403, "CHILD_ACCESS_DENIED") };
}

export async function requireChildAccess(childId: string): Promise<ChildAccessResult> {
  const access = await requireServerUserAccess();
  if (access.response) {
    return access;
  }

  return getChildAccessForContext(access.context, childId);
}

export async function requireSessionAccess(sessionId: string): Promise<ChildAccessResult | AccessFailure> {
  const access = await requireServerUserAccess();
  if (access.response) {
    return access;
  }

  if (!isSupabaseAdminAvailable()) {
    return { response: serverError("Supabase admin client is not configured", "SUPABASE_ADMIN_UNAVAILABLE") };
  }

  const supabaseAdmin: any = getSupabaseAdmin();
  const { data: session, error } = await supabaseAdmin
    .from("sessions")
    .select("id, child_id")
    .eq("id", sessionId)
    .maybeSingle();

  if (error) {
    return { response: serverError(error.message, "SESSION_ACCESS_LOOKUP_ERROR") };
  }

  if (!session) {
    return { response: createErrorResponse("Session not found", 404, "SESSION_NOT_FOUND") };
  }

  return getChildAccessForContext(access.context, session.child_id);
}

/**
 * Supabase Auth Client
 *
 * Auth reuses the shared browser Supabase client from `lib/supabase` to avoid
 * creating multiple GoTrueClient instances in the same browser context.
 */

import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import type { Json } from "@/types/supabase";

export { supabase };

// Auth types
export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  role: "teacher" | "student";
  metadata?: Record<string, any>;
}

interface AuthProfileOptions {
  role?: UserProfile["role"];
  metadata?: Record<string, unknown>;
  redirectTo?: string;
}

interface ProfileRecord {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserProfile["role"] | null;
  metadata: Json | null;
}

const PENDING_ROLE_KEY = "selfreg_pending_role";

function getStoredPendingRole(): UserProfile["role"] | null {
  if (typeof window === "undefined") {
    return null;
  }

  const role = window.localStorage.getItem(PENDING_ROLE_KEY);
  return role === "teacher" || role === "student" ? role : null;
}

function setStoredPendingRole(role?: UserProfile["role"]) {
  if (typeof window === "undefined" || !role) {
    return;
  }

  window.localStorage.setItem(PENDING_ROLE_KEY, role);
}

function clearStoredPendingRole() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(PENDING_ROLE_KEY);
}

function buildAvatarUrl(fullName?: string | null) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName || "User")}&background=4f46e5&color=fff`;
}

function resolvePreferredRole(
  explicitRole?: UserProfile["role"],
  user?: User
): UserProfile["role"] | null {
  if (explicitRole) {
    return explicitRole;
  }

  const userRole = user?.user_metadata?.preferred_role;
  if (userRole === "teacher" || userRole === "student") {
    return userRole;
  }

  return getStoredPendingRole();
}

function mergeProfileMetadata(
  existingMetadata: Json | null | undefined,
  user: User,
  extraMetadata?: Record<string, unknown>
) {
  const merged: Record<string, unknown> = {};

  if (existingMetadata && typeof existingMetadata === "object" && !Array.isArray(existingMetadata)) {
    Object.assign(merged, existingMetadata);
  }

  if (user.user_metadata?.school && typeof user.user_metadata.school === "string") {
    merged.school = user.user_metadata.school;
  }

  if (user.user_metadata?.teacher_code && typeof user.user_metadata.teacher_code === "string") {
    merged.teacher_code = user.user_metadata.teacher_code;
  }

  if (extraMetadata) {
    Object.assign(merged, extraMetadata);
  }

  return Object.keys(merged).length > 0 ? merged : null;
}

async function ensureUserProfile(user: User, options?: AuthProfileOptions): Promise<UserProfile | null> {
  if (!supabase) {
    return null;
  }

  const resolvedRole = resolvePreferredRole(options?.role, user);
  if (!resolvedRole) {
    return null;
  }

  const { data: existingProfileData, error: existingProfileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  const existingProfile = (existingProfileData ?? null) as ProfileRecord | null;

  if (existingProfileError) {
    console.error("[Supabase] Failed to read profile during bootstrap:", existingProfileError);
  }

  const fullName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : typeof user.user_metadata?.name === "string"
        ? user.user_metadata.name
        : existingProfile?.full_name || user.email?.split("@")[0] || "";

  const avatarUrl =
    typeof user.user_metadata?.avatar_url === "string"
      ? user.user_metadata.avatar_url
      : typeof user.user_metadata?.picture === "string"
        ? user.user_metadata.picture
        : existingProfile?.avatar_url || buildAvatarUrl(fullName);

  const profileRole = existingProfile?.role || resolvedRole;
  const metadata = mergeProfileMetadata(existingProfile?.metadata, user, options?.metadata);

  const profilesTable: any = supabase.from("profiles");
  const { data, error } = await profilesTable
    .upsert(
      {
        id: user.id,
        email: user.email || existingProfile?.email || "",
        full_name: fullName,
        avatar_url: avatarUrl,
        role: profileRole,
        metadata,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    )
    .select()
    .single();

  if (error) {
    console.error("[Supabase] Failed to upsert profile during bootstrap:", error);
    throw error;
  }

  clearStoredPendingRole();
  return data as UserProfile;
}

// Sign in with Google OAuth
export async function signInWithGoogle(options?: {
  redirectTo?: string;
}): Promise<{ error: any } | { data: any }> {
  if (!supabase) {
    console.warn("[Supabase] Auth not available - missing credentials");
    return { error: { message: "Supabase not configured" } };
  }

  const redirectUrl = options?.redirectTo || `${window.location.origin}/auth/callback`;

  return await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: redirectUrl,
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
    },
  });
}

// Sign in with Email/Password
export async function signInWithEmail(email: string, password: string, options?: AuthProfileOptions) {
  if (!supabase) {
    console.warn("[Supabase] Auth not available - missing credentials");
    return { error: { message: "Supabase not configured" } };
  }

  const result = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (result.error || !result.data.user) {
    return result;
  }

  await ensureUserProfile(result.data.user, options);
  return result;
}

// Sign up with Email/Password
export async function signUpWithEmail(
  email: string,
  password: string,
  fullName?: string,
  options?: AuthProfileOptions
) {
  if (!supabase) {
    console.warn("[Supabase] Auth not available - missing credentials");
    return { error: { message: "Supabase not configured" } };
  }

  setStoredPendingRole(options?.role);

  const redirectUrl = options?.redirectTo
    || `${window.location.origin}/auth/callback${options?.role ? `?role=${options.role}` : ""}`;

  const result = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: redirectUrl,
      data: {
        full_name: fullName,
        avatar_url: buildAvatarUrl(fullName),
        preferred_role: options?.role,
        ...options?.metadata,
      },
    },
  });

  if (result.error || !result.data.user || !result.data.session) {
    return result;
  }

  await ensureUserProfile(result.data.user, options);
  return result;
}

// Sign out
export async function signOut() {
  if (!supabase) {
    console.warn("[Supabase] Auth not available - missing credentials");
    return { error: { message: "Supabase not configured" } };
  }

  return await supabase.auth.signOut();
}

// Get current session
export async function getSession() {
  if (!supabase) {
    return { data: { session: null } };
  }

  return await supabase.auth.getSession();
}

// Listen to auth state changes
export function onAuthStateChange(callback: (event: string, session: any) => void) {
  if (!supabase) {
    console.warn("[Supabase] Auth not available - missing credentials");
    return { data: { subscription: null } };
  }

  return supabase.auth.onAuthStateChange((event, session) => {
    console.log("[Supabase] Auth state changed:", event, session?.user?.email);
    callback(event, session);
  });
}

// Get user profile from database
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    console.error("[Supabase] Failed to fetch profile:", error);
    return null;
  }

  return data as UserProfile;
}

// Check if user is teacher
export async function isUserTeacher(userId: string): Promise<boolean> {
  const profile = await getUserProfile(userId);
  return profile?.role === "teacher";
}

export default supabase;

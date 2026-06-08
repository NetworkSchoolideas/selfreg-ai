/**
 * Supabase Auth Client
 * 
 * This module provides a unified interface for Supabase authentication.
 * Handles both OAuth (Google) and traditional email/password authentication.
 */

import { createClient } from "@supabase/supabase-js";

// Check if we have Supabase credentials
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL;
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("[Supabase] Missing environment variables. Auth will be in mock mode.");
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Auth types
export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  role: "teacher" | "student";
  metadata?: Record<string, any>;
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
export async function signInWithEmail(email: string, password: string) {
  if (!supabase) {
    console.warn("[Supabase] Auth not available - missing credentials");
    return { error: { message: "Supabase not configured" } };
  }

  return await supabase.auth.signInWithPassword({
    email,
    password,
  });
}

// Sign up with Email/Password
export async function signUpWithEmail(email: string, password: string, fullName?: string) {
  if (!supabase) {
    console.warn("[Supabase] Auth not available - missing credentials");
    return { error: { message: "Supabase not configured" } };
  }

  return await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
      data: {
        full_name: fullName,
        avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName || "User")}&background=4f46e5&color=fff`,
      },
    },
  });
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

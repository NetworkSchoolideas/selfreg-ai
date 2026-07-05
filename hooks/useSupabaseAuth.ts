/**
 * Supabase Auth Hook
 * 
 * Manages authentication state and provides methods for signing in/out.
 * Handles both Supabase Auth and fallback mock mode.
 */

import { useState, useEffect, useCallback } from "react";
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import { buildAuthCallbackUrl, supabase, signInWithGoogle, signOut, getUserProfile, UserProfile } from "@/lib/supabase-auth";

interface UseSupabaseAuthReturn {
  user: UserProfile | null;
  session: any;
  isLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  isTeacher: boolean;
  isMockMode: boolean;
  error: string | null;
}

export function useSupabaseAuth(): UseSupabaseAuthReturn {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMockMode, setIsMockMode] = useState(false);

  const buildFallbackProfile = (authUser: User): UserProfile => ({
    id: authUser.id,
    email: authUser.email || "",
    full_name:
      typeof authUser.user_metadata?.full_name === "string"
        ? authUser.user_metadata.full_name
        : typeof authUser.user_metadata?.name === "string"
          ? authUser.user_metadata.name
          : authUser.email?.split("@")[0],
    avatar_url:
      typeof authUser.user_metadata?.avatar_url === "string"
        ? authUser.user_metadata.avatar_url
        : typeof authUser.user_metadata?.picture === "string"
          ? authUser.user_metadata.picture
          : undefined,
    role:
      authUser.user_metadata?.preferred_role === "teacher"
        ? "teacher"
        : "student",
    metadata:
      authUser.user_metadata && typeof authUser.user_metadata === "object"
        ? authUser.user_metadata
        : undefined,
  });

  // Check if Supabase is configured and listen to auth state changes
  useEffect(() => {
    const supabaseClient = supabase;

    // Check if Supabase is available
    if (!supabaseClient) {
      console.log("[useSupabaseAuth] Supabase not configured - running in mock mode");
      // Use queueMicrotask to avoid calling setState synchronously in effect
      queueMicrotask(() => {
        setIsMockMode(true);
        setIsLoading(false);
      });
      return;
    }

    const syncAuthenticatedUser = async (session: Session | null) => {
      setSession(session);

      if (!session) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      const {
        data: { user },
      } = await supabaseClient.auth.getUser();

      if (!user) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      const profile = await getUserProfile(user.id);
      setUser(profile || buildFallbackProfile(user));
      setIsLoading(false);
    };

    supabaseClient.auth.getUser().then(({ data: { user } }) => {
      console.log("[useSupabaseAuth] Initial user present:", Boolean(user));

      if (!user) {
        setSession(null);
        setUser(null);
        setIsLoading(false);
        return;
      }

      getUserProfile(user.id).then((profile) => {
        setUser(profile || buildFallbackProfile(user as User));
        setIsLoading(false);
      });
    });

    // Listen for changes
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((
      _event: AuthChangeEvent,
      session: Session | null
    ) => {
      console.log("[useSupabaseAuth] Auth state changed:", _event);
      void syncAuthenticatedUser(session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Sign in with Google
  const handleSignInWithGoogle = useCallback(async () => {
    if (!supabase) {
      console.warn("[useSupabaseAuth] Supabase not available");
      setError("Supabase not configured");
      return;
    }

    try {
      setError(null);
      await signInWithGoogle({
        redirectTo: buildAuthCallbackUrl(),
      });
    } catch (err: any) {
      console.error("[useSupabaseAuth] Sign in error:", err);
      setError(err.message || "Failed to sign in");
    }
  }, []);

  // Sign out
  const handleSignOut = useCallback(async () => {
    try {
      setError(null);
      await signOut();
      setUser(null);
      setSession(null);
    } catch (err: any) {
      console.error("[useSupabaseAuth] Sign out error:", err);
      setError(err.message || "Failed to sign out");
    }
  }, []);

  // Check if user is teacher
  const isTeacher = user?.role === "teacher";

  return {
    user,
    session,
    isLoading,
    signInWithGoogle: handleSignInWithGoogle,
    signOut: handleSignOut,
    isTeacher,
    isMockMode,
    error,
  };
}

export default useSupabaseAuth;

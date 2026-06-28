/**
 * Supabase Auth Hook
 * 
 * Manages authentication state and provides methods for signing in/out.
 * Handles both Supabase Auth and fallback mock mode.
 */

import { useState, useEffect, useCallback } from "react";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { supabase, signInWithGoogle, signOut, getUserProfile, UserProfile } from "@/lib/supabase-auth";

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

  // Check if Supabase is configured and listen to auth state changes
  useEffect(() => {
    // Check if Supabase is available
    if (!supabase) {
      console.log("[useSupabaseAuth] Supabase not configured - running in mock mode");
      // Use queueMicrotask to avoid calling setState synchronously in effect
      queueMicrotask(() => {
        setIsMockMode(true);
        setIsLoading(false);
      });
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }: { data: { session: Session | null } }) => {
      console.log("[useSupabaseAuth] Initial session:", session?.user?.email);
      setSession(session);
      
      if (session?.user) {
        getUserProfile(session.user.id).then((profile) => {
          setUser(profile);
          setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }
    });

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((
      _event: AuthChangeEvent,
      session: Session | null
    ) => {
      console.log("[useSupabaseAuth] Auth state changed:", _event);
      setSession(session);
      
      if (session?.user) {
        getUserProfile(session.user.id).then((profile) => {
          setUser(profile);
          setIsLoading(false);
        });
      } else {
        setUser(null);
        setIsLoading(false);
      }
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
        redirectTo: `${window.location.origin}/auth/callback`,
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

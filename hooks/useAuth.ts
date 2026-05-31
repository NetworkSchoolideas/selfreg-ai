/**
 * Authentication Hook (MVP - Google OAuth with Supabase)
 * 
 * This is a simplified implementation for testing.
 * In production, this will be replaced with full Supabase Auth integration.
 * 
 * Current behavior:
 * - Mock authentication for testing
 * - Stores user in localStorage
 * - Determines role based on email domain (simple heuristic)
 */

import { useState, useEffect, useCallback } from "react";

export interface User {
  id: string;
  email: string;
  name: string;
  role: "teacher" | "student";
  avatar?: string;
}

interface UseAuthReturn {
  user: User | null;
  isLoading: boolean;
  login: () => void;
  logout: () => void;
  isAdmin: boolean;
}

// Simple email domain heuristic for role detection
// In production, this will be managed by Supabase RLS policies
const TEACHER_DOMAINS = ["school.ru", "edu.ru", "teacher.ru"];

function detectRole(email: string): "teacher" | "student" {
  const domain = email.split("@")[1]?.toLowerCase();
  return TEACHER_DOMAINS.includes(domain || "") ? "teacher" : "student";
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user from localStorage on mount
  useEffect(() => {
    let mounted = true;
    
    try {
      const saved = localStorage.getItem("selfreg_user");
      if (saved) {
        const parsed: User = JSON.parse(saved);
        // Use queueMicrotask to avoid calling setState synchronously in effect
        queueMicrotask(() => {
          if (mounted) {
            setUser(parsed);
            setIsLoading(false);
          }
        });
        return;
      }
    } catch (err) {
      console.warn("[useAuth] Failed to load user from localStorage:", err);
    }
    
    queueMicrotask(() => {
      if (mounted) {
        setIsLoading(false);
      }
    });
    
    return () => {
      mounted = false;
    };
  }, []);

  // Mock login (in production: Supabase OAuth)
  const login = useCallback(() => {
    // Simulate OAuth flow
    setIsLoading(true);

    // Mock user data - in production this comes from Supabase
    setTimeout(() => {
      const mockUser: User = {
        id: `user_${Date.now()}`,
        email: "teacher@school.ru", // Change this for testing different roles
        name: "Test Teacher",
        role: detectRole("teacher@school.ru"),
        avatar: "https://ui-avatars.com/api/?name=Test+Teacher&background=4f46e5&color=fff",
      };

      setUser(mockUser);
      localStorage.setItem("selfreg_user", JSON.stringify(mockUser));
      setIsLoading(false);

      console.log("[useAuth] User logged in:", mockUser.email, "-", mockUser.role);
    }, 500);
  }, []);

  // Logout
  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem("selfreg_user");
    console.log("[useAuth] User logged out");
  }, []);

  // Check if user is admin (teacher)
  const isAdmin = user?.role === "teacher";

  return {
    user,
    isLoading,
    login,
    logout,
    isAdmin,
  };
}

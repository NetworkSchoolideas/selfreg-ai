"use client";

import Image from "next/image";
import { useState } from "react";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { EmailAuthModal } from "@/app/components/EmailAuthModal";

interface AuthButtonProps {
  lang: "ru" | "en";
}

export function AuthButton({ lang }: AuthButtonProps) {
  const [showEmailModal, setShowEmailModal] = useState(false);
  const { user, isLoading, signInWithGoogle, signOut, isTeacher, isMockMode } = useSupabaseAuth();

  if (isLoading) {
    return (
      <button className="button secondary" disabled style={{ padding: "6px 12px", fontSize: 13 }}>
        {lang === "en" ? "Loading..." : "Загрузка..."}
      </button>
    );
  }

  if (!user) {
    return (
      <>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            onClick={signInWithGoogle}
            className="button"
            style={{
              padding: "6px 12px",
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
            title={
              isMockMode
                ? lang === "en"
                  ? "Supabase not configured - mock mode"
                  : "Supabase не настроен - тестовый режим"
                : lang === "en"
                ? "Sign in with Google"
                : "Войти через Google"
            }
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            {lang === "en" ? "Sign in" : "Войти"}
            {isMockMode && (
              <span style={{ fontSize: 10, marginLeft: 2 }}>(MVP)</span>
            )}
          </button>
          
          <button
            onClick={() => setShowEmailModal(true)}
            className="button secondary"
            style={{ padding: "6px 10px", fontSize: 13 }}
            title={lang === "en" ? "Sign in with email" : "Вход по email"}
          >
            {lang === "en" ? "Email" : "Email"}
          </button>
        </div>

        <EmailAuthModal
          isOpen={showEmailModal}
          onClose={() => setShowEmailModal(false)}
          lang={lang}
        />
      </>
    );
  }

  // User is logged in - show avatar and logout
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "4px 8px",
          borderRadius: 6,
          background: "var(--soft)",
          border: "1px solid var(--line)",
        }}
      >
        <Image
          src={user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name || "User")}&background=4f46e5&color=fff`}
          alt={user.full_name || "User"}
          width={24}
          height={24}
          unoptimized
          style={{ borderRadius: "50%" }}
        />
        <div style={{ display: "flex", flexDirection: "column", fontSize: 11 }}>
          <strong style={{ fontSize: 12 }}>{user.full_name || user.email}</strong>
          <span className="muted" style={{ fontSize: 10 }}>
            {isTeacher ? (lang === "en" ? "Teacher" : "Педагог") : (lang === "en" ? "Student" : "Ученик")}
          </span>
        </div>
      </div>
      <button
        onClick={signOut}
        className="button secondary"
        style={{ padding: "6px 10px", fontSize: 12 }}
        title={lang === "en" ? "Sign out" : "Выйти"}
      >
        {lang === "en" ? "Logout" : "Выйти"}
      </button>
    </div>
  );
}

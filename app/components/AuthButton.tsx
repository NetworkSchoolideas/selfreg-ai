"use client";

import Image from "next/image";
import { useState } from "react";
import { EmailAuthModal } from "@/app/components/EmailAuthModal";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { isGoogleAuthEnabled } from "@/lib/auth-config";

interface AuthButtonProps {
  lang: "ru" | "en";
}

const ru = {
  loading: "\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430...",
  signIn: "\u0412\u043e\u0439\u0442\u0438",
  signInWithEmail: "\u0412\u0445\u043e\u0434 \u043f\u043e email",
  signInWithGoogle: "\u0412\u043e\u0439\u0442\u0438 \u0447\u0435\u0440\u0435\u0437 Google",
  mockMode: "Supabase \u043d\u0435 \u043d\u0430\u0441\u0442\u0440\u043e\u0435\u043d - \u0442\u0435\u0441\u0442\u043e\u0432\u044b\u0439 \u0440\u0435\u0436\u0438\u043c",
  chooseRole: "\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u0440\u043e\u043b\u044c",
  teacher: "\u041f\u0435\u0434\u0430\u0433\u043e\u0433",
  student: "\u0423\u0447\u0435\u043d\u0438\u043a",
  signOut: "\u0412\u044b\u0439\u0442\u0438",
};

export function AuthButton({ lang }: AuthButtonProps) {
  const [showEmailModal, setShowEmailModal] = useState(false);
  const { user, isLoading, signInWithGoogle, signOut, isTeacher, isMockMode } = useSupabaseAuth();
  const googleAuthEnabled = isGoogleAuthEnabled();

  if (isLoading) {
    return (
      <button className="button secondary" disabled style={{ padding: "6px 12px", fontSize: 13 }}>
        {lang === "en" ? "Loading..." : ru.loading}
      </button>
    );
  }

  if (!user) {
    return (
      <>
        <div style={{ display: "flex", gap: 6 }}>
          {googleAuthEnabled ? (
            <>
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
                      : ru.mockMode
                    : lang === "en"
                      ? "Sign in with Google"
                      : ru.signInWithGoogle
                }
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                {lang === "en" ? "Sign in" : ru.signIn}
              </button>

              <button
                onClick={() => setShowEmailModal(true)}
                className="button secondary"
                style={{ padding: "6px 10px", fontSize: 13 }}
                title={lang === "en" ? "Sign in with email" : ru.signInWithEmail}
              >
                Email
              </button>
            </>
          ) : (
            <button
              onClick={() => setShowEmailModal(true)}
              className="button"
              style={{ padding: "6px 12px", fontSize: 13 }}
              title={lang === "en" ? "Sign in with email" : ru.signInWithEmail}
            >
              {lang === "en" ? "Sign in" : ru.signIn}
            </button>
          )}
        </div>

        <EmailAuthModal
          isOpen={showEmailModal}
          onClose={() => setShowEmailModal(false)}
          lang={lang}
        />
      </>
    );
  }

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
            {user.role === null
              ? (lang === "en" ? "Choose role" : ru.chooseRole)
              : isTeacher
                ? (lang === "en" ? "Teacher" : ru.teacher)
                : (lang === "en" ? "Student" : ru.student)}
          </span>
        </div>
      </div>
      <button
        onClick={signOut}
        className="button secondary"
        style={{ padding: "6px 10px", fontSize: 12 }}
        title={lang === "en" ? "Sign out" : ru.signOut}
      >
        {lang === "en" ? "Logout" : ru.signOut}
      </button>
    </div>
  );
}

"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useCallback, useState, Suspense } from "react";
import Link from "next/link";
import { normalizeAppLang, withLang, type AppLang } from "@/lib/app-i18n";
import { LanguageToggle } from "@/app/components/LanguageToggle";
import { ErrorBoundary } from "@/app/components/ErrorBoundary";
import { signInWithEmail, signInWithGoogle } from "@/lib/supabase-auth";

function LoginContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const lang = normalizeAppLang(searchParams.get("lang"));
  const roleParam = searchParams.get("role"); // "teacher" | "student" | null

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ui: Record<string, string> = {
    title: lang === "en" ? "Sign in" : "Вход",
    subtitle: lang === "en" ? "Welcome back to SelfReg AI" : "С возвращением в SelfReg AI",
    emailLabel: lang === "en" ? "Email" : "Email",
    emailPlaceholder: lang === "en" ? "you@example.com" : "you@example.com",
    passwordLabel: lang === "en" ? "Password" : "Пароль",
    passwordPlaceholder: lang === "en" ? "Enter your password" : "Введите пароль",
    submit: lang === "en" ? "Sign in" : "Войти",
    loading: lang === "en" ? "Signing in..." : "Вход...",
    google: lang === "en" ? "Sign in with Google" : "Войти через Google",
    noAccount: lang === "en" ? "Don't have an account?" : "Нет аккаунта?",
    register: lang === "en" ? "Create account" : "Создать аккаунт",
    or: lang === "en" ? "or" : "или",
    back: lang === "en" ? "Back to home" : "На главную",
    errorGeneric: lang === "en" ? "Authentication failed" : "Ошибка аутентификации",
  };

  const handleEmailLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const { error } = await signInWithEmail(email, password);
      if (error) throw error;
      // After successful login, redirect based on role
      // The middleware will handle the redirect based on session
      router.push(roleParam === "teacher" ? "/teacher" : roleParam === "student" ? "/student/dashboard" : "/");
      router.refresh();
    } catch (err: any) {
      setError(err.message || ui.errorGeneric);
    } finally {
      setIsLoading(false);
    }
  }, [email, password, roleParam, router, ui.errorGeneric]);

  const handleGoogleLogin = useCallback(async () => {
    setError(null);
    setIsLoading(true);

    try {
      const redirectTo = roleParam
        ? `${window.location.origin}/auth/callback?role=${roleParam}`
        : `${window.location.origin}/auth/callback`;
      await signInWithGoogle({ redirectTo });
    } catch (err: any) {
      setError(err.message || ui.errorGeneric);
      setIsLoading(false);
    }
  }, [roleParam, ui.errorGeneric]);

  return (
    <main className="shell">
      <div className="auth-header-row">
        <Link href="/" className="fs-14 c-muted no-underline">
          ← {ui.back}
        </Link>
        <LanguageToggle />
      </div>

      <div className="auth-container">
        <div className="panel auth-panel">
          <h1 className="m-0 mb-4 fs-24">{ui.title}</h1>
          <p className="muted m-0 mb-24 fs-14">{ui.subtitle}</p>

          {error && (
            <div className="error-box-sm">
              {error}
            </div>
          )}

          {/* Google Sign In */}
          <button
            onClick={handleGoogleLogin}
            className="button google-btn"
            disabled={isLoading}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            {ui.google}
          </button>

          <div className="divider">
            <div className="divider-line" />
            <span>{ui.or}</span>
            <div className="divider-line" />
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleEmailLogin}>
            <label className="field mb-16">
              {ui.emailLabel}
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={ui.emailPlaceholder}
                required
                disabled={isLoading}
              />
            </label>

            <label className="field mb-20">
              {ui.passwordLabel}
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={ui.passwordPlaceholder}
                minLength={6}
                required
                disabled={isLoading}
              />
            </label>

            <button
              type="submit"
              className="button w-full"
              disabled={isLoading}
              style={{ padding: "10px", fontSize: 14 }}
            >
              {isLoading ? ui.loading : ui.submit}
            </button>
          </form>

          <div className="auth-footer">
            <span className="muted">{ui.noAccount}</span>{" "}
            <Link
              href={withLang(`/auth/register${roleParam ? `?role=${roleParam}` : ""}`, lang)}
              className="c-accent underline"
            >
              {ui.register}
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <ErrorBoundary>
      <Suspense fallback={null}>
        <LoginContent />
      </Suspense>
    </ErrorBoundary>
  );
}
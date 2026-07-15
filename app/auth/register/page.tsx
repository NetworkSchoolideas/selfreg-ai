"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LanguageToggle } from "@/app/components/LanguageToggle";
import { ErrorBoundary } from "@/app/components/ErrorBoundary";
import { normalizeAppLang, withLang } from "@/lib/app-i18n";
import { isGoogleAuthEnabled, MIN_PASSWORD_LENGTH } from "@/lib/auth-config";
import { buildAuthCallbackUrl, signInWithGoogle, signUpWithEmail } from "@/lib/supabase-auth";

function RegisterContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const lang = normalizeAppLang(searchParams.get("lang"));
  const preselectedRole = searchParams.get("role");
  const googleAuthEnabled = isGoogleAuthEnabled();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [consentGiven, setConsentGiven] = useState(false);
  const [role, setRole] = useState<"teacher" | "student">(
    preselectedRole === "teacher" ? "teacher" : "student"
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (preselectedRole === "teacher") {
      router.replace(withLang("/teacher/register", lang));
    }
  }, [lang, preselectedRole, router]);

  const ui: Record<string, string> = {
    title: lang === "en" ? "Create account" : "Регистрация",
    subtitle: lang === "en" ? "Join SelfReg AI" : "Создайте аккаунт в SelfReg AI",
    emailLabel: "Email",
    emailPlaceholder: "you@example.com",
    passwordLabel: lang === "en" ? "Password" : "Пароль",
    passwordPlaceholder: lang === "en" ? "At least 8 characters" : "Минимум 8 символов",
    fullNameLabel: lang === "en" ? "Full name" : "ФИО",
    fullNamePlaceholder: lang === "en" ? "Ivan Ivanov" : "Иван Иванов",
    roleLabel: lang === "en" ? "I am a" : "Я",
    roleTeacher: lang === "en" ? "Teacher" : "Педагог",
    roleStudent: lang === "en" ? "Student" : "Ученик",
    submit: lang === "en" ? "Create account" : "Создать аккаунт",
    loading: lang === "en" ? "Creating account..." : "Создаем аккаунт...",
    google: lang === "en" ? "Sign up with Google" : "Зарегистрироваться через Google",
    hasAccount: lang === "en" ? "Already have an account?" : "Уже есть аккаунт?",
    login: lang === "en" ? "Sign in" : "Войти",
    or: lang === "en" ? "or" : "или",
    back: lang === "en" ? "Back to home" : "На главную",
    errorGeneric: lang === "en" ? "Registration failed" : "Не удалось создать аккаунт",
    successMessage:
      lang === "en"
        ? "Account created! Check your email for verification."
        : "Аккаунт создан. Проверьте почту, чтобы подтвердить email.",
    successSignedIn:
      lang === "en"
        ? "Account created. Redirecting..."
        : "Аккаунт создан. Выполняем вход...",
    consent: lang === "en"
      ? "I agree to the processing of my data for my SelfReg AI account and session history."
      : "Я соглашаюсь на обработку моих данных для аккаунта и истории сессий SelfReg AI.",
    consentRequired: lang === "en"
      ? "Confirm consent to create a student account."
      : "Подтвердите согласие, чтобы создать аккаунт ученика.",
  };

  const handleEmailRegister = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    if (role === "student" && !consentGiven) {
      setError(ui.consentRequired);
      return;
    }
    setIsLoading(true);

    try {
      const consentTimestamp = new Date().toISOString();
      const result = await signUpWithEmail(email, password, fullName || undefined, {
        role,
        metadata: role === "student"
          ? { consent_given: true, consent_timestamp: consentTimestamp }
          : undefined,
      });
      if (result.error) {
        throw result.error;
      }

      if (result.hasSession) {
        setSuccess(ui.successSignedIn);
        router.push(withLang(role === "teacher" ? "/teacher" : "/student/dashboard", lang));
        router.refresh();
        return;
      }

      setSuccess(ui.successMessage);

      setTimeout(() => {
        router.push(withLang(`/auth/login?role=${role}`, lang));
      }, 2000);
    } catch (err: any) {
      setError(err.message || ui.errorGeneric);
    } finally {
      setIsLoading(false);
    }
  }, [consentGiven, email, fullName, lang, password, role, router, ui.consentRequired, ui.errorGeneric, ui.successMessage, ui.successSignedIn]);

  const handleGoogleRegister = useCallback(async () => {
    setError(null);
    if (role === "student") {
      setError(ui.consentRequired);
      return;
    }
    setIsLoading(true);

    try {
      try {
        localStorage.setItem("selfreg_pending_role", role);
      } catch {}

      const redirectTo = buildAuthCallbackUrl({ role, lang });
      await signInWithGoogle({ redirectTo, role });
    } catch (err: any) {
      setError(err.message || ui.errorGeneric);
      setIsLoading(false);
    }
  }, [lang, role, ui.consentRequired, ui.errorGeneric]);

  return (
    <main className="shell">
      <div className="auth-header-row">
        <Link href={withLang("/", lang)} className="fs-14 c-muted no-underline">
          ← {ui.back}
        </Link>
        <LanguageToggle />
      </div>

      <div className="auth-container">
        <div className="panel auth-panel">
          <h1 className="m-0 mb-4 fs-24">{ui.title}</h1>
          <p className="muted m-0 mb-24 fs-14">{ui.subtitle}</p>

          {error && <div className="error-box-sm">{error}</div>}
          {success && <div className="success-box-sm">{success}</div>}

          {googleAuthEnabled && role === "teacher" && (
            <>
              <button
                onClick={handleGoogleRegister}
                className="button google-btn"
                disabled={isLoading || !!success}
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
            </>
          )}

          <form onSubmit={handleEmailRegister}>
            <label className="field mb-16">
              {ui.fullNameLabel}
              <input
                type="text"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder={ui.fullNamePlaceholder}
                disabled={isLoading || !!success}
              />
            </label>

            <label className="field mb-16">
              {ui.emailLabel}
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder={ui.emailPlaceholder}
                required
                disabled={isLoading || !!success}
              />
            </label>

            <label className="field mb-16">
              {ui.passwordLabel}
              <div className="password-input-row">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={ui.passwordPlaceholder}
                  minLength={MIN_PASSWORD_LENGTH}
                  required
                  disabled={isLoading || !!success}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((value) => !value)}
                  disabled={isLoading || !!success}
                  aria-label={
                    showPassword
                      ? lang === "en" ? "Hide password" : "Скрыть пароль"
                      : lang === "en" ? "Show password" : "Показать пароль"
                  }
                >
                  {showPassword ? (lang === "en" ? "Hide" : "Скрыть") : (lang === "en" ? "Show" : "Показать")}
                </button>
              </div>
            </label>

            <div className="mb-20">
              <label className="field" style={{ marginBottom: 8 }}>
                {ui.roleLabel}
              </label>
              <div className="role-toggle-group">
                <button
                  type="button"
                  onClick={() => setRole("teacher")}
                  disabled={isLoading || !!success}
                  className={role === "teacher" ? "button role-toggle-btn" : "button secondary role-toggle-btn"}
                >
                  {ui.roleTeacher}
                </button>
                <button
                  type="button"
                  onClick={() => setRole("student")}
                  disabled={isLoading || !!success}
                  className={role === "student" ? "button role-toggle-btn" : "button secondary role-toggle-btn"}
                >
                  {ui.roleStudent}
                </button>
              </div>
            </div>

            {role === "student" && (
              <label className="checkbox-field mb-20">
                <input
                  type="checkbox"
                  checked={consentGiven}
                  onChange={(event) => setConsentGiven(event.target.checked)}
                  disabled={isLoading || !!success}
                  required
                />
                <span>{ui.consent}</span>
              </label>
            )}

            <button
              type="submit"
              className="button w-full"
              disabled={isLoading || !!success || (role === "student" && !consentGiven)}
              style={{ padding: "10px", fontSize: 14 }}
            >
              {isLoading ? ui.loading : ui.submit}
            </button>
          </form>

          <div className="auth-footer">
            <span className="muted">{ui.hasAccount}</span>{" "}
            <Link href={withLang(`/auth/login?role=${role}`, lang)} className="c-accent underline">
              {ui.login}
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function RegisterPage() {
  return (
    <ErrorBoundary>
      <Suspense fallback={null}>
        <RegisterContent />
      </Suspense>
    </ErrorBoundary>
  );
}

"use client";

import Link from "next/link";
import { Suspense, useCallback, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ErrorBoundary } from "@/app/components/ErrorBoundary";
import { normalizeAppLang, withLang } from "@/lib/app-i18n";
import { isGoogleAuthEnabled, MIN_PASSWORD_LENGTH } from "@/lib/auth-config";
import { buildAuthCallbackUrl, signInWithGoogle, signUpWithEmail } from "@/lib/supabase-auth";

function TeacherRegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const lang = normalizeAppLang(searchParams.get("lang"));
  const googleAuthEnabled = isGoogleAuthEnabled();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [name, setName] = useState("");
  const [school, setSchool] = useState("");
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const texts = {
    ru: {
      title: "Регистрация педагога",
      subtitle: "Создайте аккаунт для доступа к аналитике и сессиям учеников",
      email: "Email",
      emailPlaceholder: "your@email.com",
      password: "Пароль",
      passwordPlaceholder: "Минимум 8 символов",
      confirmPassword: "Подтвердите пароль",
      name: "ФИО",
      namePlaceholder: "Иванов Иван Иванович",
      school: "Школа / организация",
      schoolPlaceholder: "Название школы",
      agree: "Я согласен с политикой обработки данных",
      register: "Создать аккаунт",
      haveAccount: "Уже есть учетная запись?",
      login: "Войти",
      back: "На главную",
      errorPasswordMismatch: "Пароли не совпадают",
      errorEmptyFields: "Заполните все обязательные поля",
      errorRegistration: "Ошибка регистрации",
      errorAgreement: "Пожалуйста, согласитесь с политикой обработки данных",
      creating: "Создаем учетную запись...",
    },
    en: {
      title: "Teacher registration",
      subtitle: "Create an account to access analytics and student sessions",
      email: "Email",
      emailPlaceholder: "your@email.com",
      password: "Password",
      passwordPlaceholder: "At least 8 characters",
      confirmPassword: "Confirm password",
      name: "Full name",
      namePlaceholder: "John Doe",
      school: "School / organization",
      schoolPlaceholder: "School name",
      agree: "I agree to the data processing policy",
      register: "Create account",
      haveAccount: "Already have an account?",
      login: "Sign in",
      back: "Back to home",
      errorPasswordMismatch: "Passwords do not match",
      errorEmptyFields: "Fill in all required fields",
      errorRegistration: "Registration failed",
      errorAgreement: "Please agree to the data processing policy",
      creating: "Creating account...",
    },
  };

  const t = texts[lang];

  const handleRegister = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!email || !password || !confirmPassword || !name || !school) {
      setError(t.errorEmptyFields);
      return;
    }

    if (password !== confirmPassword) {
      setError(t.errorPasswordMismatch);
      return;
    }

    if (!agreeToTerms) {
      setError(t.errorAgreement);
      return;
    }

    setIsLoading(true);

    try {
      const rawPrefix = name.trim().charAt(0).toUpperCase();
      const prefix = /^[A-Z]$/.test(rawPrefix) ? rawPrefix : "T";
      const teacherCode = `${prefix}${Date.now().toString().slice(-6)}`;
      const result = await signUpWithEmail(email, password, name, {
        role: "teacher",
        metadata: {
          school,
          teacher_code: teacherCode,
        },
        redirectTo: buildAuthCallbackUrl({ role: "teacher", lang }),
      });

      if (result.error) {
        throw result.error;
      }

      if (result.data?.user) {
        sessionStorage.setItem("teacher_code", teacherCode);
        sessionStorage.setItem("teacher_id", result.data.user.id);
        const query = result.hasSession
          ? `/teacher/register-success?teacherCode=${teacherCode}&next=dashboard`
          : `/teacher/register-success?teacherCode=${teacherCode}&next=login&pendingEmail=1`;
        router.push(withLang(query, lang));
      }
    } catch (err: any) {
      setError(err.message || t.errorRegistration);
    } finally {
      setIsLoading(false);
    }
  }, [agreeToTerms, confirmPassword, email, lang, name, password, router, school, t]);

  const handleGoogleRegister = useCallback(async () => {
    setError(null);
    setIsLoading(true);

    try {
      await signInWithGoogle({
        redirectTo: buildAuthCallbackUrl({ role: "teacher", lang }),
        role: "teacher",
      });
    } catch (err: any) {
      setError(err.message || t.errorRegistration);
      setIsLoading(false);
    }
  }, [lang, t.errorRegistration]);

  return (
    <div className="gradient-bg-teacher">
      <div className="absolute" style={{ top: 20, left: 20 }}>
        <Link href={withLang("/", lang)} className="back-link">
          ← {t.back}
        </Link>
      </div>

      <div className="white-card">
        <div className="text-center mb-32">
          <div className="fs-48 mb-16" aria-hidden="true">👩‍🏫</div>
          <h1 className="mt-0 mb-8 fs-28" style={{ color: "#1f2937" }}>
            {t.title}
          </h1>
          <p className="m-0 c-muted fs-14">{t.subtitle}</p>
        </div>

        {error && <div className="error-box">{error}</div>}

        {googleAuthEnabled && (
          <>
        <button
          type="button"
          onClick={handleGoogleRegister}
          className="button google-btn w-full"
          disabled={isLoading}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          {lang === "en" ? "Continue with Google" : "Продолжить через Google"}
        </button>

        <div className="divider">
          <div className="divider-line" />
          <span>{lang === "en" ? "or" : "или"}</span>
          <div className="divider-line" />
        </div>
          </>
        )}

        <form className="flex-col gap-16" onSubmit={handleRegister}>
          <div>
            <label className="form-label">{t.name} *</label>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t.namePlaceholder}
              required
              className="form-input"
            />
          </div>

          <div>
            <label className="form-label">{t.email} *</label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={t.emailPlaceholder}
              required
              className="form-input"
            />
          </div>

          <div>
            <label className="form-label">{t.school} *</label>
            <input
              type="text"
              value={school}
              onChange={(event) => setSchool(event.target.value)}
              placeholder={t.schoolPlaceholder}
              required
              className="form-input"
            />
          </div>

          <div>
            <label className="form-label">{t.password} *</label>
            <div className="password-input-row">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={t.passwordPlaceholder}
                required
                minLength={MIN_PASSWORD_LENGTH}
                className="form-input"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={
                  showPassword
                    ? lang === "en" ? "Hide password" : "Скрыть пароль"
                    : lang === "en" ? "Show password" : "Показать пароль"
                }
              >
                {showPassword ? (lang === "en" ? "Hide" : "Скрыть") : (lang === "en" ? "Show" : "Показать")}
              </button>
            </div>
          </div>

          <div>
            <label className="form-label">{t.confirmPassword} *</label>
            <div className="password-input-row">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder={t.passwordPlaceholder}
                required
                minLength={MIN_PASSWORD_LENGTH}
                className="form-input"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirmPassword((value) => !value)}
                aria-label={
                  showConfirmPassword
                    ? lang === "en" ? "Hide password" : "Скрыть пароль"
                    : lang === "en" ? "Show password" : "Показать пароль"
                }
              >
                {showConfirmPassword ? (lang === "en" ? "Hide" : "Скрыть") : (lang === "en" ? "Show" : "Показать")}
              </button>
            </div>
          </div>

          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={agreeToTerms}
              onChange={(event) => setAgreeToTerms(event.target.checked)}
              required
              style={{ marginTop: 2 }}
            />
            <span className="c-muted">{t.agree}</span>
          </label>

          <button
            type="submit"
            disabled={isLoading}
            className="submit-btn"
            style={{ background: isLoading ? "#9ca3af" : "#10b981" }}
          >
            {isLoading ? t.creating : t.register}
          </button>
        </form>

        <div className="auth-footer c-muted">
          {t.haveAccount}{" "}
          <Link href={withLang("/auth/login?role=teacher", lang)} className="no-underline fw-500" style={{ color: "#059669" }}>
            {t.login}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function TeacherRegisterPage() {
  return (
    <ErrorBoundary>
      <Suspense fallback={null}>
        <TeacherRegisterContent />
      </Suspense>
    </ErrorBoundary>
  );
}

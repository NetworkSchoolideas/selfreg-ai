"use client";

import Link from "next/link";
import { Suspense, useCallback, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ErrorBoundary } from "@/app/components/ErrorBoundary";
import { normalizeAppLang, withLang } from "@/lib/app-i18n";
import { signUpWithEmail } from "@/lib/supabase-auth";

function TeacherRegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const lang = normalizeAppLang(searchParams.get("lang"));

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
      const teacherCode = `${name.split(" ")[0]?.charAt(0).toUpperCase() || "T"}${Date.now().toString().slice(-6)}`;
      const result = await signUpWithEmail(email, password, name, {
        role: "teacher",
        metadata: {
          school,
          teacher_code: teacherCode,
        },
        redirectTo: `${window.location.origin}/auth/callback?role=teacher`,
      });

      if (result.error) {
        throw result.error;
      }

      if (result.data?.user) {
        sessionStorage.setItem("teacher_code", teacherCode);
        sessionStorage.setItem("teacher_id", result.data.user.id);
        router.push(withLang(`/teacher/register-success?teacherCode=${teacherCode}`, lang));
      }
    } catch (err: any) {
      setError(err.message || t.errorRegistration);
    } finally {
      setIsLoading(false);
    }
  }, [agreeToTerms, confirmPassword, email, lang, name, password, router, school, t]);

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
                required
                minLength={6}
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
                required
                minLength={6}
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

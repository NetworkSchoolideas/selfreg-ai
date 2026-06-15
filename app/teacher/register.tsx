"use client";

import { Suspense, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { signUpWithEmail } from "@/lib/supabase-auth";
import { supabase } from "@/lib/supabase";
import { ErrorBoundary } from "@/app/components/ErrorBoundary";
import type { AppLang } from "@/lib/app-i18n";

function TeacherRegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const lang = (searchParams.get("lang") === "en" ? "en" : "ru") as AppLang;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [school, setSchool] = useState("");
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const texts = {
    ru: {
      title: "Регистрация учителя",
      subtitle: "Создайте учётную запись для доступа к аналитике",
      email: "Email",
      emailPlaceholder: "your@email.com",
      password: "Пароль",
      confirmPassword: "Подтвердите пароль",
      name: "ФИО",
      namePlaceholder: "Иванов Иван Иванович",
      school: "Школа / Организация",
      schoolPlaceholder: "Название школы",
      agree: "Я согласен с политикой обработки данных",
      register: "Зарегистрироваться",
      haveAccount: "Уже есть учётная запись?",
      login: "Войти",
      back: "Назад",
      errorPasswordMismatch: "Пароли не совпадают",
      errorEmptyFields: "Заполните все обязательные поля",
      errorRegistration: "Ошибка регистрации",
      success: "Регистрация успешна! Перенаправление...",
    },
    en: {
      title: "Teacher Registration",
      subtitle: "Create an account to access analytics",
      email: "Email",
      emailPlaceholder: "your@email.com",
      password: "Password",
      confirmPassword: "Confirm password",
      name: "Full Name",
      namePlaceholder: "John Doe",
      school: "School / Organization",
      schoolPlaceholder: "School name",
      agree: "I agree to the data processing policy",
      register: "Register",
      haveAccount: "Already have an account?",
      login: "Login",
      back: "Back",
      errorPasswordMismatch: "Passwords do not match",
      errorEmptyFields: "Fill in all required fields",
      errorRegistration: "Registration error",
      success: "Registration successful! Redirecting...",
    },
  };

  const t = texts[lang];

  const handleRegister = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
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
      setError(lang === "en" ? "Please agree to the data processing policy" : "Пожалуйста, согласитесь с политикой обработки данных");
      return;
    }

    setIsLoading(true);

    try {
      // Sign up with email/password
      const result = await signUpWithEmail(email, password, name);

      if (result.error) throw result.error;

      if (result.data?.user) {
        // Generate teacher code
        const teacherCode = `${name.split(" ")[0]?.charAt(0).toUpperCase() || "T"}${Date.now().toString().slice(-6)}`;

        // Create profile with role and teacher code
        if (supabase) {
          const profileData: any = {
            id: result.data.user.id,
            email,
            role: "teacher",
            teacher_code: teacherCode,
            full_name: name,
            school: school,
            consent_given: true,
            consent_timestamp: new Date().toISOString(),
          };
          const { error: profileError } = await supabase
            .from("profiles")
            .upsert(profileData);

          if (profileError) throw profileError;
        }

        // Store teacher code temporarily
        sessionStorage.setItem("teacher_code", teacherCode);
        sessionStorage.setItem("teacher_id", result.data.user.id);

        // Redirect to success page
        router.push(`/teacher/register-success?lang=${lang}&teacherCode=${teacherCode}`);
      }
    } catch (err: any) {
      setError(err.message || t.errorRegistration);
      setIsLoading(false);
    }
  }, [email, password, confirmPassword, name, school, agreeToTerms, lang, router, t]);

  return (
    <div className="gradient-bg-teacher">
      <div className="absolute" style={{ top: 20, left: 20 }}>
        <Link href={`/?lang=${lang}`} className="back-link">
          ← {t.back}
        </Link>
      </div>

      <div className="white-card">
        <div className="text-center mb-32">
          <div className="fs-48 mb-16">👨‍🏫</div>
          <h1 className="mt-0 mb-8 fs-28" style={{ color: "#1f2937" }}>
            {t.title}
          </h1>
          <p className="m-0 c-muted fs-14">
            {t.subtitle}
          </p>
        </div>

        {error && (
          <div className="error-box">
            {error}
          </div>
        )}

        <form className="flex-col gap-16">
          <div>
            <label className="form-label">
              {t.name} *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.namePlaceholder}
              required
              className="form-input"
            />
          </div>

          <div>
            <label className="form-label">
              {t.email} *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t.emailPlaceholder}
              required
              className="form-input"
            />
          </div>

          <div>
            <label className="form-label">
              {t.school} *
            </label>
            <input
              type="text"
              value={school}
              onChange={(e) => setSchool(e.target.value)}
              placeholder={t.schoolPlaceholder}
              required
              className="form-input"
            />
          </div>

          <div>
            <label className="form-label">
              {t.password} *
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="form-input"
            />
          </div>

          <div>
            <label className="form-label">
              {t.confirmPassword} *
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              className="form-input"
            />
          </div>

          <label className="checkbox-field">
            <input type="checkbox" checked={agreeToTerms} onChange={(e) => setAgreeToTerms(e.target.checked)} required style={{ marginTop: 2 }} />
            <span className="c-muted">{t.agree}</span>
          </label>

          <button
            type="submit"
            disabled={isLoading}
            className="submit-btn"
            style={{ background: isLoading ? "#9ca3af" : "#10b981" }}
            onClick={handleRegister}
          >
            {isLoading ? (lang === "en" ? "Creating account..." : "Создание учётной записи...") : t.register}
          </button>
        </form>

        <div className="auth-footer c-muted">
          {t.haveAccount}{" "}
          <Link href={`/api/auth/callback?provider=login&lang=${lang}`} className="no-underline fw-500" style={{ color: "#059669" }}>
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

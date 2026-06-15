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
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
      padding: 20,
    }}>
      <div style={{ position: "absolute", top: 20, left: 20 }}>
        <Link
          href={`/?lang=${lang}`}
          style={{
            color: "white",
            textDecoration: "none",
            fontSize: 14,
            background: "rgba(255, 255, 255, 0.2)",
            padding: "8px 16px",
            borderRadius: 6,
          }}
        >
          ← {t.back}
        </Link>
      </div>

      <div style={{
        background: "white",
        borderRadius: 16,
        padding: 40,
        maxWidth: 500,
        width: "100%",
        boxShadow: "0 10px 40px rgba(0, 0, 0, 0.2)",
      }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>👨‍🏫</div>
          <h1 style={{ marginTop: 0, marginBottom: 8, fontSize: 28, color: "#1f2937" }}>
            {t.title}
          </h1>
          <p style={{ margin: 0, color: "#6b7280", fontSize: 14 }}>
            {t.subtitle}
          </p>
        </div>

        {error && (
          <div style={{
            background: "#fee2e2",
            border: "1px solid #ef4444",
            padding: 12,
            borderRadius: 8,
            marginBottom: 20,
            fontSize: 14,
            color: "#b91c1c",
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ display: "block", marginBottom: 6, fontWeight: 500, fontSize: 14, color: "#374151" }}>
              {t.name} *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.namePlaceholder}
              required
              style={{ width: "100%", padding: 12, borderRadius: 8, border: "1px solid #d1d5db", fontSize: 14, boxSizing: "border-box" }}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: 6, fontWeight: 500, fontSize: 14, color: "#374151" }}>
              {t.email} *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t.emailPlaceholder}
              required
              style={{ width: "100%", padding: 12, borderRadius: 8, border: "1px solid #d1d5db", fontSize: 14, boxSizing: "border-box" }}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: 6, fontWeight: 500, fontSize: 14, color: "#374151" }}>
              {t.school} *
            </label>
            <input
              type="text"
              value={school}
              onChange={(e) => setSchool(e.target.value)}
              placeholder={t.schoolPlaceholder}
              required
              style={{ width: "100%", padding: 12, borderRadius: 8, border: "1px solid #d1d5db", fontSize: 14, boxSizing: "border-box" }}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: 6, fontWeight: 500, fontSize: 14, color: "#374151" }}>
              {t.password} *
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              style={{ width: "100%", padding: 12, borderRadius: 8, border: "1px solid #d1d5db", fontSize: 14, boxSizing: "border-box" }}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: 6, fontWeight: 500, fontSize: 14, color: "#374151" }}>
              {t.confirmPassword} *
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              style={{ width: "100%", padding: 12, borderRadius: 8, border: "1px solid #d1d5db", fontSize: 14, boxSizing: "border-box" }}
            />
          </div>

          <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", fontSize: 13 }}>
            <input type="checkbox" checked={agreeToTerms} onChange={(e) => setAgreeToTerms(e.target.checked)} required style={{ marginTop: 2 }} />
            <span style={{ color: "#6b7280" }}>{t.agree}</span>
          </label>

          <button
            type="submit"
            disabled={isLoading}
            style={{
              padding: 14,
              borderRadius: 8,
              border: "none",
              background: isLoading ? "#9ca3af" : "#10b981",
              color: "white",
              fontSize: 16,
              fontWeight: 500,
              cursor: isLoading ? "not-allowed" : "pointer",
              marginTop: 8,
            }}
          >
            {isLoading ? (lang === "en" ? "Creating account..." : "Создание учётной записи...") : t.register}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: 20, fontSize: 14, color: "#6b7280" }}>
          {t.haveAccount}{" "}
          <Link href={`/api/auth/callback?provider=login&lang=${lang}`} style={{ color: "#059669", textDecoration: "none", fontWeight: 500 }}>
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
